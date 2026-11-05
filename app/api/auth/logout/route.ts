import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../prisma";

function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";

    const sessionToken = cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("aza_session="))
      ?.split("=")
      .slice(1)
      .join("=");

    if (sessionToken) {
      const tokenHash = hashToken(sessionToken);

      await prisma.session.deleteMany({
        where: {
          tokenHash,
        },
      });
    }

    const response = NextResponse.json({
      message: "Logout successful",
    });

    response.cookies.set("aza_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("LOGOUT_ERROR:", error);

    return NextResponse.json(
      { error: "Something went wrong while logging out" },
      { status: 500 }
    );
  }
}