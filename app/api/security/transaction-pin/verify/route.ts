
import { NextResponse } from "next/server";
import crypto from "crypto";
import { promisify } from "util";
import { prisma } from "../../../../prisma";

const scryptAsync = promisify(crypto.scrypt);

function getSessionToken(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("aza_session="))
    ?.split("=")
    .slice(1)
    .join("=");
}

async function verifyPin(pin: string, storedHash: string) {
  const [saltHex, hashHex] = storedHash.split(":");

  if (!saltHex || !hashHex || !/^[0-9a-f]+$/i.test(saltHex) ||
      !/^[0-9a-f]+$/i.test(hashHex)) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const storedKey = Buffer.from(hashHex, "hex");

  if (salt.length === 0 || storedKey.length === 0) {
    return false;
  }

  const derivedKey = (await scryptAsync(
    pin,
    salt,
    storedKey.length
  )) as Buffer;

  return (
    derivedKey.length === storedKey.length &&
    crypto.timingSafeEqual(derivedKey, storedKey)
  );
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate the current session.
    const sessionToken = getSessionToken(request);

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    // 2. Validate the submitted PIN and transfer reference.
    const body = await request.json();

    const reference =
      typeof body.reference === "string"
        ? body.reference.trim()
        : "";

    const pin =
      typeof body.pin === "string"
        ? body.pin.trim()
        : "";

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Transfer reference is required.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter your 4-digit transaction PIN.",
        },
        { status: 400 }
      );
    }

    // 3. Find a transfer owned by this user.
    const transfer = await prisma.transaction.findFirst({
      where: {
        reference,
        type: "Sent",
        account: {
          userId: session.user.id,
        },
      },
      select: {
        id: true,
        reference: true,
        status: true,
        riskLevel: true,
        reviewStatus: true,
        pinVerifiedAt: true,
        pinChallengeExpiresAt: true,
        transferInitiationClaimedAt: true,
      },
    });

    if (!transfer) {
      return NextResponse.json(
        {
          success: false,
          error: "Transfer not found.",
        },
        { status: 404 }
      );
    }

    // 4. Enforce transfer status and security restrictions.
    if (transfer.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: "This transfer is no longer awaiting authorization.",
        },
        { status: 409 }
      );
    }

    if (transfer.transferInitiationClaimedAt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This transfer has already entered processing and cannot receive another PIN authorization.",
        },
        { status: 409 }
      );
    }

    if (
      transfer.riskLevel === "HIGH" ||
      (
        transfer.reviewStatus === "PENDING" &&
        transfer.riskLevel !== "MEDIUM"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This transfer is on security hold and cannot be authorized with a PIN alone.",
        },
        { status: 403 }
      );
    }

    if (
      !transfer.pinChallengeExpiresAt ||
      transfer.pinChallengeExpiresAt <= new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This PIN challenge has expired. Please start a new transfer.",
        },
        { status: 410 }
      );
    }

    if (transfer.pinVerifiedAt) {
      return NextResponse.json(
        {
          success: false,
          error: "This transfer has already been PIN-authorized.",
        },
        { status: 409 }
      );
    }

    const user = session.user;

    if (!user.transactionPinHash) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction PIN has not been set.",
        },
        { status: 400 }
      );
    }

    const initialPinHash = user.transactionPinHash;
    const now = new Date();

    if (
      user.transactionPinLockedUntil &&
      user.transactionPinLockedUntil > now
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Transaction PIN verification is temporarily locked. Please try again later.",
        },
        { status: 429 }
      );
    }

    // 5. Verify the submitted PIN against the stored hash.
    const valid = await verifyPin(pin, initialPinHash);

    if (!valid) {
      /*
       * Serialize failed-attempt updates by locking the
       * user row. This prevents concurrent requests from
       * overwriting each other's attempt counters.
       */
      const failureResult = await prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`
            SELECT "id"
            FROM "User"
            WHERE "id" = ${user.id}
            FOR UPDATE
          `;

          const freshUser = await tx.user.findUnique({
            where: { id: user.id },
            select: {
              transactionPinHash: true,
              transactionPinFailedAttempts: true,
              transactionPinLockedUntil: true,
            },
          });

          if (
            !freshUser ||
            freshUser.transactionPinHash !== initialPinHash
          ) {
            return { outcome: "CHANGED" as const };
          }

          const failureTime = new Date();

          if (
            freshUser.transactionPinLockedUntil &&
            freshUser.transactionPinLockedUntil > failureTime
          ) {
            return { outcome: "LOCKED" as const };
          }

          const failedAttempts =
            freshUser.transactionPinFailedAttempts + 1;

          if (failedAttempts >= 5) {
            await tx.user.update({
              where: { id: user.id },
              data: {
                transactionPinFailedAttempts: 0,
                transactionPinLockedUntil: new Date(
                  failureTime.getTime() + 15 * 60 * 1000
                ),
              },
            });

            return { outcome: "LOCKED_NOW" as const };
          }

          await tx.user.update({
            where: { id: user.id },
            data: {
              transactionPinFailedAttempts: failedAttempts,
            },
          });

          return {
            outcome: "INVALID" as const,
            attemptsRemaining: 5 - failedAttempts,
          };
        }
      );

      if (failureResult.outcome === "LOCKED" ||
          failureResult.outcome === "LOCKED_NOW") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Too many incorrect PIN attempts or verification is already locked. Please try again later.",
          },
          { status: 429 }
        );
      }

      if (failureResult.outcome === "CHANGED") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Your transaction PIN changed during verification. Please try again.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Incorrect transaction PIN.",
          attemptsRemaining: failureResult.attemptsRemaining,
        },
        { status: 401 }
      );
    }

    // 6. Authorize the exact transfer atomically.
    const authorization = await prisma.$transaction(
      async (tx) => {
        /*
         * Lock the user row so successful authorization
         * cannot race with a concurrent PIN lockout.
         */
        await tx.$queryRaw`
          SELECT "id"
          FROM "User"
          WHERE "id" = ${user.id}
          FOR UPDATE
        `;

        const freshUser = await tx.user.findUnique({
          where: { id: user.id },
          select: {
            transactionPinHash: true,
            transactionPinLockedUntil: true,
          },
        });

        const authorizationTime = new Date();

        if (
          !freshUser ||
          freshUser.transactionPinHash !== initialPinHash
        ) {
          return { outcome: "CHANGED" as const };
        }

        if (
          freshUser.transactionPinLockedUntil &&
          freshUser.transactionPinLockedUntil > authorizationTime
        ) {
          return { outcome: "LOCKED" as const };
        }

        /*
         * The conditions make authorization one-time,
         * challenge-bound, and unavailable after the
         * Paystack initiation claim has been set.
         */
        const result = await tx.transaction.updateMany({
          where: {
            id: transfer.id,
            reference,
            account: {
              userId: user.id,
            },
            type: "Sent",
            status: "PENDING",
            pinVerifiedAt: null,
            pinChallengeExpiresAt: {
              gt: authorizationTime,
            },
            transferInitiationClaimedAt: null,
          },
          data: {
            pinVerifiedAt: authorizationTime,
          },
        });

        if (result.count !== 1) {
          return { outcome: "NOT_AUTHORIZED" as const };
        }

        // Reset failed attempts only after successful authorization.
        await tx.user.update({
          where: { id: user.id },
          data: {
            transactionPinFailedAttempts: 0,
            transactionPinLockedUntil: null,
          },
        });

        return { outcome: "AUTHORIZED" as const };
      }
    );

    if (authorization.outcome === "LOCKED") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Transaction PIN verification is temporarily locked. Please try again later.",
        },
        { status: 429 }
      );
    }

    if (authorization.outcome === "CHANGED") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your transaction PIN changed during verification. Please try again.",
        },
        { status: 409 }
      );
    }

    if (authorization.outcome !== "AUTHORIZED") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This transfer has changed, expired, or already been authorized. Refresh and check its status.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      reference: transfer.reference,
      message: "PIN verified for this transfer.",
    });
  } catch (error) {
    console.error("TRANSACTION_PIN_VERIFY_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to verify transaction PIN.",
      },
      { status: 500 }
    );
  }
}
