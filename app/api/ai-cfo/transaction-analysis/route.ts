import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../prisma";
import { generateFinancialAnalysis } from "../../../ai";

function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function getSessionToken(request: Request) {
  const cookieHeader =
    request.headers.get("cookie") ?? "";

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) =>
      cookie.startsWith("aza_session=")
    )
    ?.split("=")
    .slice(1)
    .join("=");
}

function getTransactionCategory(transaction: {
  type: string;
  description: string | null;
  recipient: string | null;
}) {
  const text =
    `${transaction.description ?? ""} ${
      transaction.recipient ?? ""
    }`.toLowerCase();

  if (
    text.includes("netflix") ||
    text.includes("spotify") ||
    text.includes("youtube") ||
    text.includes("subscription")
  ) {
    return "Subscriptions";
  }

  if (
    text.includes("electric") ||
    text.includes("phcn") ||
    text.includes("water") ||
    text.includes("internet") ||
    text.includes("mtn") ||
    text.includes("airtel") ||
    text.includes("glo") ||
    text.includes("9mobile") ||
    text.includes("dstv")
  ) {
    return "Bills & Utilities";
  }

  if (
    text.includes("uber") ||
    text.includes("bolt") ||
    text.includes("taxi") ||
    text.includes("transport") ||
    text.includes("fuel") ||
    text.includes("petrol")
  ) {
    return "Transportation";
  }

  if (
    text.includes("restaurant") ||
    text.includes("food") ||
    text.includes("jollof") ||
    text.includes("chicken") ||
    text.includes("pizza") ||
    text.includes("market")
  ) {
    return "Food & Dining";
  }

  if (
    text.includes("amazon") ||
    text.includes("jumia") ||
    text.includes("konga") ||
    text.includes("shop") ||
    text.includes("store")
  ) {
    return "Shopping";
  }

  return "Other";
}

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

    const session =
      await prisma.session.findUnique({
        where: {
          tokenHash,
        },
        include: {
          user: {
            include: {
              account: {
                include: {
                  savings: true,
                  rainyDaySavings: true,
                },
              },
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

    const transactions =
      await prisma.transaction.findMany({
        where: {
          accountId: account.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      });

    const completedTransactions =
      transactions.filter(
        (transaction) =>
          transaction.status === "COMPLETED"
      );

    const spendingTypes = [
      "SENT",
      "BILL PAYMENT",
      "CARD PAYMENT",
      "SUBSCRIPTION PAYMENT",
    ];

    const moneyInTypes = [
      "TOP UP",
      "RECEIVED",
    ];

    const spendingTransactions =
      completedTransactions.filter(
        (transaction) =>
          spendingTypes.includes(
            transaction.type.toUpperCase()
          )
      );

    const moneyInTransactions =
      completedTransactions.filter(
        (transaction) =>
          moneyInTypes.includes(
            transaction.type.toUpperCase()
          )
      );

    const totalSpending =
      spendingTransactions.reduce(
        (total, transaction) =>
          total + Math.abs(Number(transaction.amount)),
        0
      );

    const totalMoneyIn =
      moneyInTransactions.reduce(
        (total, transaction) =>
          total + Math.abs(Number(transaction.amount)),
        0
      );

    const spendingByCategory: Record<
      string,
      number
    > = {};

    for (const transaction of spendingTransactions) {
      const category =
        getTransactionCategory({
          type: transaction.type,
          description: transaction.description,
          recipient: transaction.recipient,
        });

      spendingByCategory[category] =
        (spendingByCategory[category] ?? 0) +
        Math.abs(Number(transaction.amount));
    }

    const categories =
      Object.entries(spendingByCategory)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage:
            totalSpending > 0
              ? Number(
                  (
                    (amount / totalSpending) *
                    100
                  ).toFixed(2)
                )
              : 0,
        }))
        .sort(
          (a, b) => b.amount - a.amount
        );

    const largestSpending =
      spendingTransactions.length > 0
        ? spendingTransactions.reduce(
            (largest, transaction) =>
              Math.abs(
                Number(transaction.amount)
              ) >
              Math.abs(
                Number(largest.amount)
              )
                ? transaction
                : largest
          )
        : null;

    const lockedSavings =
      account.savings
        ? Number(account.savings.amount)
        : 0;

    const rainyDaySavings =
      account.rainyDaySavings
        .filter(
          (saving) =>
            saving.status === "ACTIVE"
        )
        .reduce(
          (total, saving) =>
            total + Number(saving.amount),
          0
        );

    const analysisData = {
      currentBalance:
        Number(account.balance),

      transactionCount:
        completedTransactions.length,

      totalSpending,

      totalMoneyIn,

      spendingByCategory:
        categories,

      largestSpending:
        largestSpending
          ? {
              amount: Math.abs(
                Number(
                  largestSpending.amount
                )
              ),
              type:
                largestSpending.type,
              description:
                largestSpending.description,
              recipient:
                largestSpending.recipient,
              date:
                largestSpending.createdAt,
            }
          : null,

      savings: {
        locked:
          lockedSavings,
        rainyDay:
          rainyDaySavings,
        total:
          lockedSavings +
          rainyDaySavings,
      },

      recentTransactions:
        completedTransactions
          .slice(0, 30)
          .map((transaction) => ({
            type:
              transaction.type,
            amount:
              Number(
                transaction.amount
              ),
            description:
              transaction.description,
            recipient:
              transaction.recipient,
            status:
              transaction.status,
            createdAt:
              transaction.createdAt,
          })),
    };

    const analysis =
      await generateFinancialAnalysis(`
You are AZA's financial analysis engine.

Analyze the user's recent financial activity using ONLY the data provided.

Identify:
1. The user's strongest spending pattern.
2. The largest spending category.
3. Any potentially concerning spending behavior.
4. Whether spending appears reasonable relative to the current balance.
5. How the user is doing with savings.
6. One concrete action the user should take next.
7. One spending behavior the user should avoid.

Keep the analysis concise, practical, and personalized.

Do not invent transactions.
Do not invent income.
Do not claim a transaction is fraudulent.
Do not shame the user.
Do not provide investment advice.
Use Nigerian naira where amounts are mentioned.

AZA financial data:

${JSON.stringify(
  analysisData,
  null,
  2
)}
`);

    return NextResponse.json({
      success: true,
      analysis:
        analysis.trim() ||
        "Your transaction analysis is currently unavailable.",
      data: analysisData,
    });
  } catch (error) {
    console.error(
      "AI_CFO_TRANSACTION_ANALYSIS_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to analyze transactions right now.",
      },
      { status: 500 }
    );
  }
}