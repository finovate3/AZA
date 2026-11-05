
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../prisma";
import {
  reconcilePaystackTransfer,
  type PaystackTransferOutcome,
} from "../../../lib/paystack-transfer-reconciliation";

type PaystackTransferData = {
  reference?: unknown;
  amount?: unknown;
  currency?: unknown;
  status?: unknown;
  id?: unknown;
};

type PaystackVerifyResponse = {
  status?: unknown;
  message?: unknown;
  data?: PaystackTransferData;
};

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown): number | null {
  if (
    typeof value !== "number" &&
    typeof value !== "string"
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

// Verify the transfer directly with Paystack.
// Webhook event names alone are not authoritative.
async function verifyPaystackTransfer(
  reference: string,
  secretKey: string
): Promise<PaystackTransferData> {
  const response = await fetch(
    `https://api.paystack.co/transfer/verify/${encodeURIComponent(
      reference
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }
  );

  let result: PaystackVerifyResponse;

  try {
    result = (await response.json()) as PaystackVerifyResponse;
  } catch {
    throw new Error(
      "Paystack returned an invalid verification response."
    );
  }

  if (!response.ok || result.status !== true || !result.data) {
    console.error(
      "PAYSTACK_TRANSFER_VERIFY_ERROR:",
      {
        reference,
        httpStatus: response.status,
        message: result.message,
      }
    );

    throw new Error(
      "Unable to independently verify transfer with Paystack."
    );
  }

  return result.data;
}

function mapVerifiedStatus(
  status: string
): PaystackTransferOutcome | null {
  switch (status.toLowerCase()) {
    case "success":
      return "success";

    case "failed":
      return "failed";

    case "reversed":
      return "reversed";

    default:
      return null;
  }
}

export async function POST(request: Request) {
  try {
    // --------------------------------------------------
    // 1. CHECK PAYSTACK CONFIGURATION
    // --------------------------------------------------

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error(
        "PAYSTACK_WEBHOOK_ERROR: PAYSTACK_SECRET_KEY is not configured."
      );

      return NextResponse.json(
        {
          success: false,
          error: "Webhook is not configured.",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // 2. READ THE ORIGINAL REQUEST BODY
    // --------------------------------------------------

    const rawBody = await request.text();

    if (!rawBody) {
      return NextResponse.json(
        {
          success: false,
          error: "Empty webhook payload.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 3. VERIFY PAYSTACK SIGNATURE
    // --------------------------------------------------

    const signature = request.headers.get(
      "x-paystack-signature"
    );

    if (
      !signature ||
      !/^[a-fA-F0-9]{128}$/.test(signature)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid Paystack signature.",
        },
        { status: 401 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha512", secretKey)
      .update(rawBody)
      .digest("hex");

    const receivedBuffer = Buffer.from(
      signature,
      "hex"
    );

    const expectedBuffer = Buffer.from(
      expectedSignature,
      "hex"
    );

    const signaturesMatch =
      receivedBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      );

    if (!signaturesMatch) {
      console.error(
        "PAYSTACK_WEBHOOK_ERROR: Invalid signature."
      );

      return NextResponse.json(
        {
          success: false,
          error: "Invalid Paystack signature.",
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // 4. PARSE VERIFIED WEBHOOK PAYLOAD
    // --------------------------------------------------

    let event: {
      event?: unknown;
      data?: PaystackTransferData;
    };

    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid webhook payload.",
        },
        { status: 400 }
      );
    }

    const eventName = getString(event.event);

    console.log(
      "PAYSTACK_WEBHOOK_RECEIVED:",
      eventName
    );

    // --------------------------------------------------
    // 5. IGNORE EVENTS THIS ROUTE DOES NOT HANDLE
    // --------------------------------------------------

    const supportedEvents = [
      "transfer.success",
      "transfer.failed",
      "transfer.reversed",
    ];

    if (!supportedEvents.includes(eventName)) {
      return NextResponse.json({
        success: true,
        received: true,
        handled: false,
      });
    }

    // --------------------------------------------------
    // 6. VALIDATE WEBHOOK TRANSFER DATA
    // --------------------------------------------------

    const transfer = event.data;

    if (!transfer) {
      return NextResponse.json(
        {
          success: false,
          error: "Transfer data is missing.",
        },
        { status: 400 }
      );
    }

    const reference = getString(transfer.reference);
    const eventAmount = getNumber(transfer.amount);

    const eventCurrency = getString(
      transfer.currency
    ).toUpperCase();

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Transfer reference is required.",
        },
        { status: 400 }
      );
    }

    if (
      eventAmount === null ||
      !Number.isSafeInteger(eventAmount) ||
      eventAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid transfer amount.",
        },
        { status: 400 }
      );
    }

    if (eventCurrency !== "NGN") {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported transfer currency.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 7. FIND THE MATCHING AZA TRANSACTION
    // --------------------------------------------------

    const transaction =
      await prisma.transaction.findUnique({
        where: {
          reference,
        },
      });

    if (!transaction) {
      console.error(
        "PAYSTACK_WEBHOOK_ERROR: AZA transaction not found.",
        { reference }
      );

      return NextResponse.json(
        {
          success: false,
          error: "AZA transfer transaction not found.",
        },
        { status: 404 }
      );
    }

    if (transaction.type !== "Sent") {
      return NextResponse.json(
        {
          success: false,
          error: "This reference is not an outgoing transfer.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 8. VERIFY WEBHOOK AMOUNT AND CURRENCY AGAINST AZA
    // --------------------------------------------------

    const azaAmountInKobo = Math.round(
      Number(transaction.amount) * 100
    );

    if (
      !Number.isSafeInteger(azaAmountInKobo) ||
      azaAmountInKobo !== eventAmount
    ) {
      console.error(
        "PAYSTACK_WEBHOOK_ERROR: Amount mismatch.",
        {
          reference,
          azaAmountInKobo,
          eventAmount,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Transfer amount does not match AZA transaction.",
        },
        { status: 409 }
      );
    }

    if (
      transaction.currency.toUpperCase() !== eventCurrency
    ) {
      console.error(
        "PAYSTACK_WEBHOOK_ERROR: Currency mismatch.",
        {
          reference,
          azaCurrency: transaction.currency,
          eventCurrency,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Transfer currency does not match AZA transaction.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // 9. INDEPENDENTLY VERIFY TRANSFER WITH PAYSTACK
    // --------------------------------------------------

    const verifiedTransfer =
      await verifyPaystackTransfer(
        reference,
        secretKey
      );

    const verifiedReference = getString(
      verifiedTransfer.reference
    );

    const verifiedAmount = getNumber(
      verifiedTransfer.amount
    );

    const verifiedCurrency = getString(
      verifiedTransfer.currency
    ).toUpperCase();

    const verifiedStatus = getString(
      verifiedTransfer.status
    );

    if (
      verifiedReference !== reference ||
      verifiedAmount === null ||
      !Number.isSafeInteger(verifiedAmount) ||
      verifiedAmount !== azaAmountInKobo ||
      verifiedCurrency !== "NGN"
    ) {
      console.error(
        "PAYSTACK_WEBHOOK_ERROR: Independent verification mismatch.",
        {
          reference,
          verifiedReference,
          verifiedAmount,
          verifiedCurrency,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack verification details do not match AZA.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // 10. USE PAYSTACK'S VERIFIED STATUS
    // --------------------------------------------------

    const outcome = mapVerifiedStatus(
      verifiedStatus
    );

    if (!outcome) {
      console.warn(
        "PAYSTACK_TRANSFER_NOT_FINAL:",
        {
          reference,
          eventName,
          verifiedStatus,
        }
      );

      // Do not mark a pending/processing transfer as failed.
      // Return an error so the webhook can be retried later.
      return NextResponse.json(
        {
          success: false,
          received: true,
          error:
            "Paystack transfer has not reached a final status.",
          verifiedStatus,
        },
        { status: 503 }
      );
    }

    // The verified Paystack status is authoritative.
    // For example, a delayed transfer.failed webhook can
    // still settle successfully if Paystack now reports success.

    console.log(
      "PAYSTACK_TRANSFER_VERIFIED:",
      {
        reference,
        eventName,
        verifiedStatus,
        outcome,
      }
    );

    // --------------------------------------------------
    // 11. RECONCILE THROUGH THE CENTRAL SERVICE
    // --------------------------------------------------

    const result = await reconcilePaystackTransfer({
      reference,
      amountInKobo: verifiedAmount,
      currency: verifiedCurrency,
      outcome,
    });

    console.log(
      "PAYSTACK_TRANSFER_RECONCILIATION:",
      {
        reference,
        event: eventName,
        verifiedStatus,
        status: result.status,
        alreadyProcessed: result.alreadyProcessed,
      }
    );

    // --------------------------------------------------
    // 12. ACKNOWLEDGE SUCCESSFUL PROCESSING
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      received: true,
      handled: true,
      event: eventName,
      reference,
      verifiedStatus,
      status: result.status,
      alreadyProcessed: result.alreadyProcessed,
    });

  } catch (error) {
    console.error(
      "PAYSTACK_WEBHOOK_ROUTE_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to process Paystack webhook.",
      },
      { status: 500 }
    );
  }
}
