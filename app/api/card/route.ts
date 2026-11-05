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

function generateCardNumber() {
  return Array.from({ length: 4 }, () =>
    Math.floor(1000 + Math.random() * 9000)
  ).join("");
}

function generateCVV() {
  return Math.floor(100 + Math.random() * 900).toString();
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
                card: true,
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

    let card = account.card;

    if (!card) {
      const now = new Date();

      card = await prisma.card.create({
        data: {
          accountId: account.id,
          cardNumber: generateCardNumber(),
          expiryMonth: now.getMonth() + 1,
          expiryYear: now.getFullYear() + 3,
          cvv: generateCVV(),
          cardholderName: session.user.name.toUpperCase(),
          type: "VIRTUAL",
          status: "ACTIVE",
          spendingLimit: 500000,
        },
      });
    }

    return NextResponse.json({
      card: {
        id: card.id,
        cardNumber: card.cardNumber,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        cvv: card.cvv,
        cardholderName: card.cardholderName,
        type: card.type,
        status: card.status,
        spendingLimit: card.spendingLimit.toString(),
        createdAt: card.createdAt,
      },
    });
  } catch (error) {
    console.error("CARD_GET_ERROR:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while retrieving the card.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
                card: true,
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

    const card = account.card;

    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const status = body.status;

    const spendingLimit =
      body.spendingLimit === undefined
        ? undefined
        : Number(body.spendingLimit);

    if (
      status !== undefined &&
      status !== "ACTIVE" &&
      status !== "FROZEN"
    ) {
      return NextResponse.json(
        { error: "Invalid card status." },
        { status: 400 }
      );
    }

    if (
      spendingLimit !== undefined &&
      (!Number.isFinite(spendingLimit) || spendingLimit <= 0)
    ) {
      return NextResponse.json(
        { error: "Invalid spending limit." },
        { status: 400 }
      );
    }

    if (status === undefined && spendingLimit === undefined) {
      return NextResponse.json(
        { error: "No card changes provided." },
        { status: 400 }
      );
    }

    const updatedCard = await prisma.card.update({
      where: {
        id: card.id,
      },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(spendingLimit !== undefined ? { spendingLimit } : {}),
      },
    });

    return NextResponse.json({
      message: "Card updated successfully",
      card: {
        id: updatedCard.id,
        status: updatedCard.status,
        spendingLimit: updatedCard.spendingLimit.toString(),
      },
    });
  } catch (error) {
    console.error("CARD_PATCH_ERROR:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while updating the card.",
      },
      { status: 500 }
    );
  }
}