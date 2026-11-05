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
                rainyDaySavings: {
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

    const rainyDaySavings = account.rainyDaySavings;

    const totalAmount = rainyDaySavings.reduce(
      (total, saving) => total + Number(saving.amount),
      0
    );

    return NextResponse.json({
      totalAmount: totalAmount.toString(),

      savings: rainyDaySavings.map((saving) => ({
        id: saving.id,
        amount: saving.amount.toString(),
        reference: saving.reference,
        status: saving.status,
        createdAt: saving.createdAt,
        updatedAt: saving.updatedAt,
      })),
    });
  } catch (error) {
    console.error("RAINY_DAY_SAVINGS_GET_ERROR:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while retrieving Rainy Day Savings.",
      },
      { status: 500 }
    );
  }
}

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

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Enter a valid Rainy Day Savings amount." },
        { status: 400 }
      );
    }

    if (amount > Number(account.balance)) {
      return NextResponse.json(
        {
          error: "Insufficient balance for this Rainy Day Savings deposit.",
        },
        { status: 400 }
      );
    }

    const reference = `AZA-RDS-${crypto.randomUUID()}`;

    const result = await prisma.$transaction(async (tx) => {
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

      const rainyDaySaving = await tx.rainyDaySavings.create({
        data: {
          accountId: account.id,
          amount,
          status: "ACTIVE",
          reference,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          accountId: account.id,
          type: "Rainy Day Savings",
          amount: -amount,
          currency: account.currency,
          status: "COMPLETED",
          description: "Rainy Day Savings deposit",
          recipient: "AZA Rainy Day Savings",
          reference,
        },
      });

      return {
        account: updatedAccount,
        rainyDaySaving,
        transaction,
      };
    });

    return NextResponse.json({
      message: "Rainy Day Savings deposit successful",

      account: {
        id: result.account.id,
        balance: result.account.balance.toString(),
        currency: result.account.currency,
      },

      savings: {
        id: result.rainyDaySaving.id,
        amount: result.rainyDaySaving.amount.toString(),
        status: result.rainyDaySaving.status,
        reference: result.rainyDaySaving.reference,
        createdAt: result.rainyDaySaving.createdAt,
      },

      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount.toString(),
        type: result.transaction.type,
        status: result.transaction.status,
        reference: result.transaction.reference,
        createdAt: result.transaction.createdAt,
      },
    });
  } catch (error) {
    console.error("RAINY_DAY_SAVINGS_POST_ERROR:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while creating the Rainy Day Savings deposit.",
      },
      { status: 500 }
    );
  }
}