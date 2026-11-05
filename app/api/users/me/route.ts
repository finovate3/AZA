import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../prisma";

function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

async function getAuthenticatedUser(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  const sessionToken = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("aza_session="))
    ?.split("=")
    .slice(1)
    .join("=");

  if (!sessionToken) {
    return null;
  }

  const tokenHash = hashToken(sessionToken);

  const session = await prisma.session.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        tag: user.tag,
        isVerified: user.isVerified,
        onboardingComplete: user.onboardingComplete,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("USER_ME_ERROR:", error);

    return NextResponse.json(
      { error: "Something went wrong while loading your profile" },
      { status: 500 }
    );
  }
}