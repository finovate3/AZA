import { NextResponse } from "next/server";
import crypto from "crypto";
import { promisify } from "util";
import { prisma } from "../../../prisma";

const scryptAsync = promisify(crypto.scrypt);

function getSessionToken(request: Request) {
  const cookieHeader =
    request.headers.get("cookie") || "";

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) =>
      cookie.startsWith("aza_session=")
    )
    ?.split("=")
    .slice(1)
    .join("=");
}

async function hashPin(pin: string) {
  const salt = crypto.randomBytes(16);

  const derivedKey =
    (await scryptAsync(
      pin,
      salt,
      64
    )) as Buffer;

  return `${salt.toString("hex")}:${derivedKey.toString(
    "hex"
  )}`;
}

async function verifyPin(
  pin: string,
  storedHash: string
) {
  const [saltHex, hashHex] =
    storedHash.split(":");

  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(
    saltHex,
    "hex"
  );

  const storedKey = Buffer.from(
    hashHex,
    "hex"
  );

  const derivedKey =
    (await scryptAsync(
      pin,
      salt,
      storedKey.length
    )) as Buffer;

  if (
    derivedKey.length !==
    storedKey.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    derivedKey,
    storedKey
  );
}

export async function POST(
  request: Request
) {
  try {
    const sessionToken =
      getSessionToken(request);

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
          user: true,
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

    const body = await request.json();

    const pin = String(
      body.pin || ""
    ).trim();

    const confirmPin = String(
      body.confirmPin || ""
    ).trim();

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Transaction PIN must contain exactly 4 digits.",
        },
        { status: 400 }
      );
    }

    if (pin !== confirmPin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Transaction PINs do not match.",
        },
        { status: 400 }
      );
    }

    /*
     * If a PIN already exists, require the current
     * PIN before allowing it to be replaced.
     */
    if (session.user.transactionPinHash) {
      const currentPin = String(
        body.currentPin || ""
      ).trim();

      if (!/^\d{4}$/.test(currentPin)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Current transaction PIN is required.",
          },
          { status: 400 }
        );
      }

      const validCurrentPin =
        await verifyPin(
          currentPin,
          session.user.transactionPinHash
        );

      if (!validCurrentPin) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Current transaction PIN is incorrect.",
          },
          { status: 401 }
        );
      }
    }

    const transactionPinHash =
      await hashPin(pin);

    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        transactionPinHash,
        transactionPinSetAt:
          new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Transaction PIN set successfully.",
    });
  } catch (error) {
    console.error(
      "TRANSACTION_PIN_SETUP_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to set transaction PIN.",
      },
      { status: 500 }
    );
  }
}