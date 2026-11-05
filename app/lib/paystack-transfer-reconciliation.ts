
import crypto from "crypto";
import { prisma } from "../prisma";

export type PaystackTransferOutcome =
  | "success"
  | "failed"
  | "reversed";

type ReconcileTransferInput = {
  reference: string;
  amountInKobo: number;
  currency: string;
  outcome: PaystackTransferOutcome;
};

export async function reconcilePaystackTransfer({
  reference,
  amountInKobo,
  currency,
  outcome,
}: ReconcileTransferInput) {
  // Validate incoming Paystack details.
  if (
    !reference ||
    !Number.isSafeInteger(amountInKobo) ||
    amountInKobo <= 0 ||
    typeof currency !== "string" ||
    currency.trim().toUpperCase() !== "NGN"
  ) {
    throw new Error("Invalid Paystack reconciliation details.");
  }

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: {
        reference,
      },
    });

    if (!transaction || transaction.type !== "Sent") {
      throw new Error("Outgoing AZA transfer not found.");
    }

    const expectedAmountInKobo = Math.round(
      Number(transaction.amount) * 100
    );

    if (
      expectedAmountInKobo !== amountInKobo ||
      transaction.currency.toUpperCase() !== "NGN"
    ) {
      throw new Error(
        "Paystack transfer details do not match AZA."
      );
    }

    // Lock the account to prevent concurrent balance changes.
    await tx.$queryRaw`
      SELECT "id"
      FROM "Account"
      WHERE "id" = ${transaction.accountId}
      FOR UPDATE
    `;

    // Reload the transaction after obtaining the account lock.
    const current = await tx.transaction.findUnique({
      where: {
        id: transaction.id,
      },
    });

    if (!current) {
      throw new Error("AZA transfer no longer exists.");
    }

    const transferAmount = amountInKobo / 100;

    // --------------------------------------------------
    // SUCCESSFUL PAYSTACK TRANSFER
    // --------------------------------------------------

    if (outcome === "success") {
      // A completed or reversed transfer must never be paid
      // out or debited again.
      if (
        current.status !== "PENDING" &&
        current.status !== "FAILED"
      ) {
        return {
          status: current.status,
          alreadyProcessed: true,
        };
      }

      const account = await tx.account.findUnique({
        where: {
          id: current.accountId,
        },
      });

      if (!account) {
        throw new Error("AZA account not found.");
      }

      // A previously failed transfer may receive a later
      // verified success event. The account must still have
      // enough money to settle it.
      
// Protect funds reserved for every other pending transfer.
const pendingReservations = await tx.transaction.aggregate({
  where: {
    accountId: current.accountId,
    type: "Sent",
    status: "PENDING",
    id: {
      not: current.id,
    },
  },
  _sum: {
    amount: true,
  },
});

const accountBalanceInKobo = Math.round(
  Number(account.balance) * 100
);

const otherPendingInKobo = Math.round(
  Number(pendingReservations._sum.amount ?? 0) * 100
);

if (
  !Number.isSafeInteger(accountBalanceInKobo) ||
  !Number.isSafeInteger(otherPendingInKobo) ||
  accountBalanceInKobo - otherPendingInKobo < amountInKobo
) {
  throw new Error(
    "Insufficient unreserved balance for transfer settlement. Manual reconciliation required."
  );
}


      // Claim the settlement exactly once.
      const claimed = await tx.transaction.updateMany({
        where: {
          id: current.id,
          status: {
            in: ["PENDING", "FAILED"],
          },
        },
        data: {
          status: "COMPLETED",
        },
      });

      if (claimed.count !== 1) {
        const latest = await tx.transaction.findUnique({
          where: {
            id: current.id,
          },
        });

        return {
          status: latest?.status ?? current.status,
          alreadyProcessed: true,
        };
      }

      // Debit the successful transfer.
      const accountAfterTransfer = await tx.account.update({
        where: {
          id: account.id,
        },
        data: {
          balance: {
            decrement: transferAmount,
          },
        },
      });

      // Calculate the automatic 2% Locked Savings contribution.
      const savingsContribution = Number(
        (transferAmount * 0.02).toFixed(2)
      );

      let recordedContribution = 0;

      // Only fund Locked Savings if sufficient funds remain.
      if (
        savingsContribution > 0 &&
        Number(accountAfterTransfer.balance) >=
          savingsContribution
      ) {
        const savings = await tx.savings.findUnique({
          where: {
            accountId: account.id,
          },
        });

        if (savings) {
          await tx.savings.update({
            where: {
              accountId: account.id,
            },
            data: {
              amount: {
                increment: savingsContribution,
              },
            },
          });
        } else {
          const startDate = new Date();
          const maturityDate = new Date(startDate);

          maturityDate.setDate(
            maturityDate.getDate() + 300
          );

          await tx.savings.create({
            data: {
              accountId: account.id,
              amount: savingsContribution,
              targetAmount: savingsContribution,
              interestRate: 5,
              lockPeriodDays: 300,
              startDate,
              maturityDate,
              status: "ACTIVE",
              reference: `AZA-SAV-${crypto.randomUUID()}`,
            },
          });
        }

        await tx.account.update({
          where: {
            id: account.id,
          },
          data: {
            balance: {
              decrement: savingsContribution,
            },
          },
        });

        recordedContribution = savingsContribution;
      }

      // Record the actual contribution, not the calculated
      // amount if the contribution could not be funded.
      await tx.transaction.update({
        where: {
          id: current.id,
        },
        data: {
          lockedSavingsContribution: recordedContribution,
        },
      });

      // Create an individual 300-day contribution record.
      if (recordedContribution > 0) {
        const contributionStartDate = new Date();
        const contributionMaturityDate = new Date(
          contributionStartDate
        );

        contributionMaturityDate.setDate(
          contributionMaturityDate.getDate() + 300
        );

        await tx.lockedSavingsContribution.create({
          data: {
            accountId: current.accountId,
            transactionId: current.id,
            amount: recordedContribution,
            startDate: contributionStartDate,
            maturityDate: contributionMaturityDate,
            status: "LOCKED",
            reference: `AZA-LOCK-${crypto.randomUUID()}`,
          },
        });
      }

      return {
        status: "COMPLETED",
        alreadyProcessed: false,
      };
    }

    // --------------------------------------------------
    // FAILED PAYSTACK TRANSFER
    // --------------------------------------------------

    if (outcome === "failed") {
      // Only pending transfers can become failed.
      // A delayed failure event must not overwrite a
      // completed or reversed transfer.
      if (current.status !== "PENDING") {
        return {
          status: current.status,
          alreadyProcessed: true,
        };
      }

      const claimed = await tx.transaction.updateMany({
        where: {
          id: current.id,
          status: "PENDING",
        },
        data: {
          status: "FAILED",
        },
      });

      if (claimed.count !== 1) {
        const latest = await tx.transaction.findUnique({
          where: {
            id: current.id,
          },
        });

        return {
          status: latest?.status ?? current.status,
          alreadyProcessed: true,
        };
      }

      return {
        status: "FAILED",
        alreadyProcessed: false,
      };
    }

    // --------------------------------------------------
    // REVERSE A TRANSFER THAT NEVER SETTLED
    // --------------------------------------------------

    if (current.status === "PENDING") {
      const claimed = await tx.transaction.updateMany({
        where: {
          id: current.id,
          status: "PENDING",
        },
        data: {
          status: "REVERSED",
        },
      });

      if (claimed.count !== 1) {
        const latest = await tx.transaction.findUnique({
          where: {
            id: current.id,
          },
        });

        return {
          status: latest?.status ?? current.status,
          alreadyProcessed: true,
        };
      }

      // No transfer debit or savings contribution was made,
      // so there is no balance to restore.
      return {
        status: "REVERSED",
        alreadyProcessed: false,
      };
    }

    // --------------------------------------------------
    // REVERSE A COMPLETED TRANSFER
    // --------------------------------------------------

    if (current.status === "COMPLETED") {
      const contribution = Number(
        current.lockedSavingsContribution
      );

      if (
        !Number.isFinite(contribution) ||
        contribution < 0
      ) {
        throw new Error(
          "Invalid Locked Savings contribution."
        );
      }

      // Validate the individual contribution before changing
      // the transfer or account balances.
      let contributionRecord = null;

      if (contribution > 0) {
        contributionRecord =
          await tx.lockedSavingsContribution.findUnique({
            where: {
              transactionId: current.id,
            },
          });

        // Do not subtract from an unrelated aggregate savings
        // balance when the original contribution record is
        // missing. This requires manual reconciliation.
        if (!contributionRecord) {
          throw new Error(
            "Locked Savings contribution record is missing. Manual reconciliation required."
          );
        }

        const contributionInKobo = Math.round(
          Number(contributionRecord.amount) * 100
        );

        const expectedContributionInKobo = Math.round(
          contribution * 100
        );

        if (
          contributionInKobo !== expectedContributionInKobo
        ) {
          throw new Error(
            "Locked Savings contribution amount is inconsistent. Manual reconciliation required."
          );
        }

        // Matured or otherwise changed contributions must not
        // be silently withdrawn or reversed.
        if (contributionRecord.status !== "LOCKED") {
          throw new Error(
            "Locked Savings contribution is no longer locked. Manual reconciliation required."
          );
        }

        const savings = await tx.savings.findUnique({
          where: {
            accountId: current.accountId,
          },
        });

        if (
          !savings ||
          Number(savings.amount) < contribution
        ) {
          throw new Error(
            "Locked Savings aggregate balance is insufficient for reversal. Manual reconciliation required."
          );
        }
      }

      // Claim the completed transfer reversal exactly once.
      const claimed = await tx.transaction.updateMany({
        where: {
          id: current.id,
          status: "COMPLETED",
        },
        data: {
          status: "REVERSED",
        },
      });

      if (claimed.count !== 1) {
        const latest = await tx.transaction.findUnique({
          where: {
            id: current.id,
          },
        });

        return {
          status: latest?.status ?? current.status,
          alreadyProcessed: true,
        };
      }

      // Mark the individual contribution as reversed.
      if (contributionRecord && contribution > 0) {
        const contributionClaim =
          await tx.lockedSavingsContribution.updateMany({
            where: {
              id: contributionRecord.id,
              status: "LOCKED",
            },
            data: {
              status: "REVERSED",
              reversedAt: new Date(),
            },
          });

        if (contributionClaim.count !== 1) {
          throw new Error(
            "Locked Savings contribution reversal claim failed."
          );
        }

        // Remove only this transfer's contribution from
        // the aggregate Locked Savings amount.
        const savingsUpdate = await tx.savings.updateMany({
          where: {
            accountId: current.accountId,
            amount: {
              gte: contribution,
            },
          },
          data: {
            amount: {
              decrement: contribution,
            },
          },
        });

        if (savingsUpdate.count !== 1) {
          throw new Error(
            "Locked Savings reversal requires manual reconciliation."
          );
        }
      }

      // Restore the original transfer amount and, if applicable,
      // the reversed Locked Savings contribution.
      await tx.account.update({
        where: {
          id: current.accountId,
        },
        data: {
          balance: {
            increment: transferAmount + contribution,
          },
        },
      });

      return {
        status: "REVERSED",
        alreadyProcessed: false,
      };
    }

    // Already failed, reversed, or otherwise finalized.
    return {
      status: current.status,
      alreadyProcessed: true,
    };
  });
}
