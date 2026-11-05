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

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "A valid receive amount is required" },
        { status: 400 }
      );
    }

    if (amount > 1000000) {
      return NextResponse.json(
        { error: "Maximum receive amount is 1,000,000" },
        { status: 400 }
      );
    }

    const reference = `AZA-REC-${Math.floor(
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
          type: "Received",
          amount,
          currency: account.currency,
          status: "COMPLETED",
          description: "Incoming Transfer",
          recipient: "@Finovate_pay",
          reference,
        },
      });

      return {
        account: updatedAccount,
        transaction,
      };
    });

    return NextResponse.json({
      message: "Money received successfully",
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
    });
  } catch (error) {
    console.error("RECEIVE_POST_ERROR:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while processing the receive transaction",
      },
      { status: 500 }
    );
  }
}