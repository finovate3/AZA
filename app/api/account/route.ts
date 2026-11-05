import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../prisma";

function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function GET(request: Request) {
  try {
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

    return NextResponse.json({
      account: {
        id: account.id,
        balance: account.balance.toString(),
        currency: account.currency,
      },
    });
  } catch (error) {
    console.error("ACCOUNT_GET_ERROR:", error);

    return NextResponse.json(
      { error: "Something went wrong while retrieving your account" },
      { status: 500 }
    );
  }
}