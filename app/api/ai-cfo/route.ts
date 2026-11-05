import { NextResponse } from "next/server";
import crypto from "crypto";
import { generateLiveCfoReply } from "../../ai";
import { prisma } from "../../prisma";



function hashToken(token: string) {
return crypto
.createHash("sha256")
.update(token)
.digest("hex");
}

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export async function POST(request: Request) {
try {
const body = await request.json();

const message =
  typeof body.message === "string"
    ? body.message.trim()
    : "";
if (!message) {
  return NextResponse.json(
    { error: "Message is required." },
    { status: 400 }
  );
}
const cookieHeader = request.headers.get("cookie") ?? "";
const sessionToken = cookieHeader
  .split(";")
  .map((cookie) => cookie.trim())
  .find((cookie) => cookie.startsWith("aza_session="))
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
            transactions: {
              orderBy: {
                createdAt: "desc",
              },
              take: 20,
            },
            card: true,
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

const lockedSavingsAmount = account.savings
  ? Number(account.savings.amount)
  : 0;
const rainyDaySavingsTotal =
  account.rainyDaySavings
    .filter((saving) => saving.status === "ACTIVE")
    .reduce(
      (total, saving) => total + Number(saving.amount),
      0
    );
const recentTransactions =
  account.transactions.map((transaction) => ({
    type: transaction.type,
    amount: Number(transaction.amount),
    status: transaction.status,
    description: transaction.description,
    recipient: transaction.recipient,
    createdAt: transaction.createdAt,
  }));

const completedTransactions =
  recentTransactions.filter(
    (transaction) =>
      transaction.status === "COMPLETED"
  );

const spendingTypes = [
  "SENT",
  "BILL PAYMENT",
  "CARD PAYMENT",
  "SUBSCRIPTION PAYMENT",
];

const savingsMovementTypes = [
  "SAVINGS",
  "RAINY DAY SAVINGS",
];

const moneyInTypes = [
  "TOP UP",
  "RECEIVED",
];

const totalSpending =
  completedTransactions
    .filter((transaction) =>
      spendingTypes.includes(
        transaction.type.toUpperCase()
      )
    )
    .reduce(
      (total, transaction) =>
        total + transaction.amount,
      0
    );

const getTransactionCategory = (
  transaction: {
    type: string;
    description: string | null;
    recipient: string | null;
  }
) => {
  const text = `${transaction.description ?? ""} ${
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
};

const spendingByCategory: Record<
  string,
  number
> = {};

for (const transaction of completedTransactions) {
  if (
    !spendingTypes.includes(
      transaction.type.toUpperCase()
    )
  ) {
    continue;
  }

  const category =
    getTransactionCategory(transaction);

  const amount = Number(transaction.amount);

  spendingByCategory[category] =
    (spendingByCategory[category] ?? 0) + amount;
}

const spendingCategories = Object.entries(
  spendingByCategory
)
  .map(([category, amount]) => ({
    category,
    amount,
    percentage:
      totalSpending > 0
        ? (amount / totalSpending) * 100
        : 0,
  }))
  .sort((a, b) => b.amount - a.amount);

const topSpendingCategory =
  spendingCategories.length > 0
    ? spendingCategories[0]
    : null;



const totalSavingsMovement =
  completedTransactions
    .filter((transaction) =>
      savingsMovementTypes.includes(
        transaction.type.toUpperCase()
      )
    )
    .reduce(
      (total, transaction) =>
        total + transaction.amount,
      0
    );

const totalMoneyIn =
  completedTransactions
    .filter((transaction) =>
      moneyInTypes.includes(
        transaction.type.toUpperCase()
      )
    )
    .reduce(
      (total, transaction) =>
        total + transaction.amount,
      0
    );

const totalMoneyOut =
  totalSpending + totalSavingsMovement;

const netTransactionFlow =
  totalMoneyIn - totalMoneyOut;

const yesterdayCompletedTransactions =
  yesterdayTransactions.filter(
    (transaction) =>
      transaction.status === "COMPLETED"
  );

const yesterdaySpendingTransactions =
  yesterdayCompletedTransactions.filter(
    (transaction) =>
      spendingTypes.includes(
        transaction.type.toUpperCase()
      )
  );

const yesterdayMoneyInTransactions =
  yesterdayCompletedTransactions.filter(
    (transaction) =>
      moneyInTypes.includes(
        transaction.type.toUpperCase()
      )
  );

const yesterdaySpending =
  yesterdaySpendingTransactions.reduce(
    (total, transaction) =>
      total + Number(transaction.amount),
    0
  );

const yesterdayMoneyIn =
  yesterdayMoneyInTransactions.reduce(
    (total, transaction) =>
      total + Number(transaction.amount),
    0
  );

const yesterdayTransactionCount =
  yesterdayCompletedTransactions.length;

const yesterdaySpendingCount =
  yesterdaySpendingTransactions.length;

const yesterdayMoneyInCount =
  yesterdayMoneyInTransactions.length;

const yesterdayLargestSpending =
  yesterdaySpendingTransactions.length > 0
    ? yesterdaySpendingTransactions.reduce(
        (largest, transaction) =>
          Number(transaction.amount) >
          Number(largest.amount)
            ? transaction
            : largest
      )
    : null;

const yesterdaySpendingByCategory: Record<
  string,
  number
> = {};

for (const transaction of yesterdaySpendingTransactions) {
  const category =
    getTransactionCategory({
      type: transaction.type,
      description: transaction.description,
      recipient: transaction.recipient,
    });
    

  const amount = Number(transaction.amount);

  yesterdaySpendingByCategory[category] =
    (yesterdaySpendingByCategory[category] ?? 0) +
    amount;
}

const yesterdaySpendingCategories =
  Object.entries(yesterdaySpendingByCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage:
        yesterdaySpending > 0
          ? (amount / yesterdaySpending) * 100
          : 0,
    }))
    .sort(
      (a, b) => b.amount - a.amount
    );

const yesterdayTopSpendingCategory =
  yesterdaySpendingCategories.length > 0
    ? yesterdaySpendingCategories[0]
    : null;


const card = account.card
  ? {
      status: account.card.status,
      type: account.card.type,
      spendingLimit: Number(account.card.spendingLimit),
    }
  : null;

  const lowerMessage = message.toLowerCase();

const asksBalance =
  lowerMessage.includes("balance") ||
  lowerMessage.includes("available balance") ||
  lowerMessage.includes("account balance") ||
  lowerMessage === "how much do i have";

const asksSavings =
  lowerMessage.includes("saving") ||
  lowerMessage.includes("saved") ||
  lowerMessage.includes("savings");

const asksLockedSavings =
  lowerMessage.includes("locked") ||
  lowerMessage.includes("maturity") ||
  lowerMessage.includes("mature");

const asksRainyDay =
  lowerMessage.includes("rainy day") ||
  lowerMessage.includes("emergency fund");

const asksSpending =
  lowerMessage.includes("spend") ||
  lowerMessage.includes("spending") ||
  lowerMessage.includes("transaction");

const asksSpendingBreakdown =
  lowerMessage.includes("spending breakdown") ||
  lowerMessage.includes("where am i spending") ||
  lowerMessage.includes("where is my money going") ||
  lowerMessage.includes("largest spending") ||
  lowerMessage.includes("top spending") ||
  lowerMessage.includes("spending category");

const asksCard =
  lowerMessage.includes("card") ||
  lowerMessage.includes("card limit");

const asksHowDoing =
  lowerMessage.includes("how am i doing") ||
  lowerMessage.includes("how am i doing financially") ||
  lowerMessage.includes("financial health") ||
  lowerMessage.includes("financially");

const asksImprove =
  lowerMessage.includes("what should i improve") ||
  lowerMessage.includes("what can i improve") ||
  lowerMessage.includes("what should i do") ||
  lowerMessage.includes("improve my finances");

const asksSummary =
  lowerMessage.includes("summary") ||
  lowerMessage.includes("summarize") ||
  lowerMessage.includes("financial summary") ||
  lowerMessage.includes("overall");

const asksPlan =
  lowerMessage.includes("financial plan") ||
  lowerMessage.includes("my plan") ||
  lowerMessage.includes("what should i focus on") ||
  lowerMessage.includes("what should i focus on today") ||
  lowerMessage.includes("what is my priority");

const totalSavings =
  lockedSavingsAmount + rainyDaySavingsTotal;

const balanceLabel =
  balance <= 0
    ? "LOW"
    : balance < 100000
    ? "WATCH"
    : "HEALTHY";

const spendingLabel =
  totalSpending === 0
    ? "NO_DATA"
    : totalSpending > balance
    ? "HIGH"
    : totalSpending >= balance * 0.5
    ? "MODERATE"
    : "LOW";

const savingsLabel =
  totalSavings === 0
    ? "START"
    : totalSavings < 100000
    ? "BUILDING"
    : "ESTABLISHED";

const overallStatus =
  balance <= 0 || totalSpending > balance
    ? "ATTENTION"
    : rainyDaySavingsTotal === 0
    ? "WATCH"
    : "STABLE";

const overallMessage =
  overallStatus === "ATTENTION"
    ? "Your current balance and spending activity need attention."
    : overallStatus === "WATCH"
    ? "Your finances are progressing, but building accessible savings remains an important focus."
    : "Your current financial position is stable based on the available AZA data.";

const todayFocus =
  balance <= 0
    ? {
        title: "Protect your available balance",
        message:
          "Review your recent transactions before making additional spending commitments.",
        type: "BALANCE",
      }
    : totalSpending > balance
    ? {
        title: "Review your recent spending",
        message:
          "Your recent spending is higher than your available balance. Review your transactions and identify expenses you can reduce.",
        type: "SPENDING",
      }
    : rainyDaySavingsTotal === 0
    ? {
        title: "Start building your Rainy Day Savings",
        message:
          "You already have your automatic Locked Savings layer. Building accessible Rainy Day Savings gives you another layer of financial protection.",
        type: "RAINY_DAY",
      }
    : topSpendingCategory
    ? {
        title: `Watch ${topSpendingCategory.category}`,
        message:
          `Your largest recent spending category is ${topSpendingCategory.category}. Keep an eye on this category today.`,
        type: "SPENDING",
      }
    : {
        title: "Maintain your current position",
        message:
          "Continue monitoring your spending and building your savings layers.",
        type: "MAINTAIN",
      };

const financialAssessment = {
  balanceStatus: balanceLabel,

  spendingStatus:
    totalSpending === 0
      ? "NO_SPENDING_DATA"
      : totalSpending > balance
      ? "HIGH"
      : "ACTIVE",

  savingsStatus:
    rainyDaySavingsTotal === 0 &&
    lockedSavingsAmount === 0
      ? "START"
      : rainyDaySavingsTotal === 0
      ? "BUILD_RAINY_DAY"
      : "BUILDING",

  securityStatus:
    "PROTECTED",

  priority:
    balance <= 0
      ? "BALANCE"
      : totalSpending > balance
      ? "SPENDING"
      : rainyDaySavingsTotal === 0
      ? "RAINY_DAY"
      : "MAINTAIN",

  spendingInsight:
  topSpendingCategory
    ? `Your largest recent spending category is ${
        topSpendingCategory.category
      }, accounting for ${topSpendingCategory.percentage.toFixed(
        0
      )}% of your recent spending.`
    : "There is not enough classified spending data to identify a dominant spending category.",
  todayFocus,
  summary: {
    availableBalance: balance,
    totalSpending,
    rainyDaySavings: rainyDaySavingsTotal,
    lockedSavings: lockedSavingsAmount,
    totalSavings,
  },
};

const aiFinancialContext = {
  user: {
    name: session.user.name,
    tag: session.user.tag,
  },

  account: {
    availableBalance: balance,
  },

  savings: {
    lockedSavings: lockedSavingsAmount,
    lockedSavingsStatus:
      account.savings?.status ?? null,
    lockedSavingsMaturity:
      account.savings?.maturityDate ?? null,
    rainyDaySavings: rainyDaySavingsTotal,
    totalSavings,
  },

  spending: {
    totalRecentSpending: totalSpending,
    spendingStatus: spendingLabel,
    topCategory: topSpendingCategory,
    categories: spendingCategories,
  },

  cashFlow: {
    totalMoneyIn,
    totalMoneyOut,
    netTransactionFlow,
  },

  yesterday: {
    spending: yesterdaySpending,
    moneyIn: yesterdayMoneyIn,
    transactionCount:
      yesterdayTransactionCount,
    spendingCount:
      yesterdaySpendingCount,
    moneyInCount:
      yesterdayMoneyInCount,
    topSpendingCategory:
      yesterdayTopSpendingCategory,
    largestSpending:
      yesterdayLargestSpending
        ? {
            amount: Number(
              yesterdayLargestSpending.amount
            ),
            description:
              yesterdayLargestSpending.description,
            recipient:
              yesterdayLargestSpending.recipient,
          }
        : null,
    spendingCategories:
      yesterdaySpendingCategories,
  },

  card,

  recentTransactions,
};

let reply = "";

try {
  const aiResponse = await generateLiveCfoReply([
  {
    role: "system",
    content: `YOUR EXISTING AI CFO INSTRUCTIONS HERE`,
  },
  {
    role: "user",
    content: `
The authenticated AZA user is asking:

"${message}"

Here is the user's current AZA financial data:

${JSON.stringify(
  aiFinancialContext,
  null,
  2
)}

Answer the user's question using this information.
`,
  },
]);

reply =
  aiResponse.trim() ||
  "I reviewed your AZA financial information, but I couldn't generate a response right now.";
} catch (aiError) {
  console.error(
    "OPENAI_AI_CFO_ERROR:",
    aiError
  );

  reply =
    aiError instanceof Error
    ? `AI CFO connection error: ${aiError.message}`
    :"AI CFO connection error. Check the server terminal for details.";
}
  return NextResponse.json({
  reply,
  financialAssessment,
  financialSnapshot: {
    balance,
    totalMoneyIn,
    totalMoneyOut,
    netTransactionFlow,
    
    dailyBrief: {
      date: todayStart.toISOString(),
      yesterday: {
        spending: yesterdaySpending,
        moneyIn: yesterdayMoneyIn,
        transactionCount:
          yesterdayTransactionCount,
        spendingCount:
          yesterdaySpendingCount,
        moneyInCount:
          yesterdayMoneyInCount,
        topSpendingCategory:
          yesterdayTopSpendingCategory,
        largestSpending:
          yesterdayLargestSpending
            ? {
                amount: Number(
                  yesterdayLargestSpending.amount
                ),
                description:
                  yesterdayLargestSpending.description,
                recipient:
                  yesterdayLargestSpending.recipient,
              }
            : null,
        spendingCategories:
          yesterdaySpendingCategories,
      },
    },

    totalSpending,
    spendingCategories,
    topSpendingCategory,
    lockedSavings: lockedSavingsAmount,
    rainyDaySavings: rainyDaySavingsTotal,
    totalSavings,
    recentTransactionCount:
      recentTransactions.length,
    completedTransactionCount:
      completedTransactions.length,
    card: card
      ? {
          status: card.status,
          type: card.type,
          spendingLimit: card.spendingLimit,
        }
      : null,
    lockedSavingsMaturity:
      account.savings?.maturityDate ?? null,
  },
});
} catch (error) {
  console.error(
    "AI_CFO_POST_ERROR:",
    error
  );

  return NextResponse.json(
    {
      error:
        "Unable to process your AI CFO request.",
    },
    { status: 500 }
  );
}
}



