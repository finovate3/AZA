import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../prisma";

export async function POST(request: Request) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Paystack secret key is not configured.",
        },
        { status: 500 }
      );
    }

    // Authenticate the AZA user.
    const cookieHeader =
      request.headers.get("cookie") || "";

    const sessionToken = cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) =>
        cookie.startsWith("aza_session=")
      )
      ?.split("=")
      .slice(1)
      .join("=");

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
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
      include: {
        user: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const account = session.user.account;

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: "AZA account not found.",
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    const bankCode = String(
      body.bankCode || ""
    ).trim();

    const accountNumber = String(
      body.accountNumber || ""
    ).trim();

    if (!bankCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Bank code is required.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Enter a valid 10-digit Nigerian account number.",
        },
        { status: 400 }
      );
    }

    /*
     * First check AZA's own beneficiary records.
     *
     * If this account was already successfully verified,
     * do not call Paystack again.
     */
    const existingBeneficiary =
      await prisma.beneficiary.findUnique({
        where: {
          accountId_bankCode_accountNumber: {
            accountId: account.id,
            bankCode,
            accountNumber,
          },
        },
      });

    if (existingBeneficiary) {
      return NextResponse.json({
        success: true,
        cached: true,
        beneficiary: {
          accountNumber:
            existingBeneficiary.accountNumber,
          accountName:
            existingBeneficiary.accountName,
          bankCode:
            existingBeneficiary.bankCode,
          bankName:
            existingBeneficiary.bankName,
          recipientCode:
            existingBeneficiary.recipientCode,
          currency:
            existingBeneficiary.currency,
          verifiedAt:
            existingBeneficiary.verifiedAt,
        },
      });
    }

    /*
     * No cached beneficiary exists.
     * Ask Paystack to resolve the account.
     */
    const params = new URLSearchParams({
      account_number: accountNumber,
      bank_code: bankCode,
    });

    const response = await fetch(
      `https://api.paystack.co/bank/resolve?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (response.status === 429) {
      const resetSeconds =
        response.headers.get(
          "x-ratelimit-reset"
        );

      return NextResponse.json(
        {
          success: false,
          error:
            "Account verification is temporarily unavailable. Please try again shortly.",
          code: "PAYSTACK_RATE_LIMITED",
          retryAfterSeconds: resetSeconds
            ? Number(resetSeconds)
            : null,
        },
        { status: 429 }
      );
    }

    if (!response.ok || !data.status) {
      console.error(
        "PAYSTACK_ACCOUNT_RESOLUTION_ERROR:",
        data
      );

      return NextResponse.json(
        {
          success: false,
          error:
            data.message ||
            "Unable to verify this bank account.",
        },
        { status: response.status || 400 }
      );
    }

    const accountName =
      String(data.data.account_name || "").trim();

    if (!accountName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack did not return a verified account name.",
        },
        { status: 400 }
      );
    }

    /*
     * Save the successful verification in AZA.
     *
     * We intentionally do not create the Paystack
     * transfer recipient here. Recipient creation
     * remains a separate step after the user confirms
     * the beneficiary.
     */
    const beneficiary =
      await prisma.beneficiary.upsert({
        where: {
          accountId_bankCode_accountNumber: {
            accountId: account.id,
            bankCode,
            accountNumber,
          },
        },
        update: {
          accountName,
          verifiedAt: new Date(),
        },
        create: {
          accountId: account.id,
          accountNumber,
          bankCode,
          accountName,
          verifiedAt: new Date(),
          currency: "NGN",
        },
      });

    return NextResponse.json({
      success: true,
      cached: false,
      beneficiary: {
        accountNumber:
          beneficiary.accountNumber,
        accountName:
          beneficiary.accountName,
        bankCode:
          beneficiary.bankCode,
        bankName:
          beneficiary.bankName,
        recipientCode:
          beneficiary.recipientCode,
        currency:
          beneficiary.currency,
        verifiedAt:
          beneficiary.verifiedAt,
      },
    });
  } catch (error) {
    console.error(
      "BENEFICIARY_RESOLUTION_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify bank account.",
      },
      { status: 500 }
    );
  }
}