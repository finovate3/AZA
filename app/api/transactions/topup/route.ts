import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../prisma";

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
    const method = body.method?.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "A valid top up amount is required" },
        { status: 400 }
      );
    }

    if (amount < 100) {
      return NextResponse.json(
        { error: "Minimum top up amount is 100" },
        { status: 400 }
      );
    }

    if (amount > 1000000) {
      return NextResponse.json(
        { error: "Maximum top up amount is 1,000,000" },
        { status: 400 }
      );
    }

    if (method !== "bank" && method !== "card") {
      return NextResponse.json(
        { error: "Invalid funding method" },
        { status: 400 }
      );
    }

    const reference = `AZA-TOP-${Math.floor(
      100000 + Math.random() * 900000
    )}`;

    const result = await prisma.$transaction(async (tx) => {
      const updatedAccount = await tx.account.update({
        where: {
          id: account.id,
        },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          accountId: account.id,
          type: "Top Up",
          amount,
          currency: account.currency,
          status: "COMPLETED",
          description:
            method === "bank"
              ? "Account funded by bank transfer"
              : "Account funded by debit card",
          reference,
        },
      });

      return {
        account: updatedAccount,
        transaction,
      };
    });

    return NextResponse.json({
      message: "Top up completed successfully",
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
        createdAt: result.transaction.createdAt,
      },
    });
  } catch (error) {
    console.error("TOP_UP_POST_ERROR:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while processing the top up",
      },
      { status: 500 }
    );
  }
}