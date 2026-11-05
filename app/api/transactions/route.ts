
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../prisma";

// Hash the session token before looking it up.
function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

// Extract the AZA session cookie.
function getSessionToken(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("aza_session="))
    ?.split("=")
    .slice(1)
    .join("=");
}

// GET: Retrieve the authenticated user's transactions.
export async function GET(request: Request) {
  try {
    const sessionToken = getSessionToken(request);

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const tokenHash = hashToken(sessionToken);

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

    if (!session) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    if (session.expiresAt <= new Date()) {
      await prisma.session.delete({
        where: {
          id: session.id,
        },
      });

      return NextResponse.json(
        { error: "Session expired" },
        { status: 401 }
      );
    }

    const account = session.user.account;

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json({
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
        recipient: transaction.recipient,
        reference: transaction.reference,
        createdAt: transaction.createdAt,
      })),
    });
  } catch (error) {
    console.error("TRANSACTIONS_GET_ERROR:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while retrieving transactions",
      },
      { status: 500 }
    );
  }
}

// POST: Process a transaction and its automatic Locked Savings contribution.
export async function POST(request: Request) {
  try {
    const sessionToken = getSessionToken(request);

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const tokenHash = hashToken(sessionToken);

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

    if (!session) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    if (session.expiresAt <= new Date()) {
      await prisma.session.delete({
        where: {
          id: session.id,
        },
      });

      return NextResponse.json(
        { error: "Session expired" },
        { status: 401 }
      );
    }

    const account = session.user.account;

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const amount = Number(body.amount);

    const type =
      typeof body.type === "string"
        ? body.type.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const recipient =
      typeof body.recipient === "string"
        ? body.recipient.trim()
        : "";

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "A valid transaction amount is required" },
        { status: 400 }
      );
    }

    if (
      Math.abs(
        amount * 100 - Math.round(amount * 100)
      ) > 0.000001
    ) {
      return NextResponse.json(
        {
          error:
            "Transaction amount cannot have more than 2 decimal places",
        },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: "Transaction type is required" },
        { status: 400 }
      );
    }

    // Validate card status and spending limit.
    if (type === "Card Payment") {
      const card = await prisma.card.findUnique({
        where: {
          accountId: account.id,
        },
      });

      if (!card) {
        return NextResponse.json(
          { error: "Card not found" },
          { status: 404 }
        );
      }

      if (card.status !== "ACTIVE") {
        return NextResponse.json(
          {
            error:
              "Your card is frozen. Unfreeze it to make a payment.",
          },
          { status: 400 }
        );
      }

      const cardPaymentsThisMonth =
        await prisma.transaction.aggregate({
          _sum: {
            amount: true,
          },
          where: {
            accountId: account.id,
            type: "Card Payment",
            createdAt: {
              gte: new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
              ),
            },
          },
        });

      const spentThisMonth = Math.abs(
        Number(
          cardPaymentsThisMonth._sum.amount ?? 0
        )
      );

      const remainingLimit =
        Number(card.spendingLimit) - spentThisMonth;

      if (amount > remainingLimit) {
        return NextResponse.json(
          {
            error:
              "This payment exceeds your remaining monthly card limit.",
          },
          { status: 400 }
        );
      }
    }

    const reference = `AZA-TXN-${crypto.randomUUID()}`;

    // All account balance changes happen within one database transaction.
    const result = await prisma.$transaction(async (tx) => {
      // Lock the account to serialize balance-changing operations.
      await tx.$queryRaw`
        SELECT id
        FROM "Account"
        WHERE id = ${account.id}
        FOR UPDATE
      `;

      const freshAccount = await tx.account.findUnique({
        where: {
          id: account.id,
        },
        select: {
          id: true,
          balance: true,
          currency: true,
        },
      });

      if (!freshAccount) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      // Reserve funds for pending bank transfers.
      const pendingTransfers =
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

      const pendingAmount = Number(
        pendingTransfers._sum.amount ?? 0
      );

      const availableBalance =
        Number(freshAccount.balance) - pendingAmount;

      if (amount > availableBalance) {
        throw new Error("INSUFFICIENT_AVAILABLE_BALANCE");
      }

      // Debit the transaction amount.
      const updatedAccount = await tx.account.update({
        where: {
          id: account.id,
        },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // Record the completed transaction.
      const transaction = await tx.transaction.create({
        data: {
          accountId: account.id,
          type,
          amount: -amount,
          currency: freshAccount.currency,
          status: "COMPLETED",
          description: description || null,
          recipient: recipient || null,
          reference,
        },
      });

      // Calculate the automatic 2% Locked Savings contribution.
      const automaticSavingsAmount = Number(
        (amount * 0.02).toFixed(2)
      );

      let lockedSavingsContribution = 0;

      let savings = await tx.savings.findUnique({
        where: {
          accountId: account.id,
        },
      });

      const remainingBalance = Number(
        updatedAccount.balance
      );

      // Fund Locked Savings only if sufficient available funds remain.
      if (
        automaticSavingsAmount > 0 &&
        remainingBalance - pendingAmount >=
          automaticSavingsAmount
      ) {
        if (savings) {
          savings = await tx.savings.update({
            where: {
              accountId: account.id,
            },
            data: {
              amount: {
                increment: automaticSavingsAmount,
              },
            },
          });
        } else {
          const savingsStartDate = new Date();

          const savingsMaturityDate = new Date(
            savingsStartDate
          );

          savingsMaturityDate.setDate(
            savingsMaturityDate.getDate() + 300
          );

          savings = await tx.savings.create({
            data: {
              accountId: account.id,
              amount: automaticSavingsAmount,
              targetAmount: automaticSavingsAmount,
              interestRate: 5,
              lockPeriodDays: 300,
              startDate: savingsStartDate,
              maturityDate: savingsMaturityDate,
              status: "ACTIVE",
              reference: `AZA-SAV-${crypto.randomUUID()}`,
            },
          });
        }

        // Debit the actual contribution from the account.
        await tx.account.update({
          where: {
            id: account.id,
          },
          data: {
            balance: {
              decrement: automaticSavingsAmount,
            },
          },
        });

        // IMPORTANT:
        // Record the contribution only after funding succeeds.
        lockedSavingsContribution = automaticSavingsAmount;
      }

      // Store the actual funded contribution, or zero.
      const recordedTransaction =
        await tx.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            lockedSavingsContribution,
          },
        });

      // Create an individual 300-day record only when funded.
      if (lockedSavingsContribution > 0) {
        const contributionStartDate = new Date();

        const contributionMaturityDate = new Date(
          contributionStartDate
        );

        contributionMaturityDate.setDate(
          contributionMaturityDate.getDate() + 300
        );

        await tx.lockedSavingsContribution.create({
          data: {
            accountId: account.id,
            transactionId: transaction.id,
            amount: lockedSavingsContribution,
            startDate: contributionStartDate,
            maturityDate: contributionMaturityDate,
            status: "LOCKED",
            reference: `AZA-LOCK-${crypto.randomUUID()}`,
          },
        });
      }

      const finalAccount = await tx.account.findUnique({
        where: {
          id: account.id,
        },
      });

      return {
        account: finalAccount ?? updatedAccount,
        transaction: recordedTransaction,
        savings,
      };
    });

    return NextResponse.json({
      message: "Transaction completed successfully",

      account: {
        id: result.account.id,
        balance: result.account.balance.toString(),
        currency: result.account.currency,
      },

      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount.toString(),
        type: result.transaction.type,
        status: result.transaction.status,
        reference: result.transaction.reference,
        description: result.transaction.description,
        recipient: result.transaction.recipient,
        createdAt: result.transaction.createdAt,
      },

      savings: result.savings
        ? {
            id: result.savings.id,
            amount: result.savings.amount.toString(),
            targetAmount:
              result.savings.targetAmount.toString(),
            interestRate:
              result.savings.interestRate.toString(),
            lockPeriodDays:
              result.savings.lockPeriodDays,
            startDate: result.savings.startDate,
            maturityDate: result.savings.maturityDate,
            status: result.savings.status,
            reference: result.savings.reference,
          }
        : null,
    });
  } catch (error) {
    console.error("TRANSACTION_POST_ERROR:", error);

    if (
      error instanceof Error &&
      error.message === "INSUFFICIENT_AVAILABLE_BALANCE"
    ) {
      return NextResponse.json(
        {
          error:
            "Insufficient available funds after reserving pending transfers.",
        },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "ACCOUNT_NOT_FOUND"
    ) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Something went wrong while processing the transaction",
      },
      { status: 500 }
    );
  }
}
