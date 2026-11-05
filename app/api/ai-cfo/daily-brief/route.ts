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

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
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
    const cookieHeader =
      request.headers.get("cookie") ?? "";

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
        { error: "Unauthorized." },
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
        { error: "Invalid session." },
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
        { error: "Session expired." },
        { status: 401 }
      );
    }

    if (!session.user.account) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 }
      );
    }

    const account = session.user.account;

    const balance = Number(account.balance);

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

    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart =
      new Date(todayStart);

    yesterdayStart.setDate(
      yesterdayStart.getDate() - 1
    );

    const yesterdayTransactions =
      await prisma.transaction.findMany({
        where: {
          accountId: account.id,
          createdAt: {
            gte: yesterdayStart,
            lt: todayStart,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    const completedTransactions =
      yesterdayTransactions.filter(
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

    const spending =
      spendingTransactions.reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );

    const moneyIn =
      moneyInTransactions.reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
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

      const amount =
        Number(transaction.amount);

      spendingByCategory[category] =
        (spendingByCategory[category] ?? 0) +
        amount;
    }

    const spendingCategories =
      Object.entries(spendingByCategory)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage:
            spending > 0
              ? (amount / spending) * 100
              : 0,
        }))
        .sort(
          (a, b) => b.amount - a.amount
        );

    const topSpendingCategory =
      spendingCategories.length > 0
        ? spendingCategories[0]
        : null;

    const largestSpending =
      spendingTransactions.length > 0
        ? spendingTransactions.reduce(
            (largest, transaction) =>
              Number(transaction.amount) >
              Number(largest.amount)
                ? transaction
                : largest
          )
        : null;

    const totalSavings =
      lockedSavings + rainyDaySavings;

    const focus =
      balance <= 0
        ? {
            type: "BALANCE",
            title:
              "Protect your available balance",
            message:
              "Review your recent activity before making additional spending commitments.",
          }
        : spending > balance
        ? {
            type: "SPENDING",
            title:
              "Review your recent spending",
            message:
              "Your recent spending needs a closer look relative to your available balance.",
          }
        : rainyDaySavings === 0
        ? {
            type: "RAINY_DAY",
            title:
              "Build your Rainy Day Savings",
            message:
              "You have automatic Locked Savings, but no accessible Rainy Day Savings yet.",
          }
        : topSpendingCategory
        ? {
            type: "SPENDING",
            title: `Watch ${topSpendingCategory.category}`,
            message:
              `Your largest spending category yesterday was ${topSpendingCategory.category}. Keep an eye on it today.`,
          }
        : {
            type: "MAINTAIN",
            title:
              "Maintain your current position",
            message:
              "Continue monitoring your spending and building your savings layers.",
          };

    const brief = {
      date: todayStart.toISOString(),

      greeting:
        "Here's your AZA financial brief.",

      balance,

      yesterday: {
        spending,
        moneyIn,

        transactionCount:
          completedTransactions.length,

        spendingCount:
          spendingTransactions.length,

        moneyInCount:
          moneyInTransactions.length,

        spendingCategories,

        topSpendingCategory,

        largestSpending:
          largestSpending
            ? {
                amount: Number(
                  largestSpending.amount
                ),
                description:
                  largestSpending.description,
                recipient:
                  largestSpending.recipient,
              }
            : null,
      },

      savings: {
        rainyDay: rainyDaySavings,
        locked: lockedSavings,
        total: totalSavings,
      },

      focus,
    };

    let summary = "";

try {
  summary = await generateFinancialAnalysis(`
You are AZA's AI CFO.

Generate a concise, useful daily financial brief for the authenticated AZA user.

Use ONLY the financial data provided below. Do not invent transactions, amounts, balances, savings, or financial activity.

The brief should:
- Explain what happened financially yesterday.
- Mention the most important spending pattern.
- Mention money received if applicable.
- Consider the user's current available balance.
- Consider Locked Savings and Rainy Day Savings separately.
- Identify one practical thing the user should do today.
- Identify one thing the user should avoid today.
- Be encouraging but financially responsible.
- Never shame the user.
- Use Nigerian naira formatting.
- Keep the response concise and natural.
- Do not use headings unless they improve readability.

AZA financial data:

${JSON.stringify(
  {
    currentBalance: balance,
    yesterday: {
      spending,
      moneyIn,
      transactionCount:
        completedTransactions.length,
      spendingCount:
        spendingTransactions.length,
      moneyInCount:
        moneyInTransactions.length,
      spendingCategories,
      topSpendingCategory,
      largestSpending:
        largestSpending
          ? {
              amount:
                Number(
                  largestSpending.amount
                ),
              description:
                largestSpending.description,
              recipient:
                largestSpending.recipient,
            }
          : null,
    },
    savings: {
      lockedSavings: lockedSavings,
      rainyDaySavings: rainyDaySavings,
      totalSavings: totalSavings,
    },
    existingFocus: focus,
  },
  null,
  2
)}
`);

  summary =
    summary.trim() ||
    "Your AZA financial brief is ready.";
} catch (aiError) {
  console.error(
    "GEMINI_DAILY_BRIEF_ERROR:",
    aiError
  );

  summary =
    spending === 0 && moneyIn === 0
      ? `Yesterday you had no completed spending or incoming transactions recorded. Your current available balance is ${formatNaira(
          balance
        )}.`
      : `Yesterday you spent ${formatNaira(
          spending
        )} across ${
          spendingTransactions.length
        } spending transaction${
          spendingTransactions.length === 1
            ? ""
            : "s"
        } and received ${formatNaira(
          moneyIn
        )}.`;
}

    return NextResponse.json({
      brief,
      summary,
    });
  } catch (error) {
    console.error(
      "AI_CFO_DAILY_BRIEF_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to generate the daily financial brief.",
      },
      { status: 500 }
    );
  }
}