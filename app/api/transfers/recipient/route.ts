import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "../../../prisma";

type PaystackResolveResponse = {
  status?: boolean;
  message?: string;
  data?: {
    account_number?: string;
    account_name?: string;
    bank_id?: number;
  };
};

type PaystackRecipientResponse = {
  status?: boolean;
  message?: string;
  data?: {
    recipient_code?: string;
    name?: string;
    currency?: string;
    details?: {
      account_number?: string;
      bank_code?: string;
      bank_name?: string;
      account_name?: string;
    };
  };
};

export async function POST(request: Request) {
  try {
    /*
     * 1. Require an authenticated AZA session.
     */
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get("aza_session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Please log in to continue.",
        },
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
      select: {
        userId: true,
        expiresAt: true,
      },
    });

    if (
      !session ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your session has expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    /*
 * Retrieve the AZA account belonging to the
 * authenticated user.
 */
const account = await prisma.account.findUnique({
  where: {
    userId: session.userId,
    },
  select: {
    id: true,
  },
});

if (!account) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Your AZA account could not be found.",
    },
    { status: 404 }
  );
}

    /*
     * 2. Check Paystack configuration.
     */
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error(
        "PAYSTACK_RECIPIENT_ERROR: Secret key is not configured."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The transfer service is temporarily unavailable.",
        },
        { status: 500 }
      );
    }

    /*
     * 3. Validate the submitted bank details.
     */
    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const accountNumber =
      typeof body.accountNumber === "string"
        ? body.accountNumber.trim()
        : "";

    const bankCode =
      typeof body.bankCode === "string"
        ? body.bankCode.trim()
        : "";

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid 10-digit Nigerian account number is required.",
        },
        { status: 400 }
      );
    }

    if (!/^[A-Za-z0-9_-]{2,20}$/.test(bankCode)) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid bank code is required.",
        },
        { status: 400 }
      );
    }

    /*
     * 4. Resolve the account through Paystack.
     *
     * Never trust the account name supplied by the browser.
     */
    const resolveUrl = new URL(
      "https://api.paystack.co/bank/resolve"
    );

    resolveUrl.searchParams.set(
      "account_number",
      accountNumber
    );

    resolveUrl.searchParams.set(
      "bank_code",
      bankCode
    );

    const resolveResponse = await fetch(
      resolveUrl.toString(),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        cache: "no-store",
      }
    );

    const resolved =
      (await resolveResponse
        .json()
        .catch(() => null)) as
        | PaystackResolveResponse
        | null;

    if (
      !resolveResponse.ok ||
      !resolved?.status ||
      !resolved.data
    ) {
      console.warn(
        "PAYSTACK_ACCOUNT_RESOLUTION_FAILED:",
        {
          httpStatus: resolveResponse.status,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify this bank account. Check the account number and bank, then try again.",
        },
        { status: 422 }
      );
    }

    const verifiedAccountName =
      typeof resolved.data.account_name === "string"
        ? resolved.data.account_name.trim()
        : "";

    const verifiedAccountNumber =
      typeof resolved.data.account_number === "string"
        ? resolved.data.account_number.trim()
        : "";

    if (
      !verifiedAccountName ||
      !/^\d{10}$/.test(verifiedAccountNumber) ||
      verifiedAccountNumber !== accountNumber
    ) {
      console.warn(
        "PAYSTACK_ACCOUNT_RESOLUTION_INVALID:",
        {
          accountNumberMatched:
            verifiedAccountNumber === accountNumber,
          accountNamePresent: Boolean(
            verifiedAccountName
          ),
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The bank account details could not be verified.",
        },
        { status: 422 }
      );
    }

    /*
     * 5. Create the Paystack recipient using the
     * account name returned by Paystack.
     */
    const recipientResponse = await fetch(
      "https://api.paystack.co/transferrecipient",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name: verifiedAccountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: "NGN",
        }),
        cache: "no-store",
      }
    );

    const recipientData =
      (await recipientResponse
        .json()
        .catch(() => null)) as
        | PaystackRecipientResponse
        | null;

    const recipientCode =
      typeof recipientData?.data?.recipient_code ===
      "string"
        ? recipientData.data.recipient_code
        : "";

    if (
      !recipientResponse.ok ||
      !recipientData?.status ||
      !recipientCode
    ) {
      /*
       * Do not log full provider responses because
       * they may contain sensitive bank information.
       */
      console.error(
        "PAYSTACK_CREATE_RECIPIENT_FAILED:",
        {
          httpStatus: recipientResponse.status,
          providerMessage:
            typeof recipientData?.message === "string"
              ? recipientData.message
              : "No provider message",
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to create the transfer recipient. Please try again.",
        },
        { status: 502 }
      );
    }

    /*
 * 6. Save the verified beneficiary against the
 * authenticated user's AZA account.
 */
const bankName =
  recipientData.data?.details?.bank_name ?? null;

const beneficiary = await prisma.beneficiary.upsert({
  where: {
    accountId_bankCode_accountNumber: {
      accountId: account.id,
      bankCode,
      accountNumber,
    },
  },
  create: {
    accountId: account.id,
    accountNumber,
    bankCode,
    bankName,
    accountName: verifiedAccountName,
    recipientCode,
    currency: "NGN",
    verifiedAt: new Date(),
  },
  update: {
    bankName,
    accountName: verifiedAccountName,
    recipientCode,
    currency: "NGN",
    verifiedAt: new Date(),
  },
});

/*
 * 7. Return the existing response structure so
 * the frontend does not need to be rewritten.
 */
return NextResponse.json({
  success: true,
  recipient: {
    recipientCode: beneficiary.recipientCode,
    name: beneficiary.accountName,
    accountNumber: beneficiary.accountNumber,
    bankCode: beneficiary.bankCode,
    bankName: beneficiary.bankName,
    currency: beneficiary.currency,
  },
});
  } catch (error) {
    console.error(
      "CREATE_TRANSFER_RECIPIENT_ERROR:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to create the transfer recipient. Please try again.",
      },
      { status: 500 }
    );
  }
}