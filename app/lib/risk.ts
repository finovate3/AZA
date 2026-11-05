export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type RiskAction = "ALLOW" | "STEP_UP" | "HOLD";

export interface RiskSignal {
  code: string;
  message: string;
  points: number;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  action: RiskAction;
  signals: RiskSignal[];
}

interface RiskTransaction {
  amount: number;
  type: string;
  status: string;
  recipient: string | null;
  createdAt: Date | string;
}

export interface TransferRiskResult {
  assessment: RiskAssessment;
  requiresReview: boolean;
}

export function calculateTransactionRisk(
  transaction: RiskTransaction,
  recentTransactions: RiskTransaction[],
  balance: number
): RiskAssessment {
  let score = 0;
  const signals: RiskSignal[] = [];

  const amount = Math.abs(transaction.amount);

  // 1. Compare against completed transaction history.
  const completedTransactions = recentTransactions.filter(
    (item) => item.status === "COMPLETED"
  );

  const completedAmounts = completedTransactions.map(
    (item) => Math.abs(item.amount)
  );

  const averageAmount =
    completedAmounts.length > 0
      ? completedAmounts.reduce(
          (sum, value) => sum + value,
          0
        ) / completedAmounts.length
      : 0;

  if (
    averageAmount > 0 &&
    amount >= averageAmount * 5
  ) {
    score += 35;

    signals.push({
      code: "UNUSUALLY_LARGE",
      message:
        "This transaction is significantly larger than the user's recent average transaction.",
      points: 35,
    });
  }

  // 2. Check the impact on the available account balance.
  if (
    Number.isFinite(balance) &&
    balance > 0 &&
    amount >= balance * 0.75
  ) {
    score += 30;

    signals.push({
      code: "HIGH_BALANCE_IMPACT",
      message:
        "This transaction would consume a large portion of the available account balance.",
      points: 30,
    });
  }

  // 3. Count repeated completed transactions to the recipient.
  if (transaction.recipient) {
    const sameRecipientCount =
      completedTransactions.filter(
        (item) =>
          item.recipient === transaction.recipient
      ).length;

    if (sameRecipientCount >= 5) {
      score += 15;

      signals.push({
        code: "REPEATED_RECIPIENT",
        message:
          "There are multiple recent completed transactions involving the same recipient.",
        points: 15,
      });
    }
  }

  // 4. Check recent failed transactions.
  const failedCount = recentTransactions.filter(
    (item) => item.status === "FAILED"
  ).length;

  if (failedCount >= 3) {
    score += 10;

    signals.push({
      code: "MULTIPLE_FAILURES",
      message:
        "Several recent transactions have failed.",
      points: 10,
    });
  }

  // 5. Check transaction type.
  const knownTypes = [
    "SENT",
    "TOP UP",
    "RECEIVED",
    "BILL PAYMENT",
    "CARD PAYMENT",
    "SUBSCRIPTION PAYMENT",
  ];

  if (
    !knownTypes.includes(
      transaction.type.trim().toUpperCase()
    )
  ) {
    score += 10;

    signals.push({
      code: "UNUSUAL_TRANSACTION_TYPE",
      message:
        "The transaction type is outside AZA's normal transaction categories.",
      points: 10,
    });
  }

  const normalizedScore = Math.min(score, 100);

  let level: RiskLevel = "LOW";
  let action: RiskAction = "ALLOW";

  if (normalizedScore >= 60) {
    level = "HIGH";
    action = "HOLD";
  } else if (normalizedScore >= 30) {
    level = "MEDIUM";
    action = "STEP_UP";
  }

  return {
    score: normalizedScore,
    level,
    action,
    signals,
  };
}

export function assessTransferRisk(
  transaction: RiskTransaction,
  recentTransactions: RiskTransaction[],
  balance: number
): TransferRiskResult {
  const assessment = calculateTransactionRisk(
    transaction,
    recentTransactions,
    balance
  );

  return {
    assessment,
    requiresReview: assessment.action === "HOLD",
  };
}