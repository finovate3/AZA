import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../prisma";

export async function GET(request: Request) {
  try {
    const cookieHeader =
      request.headers.get("cookie") || "";

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
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const session =
      await prisma.session.findUnique({
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

    if (
      !session ||
      session.expiresAt <= new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const account = session.user.account;

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: "AZA account not found.",
        },
        { status: 404 }
      );
    }

    const transactions =
      await prisma.transaction.findMany({
        where: {
          accountId: account.id,
          reviewStatus: "PENDING",
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      success: true,
      count: transactions.length,
      transactions: transactions.map(
        (transaction) => ({
          id: transaction.id,
          reference:
            transaction.reference,
          amount:
            Number(transaction.amount),
          currency:
            transaction.currency,
          type: transaction.type,
          status:
            transaction.status,
          riskLevel:
            transaction.riskLevel,
          reviewStatus:
            transaction.reviewStatus,
          recipient:
            transaction.recipient,
          description:
            transaction.description,
          createdAt:
            transaction.createdAt,
        })
      ),
    });
  } catch (error) {
    console.error(
      "TRANSFER_REVIEW_GET_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load transfer reviews.",
      },
      { status: 500 }
    );
  }
}