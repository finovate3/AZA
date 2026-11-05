import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../prisma";

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
    const cookieHeader = request.headers.get("cookie") ?? "";

    const sessionToken = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("aza_session="))
      ?.split("=")[1];

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Unauthorized." },
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

    if (!session || session.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Session expired or invalid." },
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

    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
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

    const spendingTypes = new Set([
      "SENT",
      "BILL PAYMENT",
      "CARD PAYMENT",
      "SUBSCRIPTION PAYMENT",
    ]);

    const moneyInTypes = new Set([
      "TOP UP",
      "RECEIVED",
    ]);

    const spendingTransactions =
      completedTransactions.filter((transaction) =>
        spendingTypes.has(transaction.type)
      );

    const moneyInTransactions =
      completedTransactions.filter((transaction) =>
        moneyInTypes.has(transaction.type)
      );

    const spending = spendingTransactions.reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

    const moneyIn = moneyInTransactions.reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

    const categoryTotals: Record<string, number> = {};

    for (const transaction of spendingTransactions) {
      const category =
        getTransactionCategory(transaction);

      categoryTotals[category] =
        (categoryTotals[category] ?? 0) +
        Number(transaction.amount);
    }

    const spendingCategories = Object.entries(
      categoryTotals
    )
      .map(([category, amount]) => ({
        category,
        amount,
        percentage:
          spending > 0
            ? Number(
                ((amount / spending) * 100).toFixed(1)
              )
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topCategory =
      spendingCategories[0] ?? null;

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

    const balance = Number(account.balance);

    const lockedSavings = account.savings
      ? Number(account.savings.amount)
      : 0;

    const rainyDaySavings =
      account.rainyDaySavings.reduce(
        (total, saving) =>
          total + Number(saving.amount),
        0
      );

    const totalSavings =
      lockedSavings + rainyDaySavings;

    let focus = {
      type: "MAINTAIN",
      title: "Keep your financial momentum",
      message:
        "Your AZA CFO will keep monitoring your spending, balance, and savings.",
    };

    if (balance <= 0) {
      focus = {
        type: "BALANCE",
        title: "Protect your available balance",
        message:
          "Your available balance is low. Be deliberate with new spending today.",
      };
    } else if (spending > balance) {
      focus = {
        type: "SPENDING",
        title: "Watch today's spending",
        message:
          "Yesterday's spending was significant compared with your current available balance.",
      };
    } else if (rainyDaySavings === 0) {
      focus = {
        type: "RAINY_DAY",
        title: "Build your Rainy Day Savings",
        message:
          "You currently have no Rainy Day Savings. Consider putting some money aside for unexpected expenses.",
      };
    } else if (topCategory) {
      focus = {
        type: "SPENDING",
        title: `Watch ${topCategory.category}`,
        message:
          `This was your largest spending category yesterday at ${formatNaira(
            topCategory.amount
          )}.`,
      };
    }

    const userName =
      session.user.name?.trim().split(" ")[0] ||
      "there";

    const dateLabel =
      yesterdayStart.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    const messageParts = [
      `Good morning ${userName}.`,
      `Here's your AZA CFO brief for ${dateLabel}.`,
      `You spent ${formatNaira(spending)} yesterday.`,
      `You received ${formatNaira(moneyIn)}.`,
    ];

    if (topCategory) {
      messageParts.push(
        `${topCategory.category} was your largest spending category at ${formatNaira(
          topCategory.amount
        )}.`
      );
    }

    if (largestSpending) {
      const largestDescription =
        largestSpending.description ||
        largestSpending.recipient ||
        "your largest transaction";

      messageParts.push(
        `Your largest transaction was ${formatNaira(
          Number(largestSpending.amount)
        )} for ${largestDescription}.`
      );
    }

    messageParts.push(
      `Your current available balance is ${formatNaira(balance)}.`
    );

    messageParts.push(
      `Your Rainy Day Savings is ${formatNaira(
        rainyDaySavings
      )}, while Locked Savings is ${formatNaira(
        lockedSavings
      )}.`
    );

    messageParts.push(
      `Today's focus: ${focus.title}. ${focus.message}`
    );

    const message = messageParts.join(" ");

    return NextResponse.json({
      success: true,
      notification: {
        user: {
          name: session.user.name,
          email: session.user.email,
          phone: session.user.phone,
        },
        channels: {
          email: Boolean(session.user.email),
          sms: Boolean(session.user.phone),
          whatsapp: Boolean(session.user.phone),
        },
        scheduledTime: "10:00",
        message,
        focus,
        generatedAt: new Date().toISOString(),
      },
      financialSummary: {
        balance,
        yesterdaySpending: spending,
        yesterdayMoneyIn: moneyIn,
        transactionCount:
          completedTransactions.length,
        spendingCount:
          spendingTransactions.length,
        moneyInCount:
          moneyInTransactions.length,
        rainyDaySavings,
        lockedSavings,
        totalSavings,
        spendingCategories,
        topSpendingCategory: topCategory,
      },
    });
  } catch (error) {
    console.error(
      "AI_CFO_NOTIFICATION_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to generate the AI CFO notification.",
      },
      { status: 500 }
    );
  }
}