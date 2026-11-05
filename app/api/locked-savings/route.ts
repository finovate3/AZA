
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../prisma";

function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

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
            account: {
              include: {
                savings: true,
                lockedSavingsContributions: {
                  orderBy: {
                    createdAt: "desc",
                  },
                },
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

    const savings = account.savings;
    const contributions = account.lockedSavingsContributions;

    const totalContributions = (
  contributions
    .filter((contribution) => contribution.status !== "REVERSED")
    .reduce(
      (total, contribution) =>
        total + Math.round(Number(contribution.amount.toString()) * 100),
      0
    ) / 100
).toFixed(2);

const totalReversedContributions = (
  contributions
    .filter((contribution) => contribution.status === "REVERSED")
    .reduce(
      (total, contribution) =>
        total + Math.round(Number(contribution.amount.toString()) * 100),
      0
    ) / 100
).toFixed(2);

    return NextResponse.json({
      savings: savings
        ? {
            id: savings.id,
            amount: savings.amount.toString(),
            targetAmount: savings.targetAmount.toString(),
            interestRate: savings.interestRate.toString(),
            lockPeriodDays: savings.lockPeriodDays,
            startDate: savings.startDate,
            maturityDate: savings.maturityDate,
            status: savings.status,
            reference: savings.reference,
            createdAt: savings.createdAt,
            updatedAt: savings.updatedAt,
          }
        : null,

      contributions: contributions.map((contribution) => ({
        id: contribution.id,
        transactionId: contribution.transactionId,
        amount: contribution.amount.toString(),
        startDate: contribution.startDate,
        maturityDate: contribution.maturityDate,
        status: contribution.status,
        reference: contribution.reference,
        reversedAt: contribution.reversedAt,
        createdAt: contribution.createdAt,
        updatedAt: contribution.updatedAt,
      })),

      totalContributions,
      contributionCount: contributions.length,
    });
  } catch (error) {
    console.error("LOCKED_SAVINGS_GET_ERROR:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while retrieving Locked Savings.",
      },
      { status: 500 }
    );
  }
}
