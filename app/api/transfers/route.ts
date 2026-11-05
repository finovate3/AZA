import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../prisma";
import { assessTransferRisk } from "../../lib/risk";

function generateTransferReference() {
  return `aza-${crypto.randomUUID().replace(/-/g, "").toLowerCase()}`;
}

function errorResponse(error: string, status: number) {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return errorResponse(
        "Paystack secret key is not configured.",
        500
      );
    }

    // 1. Authenticate the AZA user.
    const cookieHeader = request.headers.get("cookie") || "";

    const sessionToken = cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("aza_session="))
      ?.split("=")
      .slice(1)
      .join("=");

    if (!sessionToken) {
      return errorResponse("Unauthorized.", 401);
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      return errorResponse("Unauthorized.", 401);
    }

    const account = session.user.account;

    if (!account) {
      return errorResponse("AZA account not found.", 404);
    }

    // 2. Validate the request body.
    let body: Record<string, unknown>;

    try {
      const parsed = await request.json();

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return errorResponse("Invalid request body.", 400);
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return errorResponse("Invalid JSON request body.", 400);
    }

    const recipientCode =
      typeof body.recipientCode === "string"
        ? body.recipientCode.trim()
        : "";

    const rawAmount =
  typeof body.amount === "number" ||
  typeof body.amount === "string"
    ? String(body.amount).trim()
    : "";

if (!/^\d+(\.\d{1,2})?$/.test(rawAmount)) {
  return errorResponse(
    "Enter a valid transfer amount with no more than two decimal places.",
    400
  );
}

const amount = Number(rawAmount);

    const reasonWasProvided =
      typeof body.reason === "string" &&
      body.reason.trim().length > 0;

    const requestedReason = reasonWasProvided
      ? (body.reason as string).trim()
      : null;

    const requestedReference =
      typeof body.reference === "string"
        ? body.reference.trim()
        : "";

    if (!recipientCode) {
      return errorResponse(
        "Transfer recipient is required.",
        400
      );
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isInteger(amount * 100)
    ) {
      return errorResponse(
        "Enter a valid transfer amount with no more than two decimal places.",
        400
      );
    }

    const amountInKobo = Math.round(amount * 100);

    if (!Number.isSafeInteger(amountInKobo)) {
      return errorResponse(
        "Transfer amount is outside the supported range.",
        400
      );
    }

    if (
      requestedReference &&
      (
        requestedReference.length > 100 ||
        !/^[a-zA-Z0-9_-]+$/.test(requestedReference)
      )
    ) {
      return errorResponse(
        "Invalid transfer reference.",
        400
      );
    }

    if (
      requestedReason &&
      requestedReason.length > 100
    ) {
      return errorResponse(
        "Transfer reason is too long.",
        400
      );
    }

    const reference =
      requestedReference || generateTransferReference();

    // 3. Check for an existing reference before looking up
    // the beneficiary. A retry must be tied to its original
    // transaction snapshot, not silently redirected.
    const existingBeforeReservation =
      await prisma.transaction.findUnique({
        where: { reference },
      });

    if (
      existingBeforeReservation &&
      (
        existingBeforeReservation.accountId !== account.id ||
        existingBeforeReservation.type !== "Sent"
      )
    ) {
      return errorResponse(
        "Invalid transfer reference.",
        409
      );
    }

    if (
      existingBeforeReservation &&
      ["COMPLETED", "FAILED", "REVERSED"].includes(
        existingBeforeReservation.status
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This transfer reference has already reached a final state.",
          reference,
          status: existingBeforeReservation.status,
        },
        { status: 409 }
      );
    }

    // 4. Verify that the beneficiary belongs to this account.
    // The saved beneficiary is used only to validate a new
    // transfer or confirm that a retry matches its snapshot.
    const beneficiary = await prisma.beneficiary.findFirst({
      where: {
        accountId: account.id,
        recipientCode,
      },
    });

    if (!beneficiary) {
      return errorResponse(
        "This recipient is not saved to your AZA account. Verify and save the beneficiary before transferring.",
        403
      );
    }

    const recipientName = beneficiary.accountName;

    // 5. Atomically reserve the transfer.
    // The Account row lock prevents concurrent transfers
    // from spending the same available balance.
    const reservation = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id"
        FROM "Account"
        WHERE "id" = ${account.id}
        FOR UPDATE
      `;

      const existing = await tx.transaction.findUnique({
        where: { reference },
      });

      if (existing) {
        if (
          existing.accountId !== account.id ||
          existing.type !== "Sent"
        ) {
          throw new Error("INVALID_TRANSFER_REFERENCE");
        }

        if (
          ["COMPLETED", "FAILED", "REVERSED"].includes(
            existing.status
          )
        ) {
          throw new Error("TRANSFER_REFERENCE_FINAL");
        }

        // Every retry must match the original transaction.
        if (
          Number(existing.amount) !== amount ||
          existing.currency !== "NGN" ||
          existing.recipientCode !== recipientCode ||
          existing.recipient !== recipientName ||
          existing.bankCode !== beneficiary.bankCode ||
          existing.accountNumber !== beneficiary.accountNumber ||
          (
            requestedReason !== null &&
            existing.description !== requestedReason
          )
        ) {
          throw new Error("TRANSFER_DETAILS_MISMATCH");
        }

        return {
          transaction: existing,
          created: false,
          availableBalance: null as number | null,
        };
      }

      const pendingTransactions =
        await tx.transaction.aggregate({
          where: {
            accountId: account.id,
            status: "PENDING",
            type: "Sent",
          },
          _sum: {
            amount: true,
          },
        });

      const freshAccount = await tx.account.findUnique({
        where: { id: account.id },
        select: { balance: true },
      });

      if (!freshAccount) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      const currentBalance = Number(freshAccount.balance);
      const pendingAmount = Number(
        pendingTransactions._sum.amount ?? 0
      );

      const availableBalance =
        currentBalance - pendingAmount;

      if (
        !Number.isFinite(availableBalance) ||
        amount > availableBalance
      ) {
        throw new Error("INSUFFICIENT_AVAILABLE_BALANCE");
      }

      const createdTransaction =
        await tx.transaction.create({
          data: {
            accountId: account.id,
            type: "Sent",
            amount,
            currency: "NGN",
            status: "PENDING",
            pinChallengeExpiresAt: new Date(
              Date.now() + 5 * 60 * 1000
            ),
            description: requestedReason || "AZA transfer",
            recipient: recipientName,
            recipientCode,
            bankCode: beneficiary.bankCode,
            accountNumber: beneficiary.accountNumber,
            reference,
          },
        });

      return {
        transaction: createdTransaction,
        created: true,
        availableBalance,
      };
    });

    const transaction = reservation.transaction;

    // 6. Confirm the stored transaction amount is safe to send.
    const storedAmount = Number(transaction.amount);
    const storedAmountInKobo = Math.round(storedAmount * 100);

    if (
      !Number.isFinite(storedAmount) ||
      !Number.isSafeInteger(storedAmountInKobo) ||
      storedAmountInKobo <= 0 ||
      storedAmountInKobo !== amountInKobo
    ) {
      return errorResponse(
        "The stored transfer amount is invalid. Reconciliation is required.",
        409
      );
    }

    // 7. An already-claimed transaction must never be submitted
    // again automatically. A previous request may have reached
    // Paystack even if AZA did not receive its response.
    if (transaction.transferInitiationClaimedAt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This transfer has already been submitted for processing or may have reached Paystack. Do not submit it again.",
          reference,
          status: transaction.status,
          requiresReconciliation: true,
        },
        { status: 409 }
      );
    }

    if (transaction.status !== "PENDING") {
      return errorResponse(
        "This transfer is no longer pending.",
        409
      );
    }

    // 8. Calculate risk only once, when the transaction is created.
    // Retries use the risk decision already stored in PostgreSQL.
    if (reservation.created) {
      const recentTransactions =
        await prisma.transaction.findMany({
          where: {
            accountId: account.id,
            id: { not: transaction.id },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 100,
        });

      const riskResult = assessTransferRisk(
        {
          amount: storedAmount,
          type: transaction.type,
          status: transaction.status,
          recipient: transaction.recipient,
          createdAt: transaction.createdAt,
        },
        recentTransactions.map((item) => ({
          amount: Number(item.amount),
          type: item.type,
          status: item.status,
          recipient: item.recipient,
          createdAt: item.createdAt,
        })),
        reservation.availableBalance ?? 0
      );

      const reviewStatus =
        riskResult.assessment.action === "HOLD"
          ? "PENDING"
          : "NOT_REQUIRED";

      const riskUpdate =
        await prisma.transaction.updateMany({
          where: {
            id: transaction.id,
            accountId: account.id,
            status: "PENDING",
            transferInitiationClaimedAt: null,
          },
          data: {
            riskLevel: riskResult.assessment.level,
            reviewStatus,
          },
        });

      if (riskUpdate.count !== 1) {
        return errorResponse(
          "The transfer changed while its security checks were running. Please review its current status.",
          409
        );
      }

      console.log("AZA_TRANSFER_RISK_ASSESSMENT:", {
        reference,
        level: riskResult.assessment.level,
        action: riskResult.assessment.action,
        score: riskResult.assessment.score,
        signals: riskResult.assessment.signals,
      });
    }

    // Always reload the persisted risk and authorization state.
    const currentTransaction =
      await prisma.transaction.findFirst({
        where: {
          id: transaction.id,
          accountId: account.id,
          type: "Sent",
        },
      });

    if (!currentTransaction) {
      return errorResponse(
        "Transfer record could not be found.",
        404
      );
    }

    if (
      currentTransaction.status !== "PENDING" ||
      currentTransaction.transferInitiationClaimedAt
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This transfer is no longer eligible for initiation. Reconciliation may be required.",
          reference,
          status: currentTransaction.status,
          requiresReconciliation:
            currentTransaction.status === "PENDING",
        },
        { status: 409 }
      );
    }

    // 9. Fail closed if risk has not been recorded.
    if (!currentTransaction.riskLevel) {
      return errorResponse(
        "The transfer security assessment is incomplete. Please contact AZA support.",
        409
      );
    }

    if (
      currentTransaction.riskLevel === "HIGH" ||
      currentTransaction.reviewStatus === "PENDING"
    ) {
      return NextResponse.json(
        {
          success: true,
          requiresReview: true,
          requiresPin: false,
          reference,
          message:
            "This transfer is held for additional security review. It has not been sent to Paystack.",
          transaction: {
            id: currentTransaction.id,
            reference,
            status: currentTransaction.status,
            riskLevel: currentTransaction.riskLevel,
            reviewStatus: currentTransaction.reviewStatus,
          },
        }
      );
    }

    // 10. Every transfer requires a valid PIN authorization.
    const now = new Date();

    if (
      !currentTransaction.pinChallengeExpiresAt ||
      currentTransaction.pinChallengeExpiresAt <= now
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This transfer's authorization window has expired. It cannot be initiated. Please contact AZA support.",
          reference,
          status: currentTransaction.status,
          requiresReconciliation: false,
        },
        { status: 409 }
      );
    }

    if (!currentTransaction.pinVerifiedAt) {
      return NextResponse.json({
        success: true,
        requiresPin: true,
        requiresStepUp:
          currentTransaction.riskLevel === "MEDIUM",
        reference,
        message:
          "Enter your transaction PIN to authorize this transfer.",
        transaction: {
          id: currentTransaction.id,
          reference,
          status: currentTransaction.status,
          amount: storedAmount,
          currency: currentTransaction.currency,
          recipient: currentTransaction.recipient,
          riskLevel: currentTransaction.riskLevel,
        },
      });
    }

    // 11. Atomically claim the transfer.
    // The PIN must still be valid at the exact moment of claiming.
    // Only a transaction that has not been claimed can win.
    const initiationClaim =
      await prisma.transaction.updateMany({
        where: {
          id: currentTransaction.id,
          accountId: account.id,
          type: "Sent",
          status: "PENDING",
          riskLevel: {
            in: ["LOW", "MEDIUM"],
          },
          reviewStatus: "NOT_REQUIRED",
          pinVerifiedAt: {
            not: null,
          },
          pinChallengeExpiresAt: {
            gt: now,
          },
          transferInitiationClaimedAt: null,
        },
        data: {
          transferInitiationClaimedAt: now,
        },
      });

    if (initiationClaim.count !== 1) {
      const latestTransaction =
        await prisma.transaction.findUnique({
          where: { id: currentTransaction.id },
        });

      return NextResponse.json(
        {
          success: false,
          error:
            "This transfer could not be claimed. It may have expired, changed status, or already been claimed. Do not submit it again.",
          reference,
          status: latestTransaction?.status ?? "UNKNOWN",
          requiresReconciliation:
            latestTransaction?.status === "PENDING" &&
            latestTransaction?.transferInitiationClaimedAt !== null,
        },
        { status: 409 }
      );
    }

    // 12. Submit the immutable transaction snapshot to Paystack.
    // Never use browser-supplied recipient or reason values here.
    let response: Response;

    try {
      response = await fetch(
        "https://api.paystack.co/transfer",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "balance",
            amount: storedAmountInKobo,
            recipient: currentTransaction.recipientCode,
            reason: currentTransaction.description,
            currency: currentTransaction.currency,
            reference: currentTransaction.reference,
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(20000),
        }
      );
    } catch (providerError) {
      console.error("PAYSTACK_TRANSFER_NETWORK_ERROR:", {
        reference,
        message:
          providerError instanceof Error
            ? providerError.message
            : "Unknown network error",
      });

      // Do not release the reservation or clear the claim.
      // The request may have reached Paystack before the
      // connection failed.
      return NextResponse.json(
        {
          success: false,
          error:
            "AZA could not confirm Paystack's response. The transfer remains reserved and requires reconciliation. Do not submit it again.",
          reference,
          transactionId: currentTransaction.id,
          status: "PENDING",
          requiresReconciliation: true,
        },
        { status: 502 }
      );
    }

    let data: {
      status?: boolean;
      message?: string;
      data?: {
        id?: number | string;
        reference?: string;
        transfer_code?: string;
        status?: string;
        currency?: string;
      };
    };

    try {
      data = await response.json();
    } catch {
      // A malformed or empty response is ambiguous.
      // Keep the claim and reservation intact.
      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack returned an unreadable response. The transfer requires reconciliation. Do not submit it again.",
          reference,
          transactionId: currentTransaction.id,
          status: "PENDING",
          requiresReconciliation: true,
        },
        { status: 502 }
      );
    }

    if (!response.ok || data.status !== true) {
      console.error("PAYSTACK_TRANSFER_ERROR:", {
        reference,
        httpStatus: response.status,
        message:
          typeof data.message === "string"
            ? data.message
            : "Paystack returned an unsuccessful response.",
      });

      // Do not assume that an unsuccessful HTTP response
      // means the provider did not create the transfer.
      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack did not confirm the transfer initiation. The transfer remains reserved pending reconciliation. Do not submit it again.",
          reference,
          transactionId: currentTransaction.id,
          status: "PENDING",
          requiresReconciliation: true,
        },
        { status: 502 }
      );
    }

    const transfer = data.data;

    // AZA remains PENDING until verified reconciliation.
    return NextResponse.json({
      success: true,
      message:
        data.message || "Transfer submitted to Paystack.",
      transaction: {
        id: currentTransaction.id,
        reference: currentTransaction.reference,
        status: "PENDING",
      },
      transfer: {
        id: transfer?.id ?? null,
        reference:
          transfer?.reference ?? currentTransaction.reference,
        transferCode: transfer?.transfer_code ?? null,
        status: transfer?.status ?? "pending",
        amount: storedAmount,
        amountInKobo: storedAmountInKobo,
        currency: currentTransaction.currency,
        recipientCode: currentTransaction.recipientCode,
        recipientName: currentTransaction.recipient,
        reason: currentTransaction.description,
      },
    });
  } catch (error) {
    console.error("AZA_TRANSFER_ROUTE_ERROR:", error);

    if (error instanceof Error) {
      const knownErrors: Record<string, string> = {
        INVALID_TRANSFER_REFERENCE:
          "Invalid transfer reference.",
        TRANSFER_REFERENCE_FINAL:
          "This transfer reference has already reached a final state.",
        TRANSFER_DETAILS_MISMATCH:
          "Transfer details do not match the original transaction reference.",
        INSUFFICIENT_AVAILABLE_BALANCE:
          "Insufficient available AZA balance.",
        ACCOUNT_NOT_FOUND:
          "AZA account not found.",
      };

      const knownMessage = knownErrors[error.message];

      if (knownMessage) {
        return errorResponse(
          knownMessage,
          error.message === "INSUFFICIENT_AVAILABLE_BALANCE"
            ? 400
            : error.message === "ACCOUNT_NOT_FOUND"
              ? 404
              : 409
        );
      }
    }

    return errorResponse(
      "Unable to process this transfer. Check its status before attempting anything again.",
      500
    );
  }
}