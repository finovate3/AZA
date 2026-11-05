
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../../prisma";
import { reconcilePaystackTransfer } from "../../../../lib/paystack-transfer-reconciliation";

type RouteContext = {
  params: Promise<{ reference: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: "Payment service is not configured." },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // 1. AUTHENTICATE THE USER
    // --------------------------------------------------

    const cookieHeader = request.headers.get("cookie") ?? "";

    const sessionCookie = cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("aza_session="));

    const sessionToken = sessionCookie
      ? decodeURIComponent(
          sessionCookie.substring("aza_session=".length)
        )
      : null;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const session = await prisma.session.findUnique({
      where: {
        tokenHash,
      },
    });

    if (
      !session ||
      !session.userId ||
      session.expiresAt <= new Date()
    ) {
      return NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // 2. VALIDATE THE REFERENCE
    // --------------------------------------------------

    const { reference } = await context.params;

    if (
      !reference ||
      reference.length > 128 ||
      !/^[A-Za-z0-9._:-]+$/.test(reference)
    ) {
      return NextResponse.json(
        { error: "Invalid transfer reference." },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 3. CONFIRM OWNERSHIP IN AZA
    // --------------------------------------------------

    const azaTransaction = await prisma.transaction.findUnique({
      where: {
        reference,
      },
      include: {
        account: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (
      !azaTransaction ||
      azaTransaction.account.userId !== session.userId
    ) {
      return NextResponse.json(
        { error: "Transfer not found." },
        { status: 404 }
      );
    }

    if (azaTransaction.type !== "Sent") {
      return NextResponse.json(
        { error: "This reference is not an outgoing transfer." },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 4. VERIFY DIRECTLY WITH PAYSTACK
    // --------------------------------------------------

    let providerResponse: Response;

    try {
      providerResponse = await fetch(
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
    } catch {
      return NextResponse.json(
        {
          error: "Could not reach Paystack. Please try again.",
          azaStatus: azaTransaction.status,
        },
        { status: 503 }
      );
    }

    let providerResult: any;

    try {
      providerResult = await providerResponse.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid response from Paystack." },
        { status: 502 }
      );
    }

    if (!providerResponse.ok || providerResult?.status !== true) {
      return NextResponse.json(
        {
          error: "Paystack could not verify this transfer.",
          azaStatus: azaTransaction.status,
        },
        { status: 502 }
      );
    }

    const transfer = providerResult.data;

    if (!transfer || typeof transfer !== "object") {
      return NextResponse.json(
        { error: "Paystack returned invalid transfer details." },
        { status: 502 }
      );
    }

    // --------------------------------------------------
    // 5. VALIDATE THE PROVIDER'S TRANSFER DETAILS
    // --------------------------------------------------

    const providerReference = transfer.reference;
    const providerAmount = transfer.amount;
    const providerCurrency = transfer.currency;
    const providerStatus =
      typeof transfer.status === "string"
        ? transfer.status.trim().toLowerCase()
        : "";

    if (
      providerReference !== reference ||
      !Number.isSafeInteger(providerAmount) ||
      providerAmount <= 0 ||
      providerCurrency !== "NGN" ||
      !providerStatus
    ) {
      return NextResponse.json(
        {
          error: "Paystack transfer details are incomplete or invalid.",
          azaStatus: azaTransaction.status,
        },
        { status: 409 }
      );
    }

    const expectedAmountInKobo = Math.round(
      Number(azaTransaction.amount) * 100
    );

    if (
      !Number.isSafeInteger(expectedAmountInKobo) ||
      expectedAmountInKobo !== providerAmount ||
      azaTransaction.currency.toUpperCase() !== "NGN"
    ) {
      return NextResponse.json(
        {
          error: "Paystack and AZA transfer details do not match.",
          azaStatus: azaTransaction.status,
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // 6. MAP ONLY RECOGNIZED FINAL PROVIDER STATUSES
    // --------------------------------------------------

    let outcome:
      | "success"
      | "failed"
      | "reversed"
      | null = null;

    if (providerStatus === "success") {
      outcome = "success";
    } else if (providerStatus === "failed") {
      outcome = "failed";
    } else if (providerStatus === "reversed") {
      outcome = "reversed";
    }

    // Unknown or non-final statuses must never change
    // AZA balances or transaction records.
    if (!outcome) {
      return NextResponse.json({
        success: true,
        verified: true,
        reconciled: false,
        providerStatus,
        azaStatus: azaTransaction.status,
        message:
          "Paystack has not returned a recognized final transfer status. AZA has not changed the transaction.",
      });
    }

    // --------------------------------------------------
    // 7. RECONCILE THROUGH THE SHARED SETTLEMENT HELPER
    // --------------------------------------------------

    let reconciliation;

    try {
      reconciliation = await reconcilePaystackTransfer({
        reference,
        amountInKobo: providerAmount,
        currency: providerCurrency,
        outcome,
      });
    } catch {
      const latest = await prisma.transaction.findUnique({
        where: {
          reference,
        },
        select: {
          status: true,
        },
      });

      return NextResponse.json(
        {
          success: false,
          verified: true,
          reconciled: false,
          providerStatus,
          azaStatus: latest?.status ?? azaTransaction.status,
          error:
            "Paystack verified the transfer, but AZA could not safely reconcile it. Manual reconciliation may be required.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // 8. READ THE FINAL AZA DATABASE STATUS
    // --------------------------------------------------

    const latestTransaction = await prisma.transaction.findUnique({
      where: {
        reference,
      },
      select: {
        status: true,
        amount: true,
        currency: true,
        lockedSavingsContribution: true,
      },
    });

    if (!latestTransaction) {
      return NextResponse.json(
        { error: "Transfer record could not be reloaded." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      reconciled: true,
      reference,
      providerStatus,
      azaStatus: latestTransaction.status,
      amount: latestTransaction.amount.toString(),
      currency: latestTransaction.currency,
      lockedSavingsContribution:
        latestTransaction.lockedSavingsContribution.toString(),
      alreadyProcessed: reconciliation.alreadyProcessed,
    });
  } catch (error) {
    console.error("Transfer verification error:", error);

    return NextResponse.json(
      { error: "Unable to verify this transfer right now." },
      { status: 500 }
    );
  }
}
