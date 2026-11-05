
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../../prisma";

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      reference: string;
    }>;
  }
) {
  try {
    // 1. Authenticate the current user.
    const cookieHeader = request.headers.get("cookie") || "";

    const sessionToken = cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("aza_session="))
      ?.split("=")
      .slice(1)
      .join("=");

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
      include: {
        user: {
          include: { account: true },
        },
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const account = session.user.account;

    if (!account) {
      return NextResponse.json(
        { success: false, error: "AZA account not found." },
        { status: 404 }
      );
    }

    // 2. Resolve the requested transfer.
    const { reference } = await context.params;

    if (!reference?.trim()) {
      return NextResponse.json(
        { success: false, error: "Invalid transfer reference." },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        reference,
        accountId: account.id,
        type: "Sent",
      },
      select: {
        id: true,
        reference: true,
        status: true,
        reviewStatus: true,
        transferInitiationClaimedAt: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "Transfer not found." },
        { status: 404 }
      );
    }

    // 3. Never cancel a transfer already claimed for Paystack.
    if (transaction.transferInitiationClaimedAt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This transfer has entered processing and cannot be cancelled here. Its status must be confirmed through reconciliation.",
          reference,
          requiresReconciliation: true,
        },
        { status: 409 }
      );
    }

    // 4. Atomically cancel only a transfer still awaiting review.
    const cancellation = await prisma.transaction.updateMany({
      where: {
        id: transaction.id,
        accountId: account.id,
        type: "Sent",
        status: "PENDING",
        reviewStatus: "PENDING",
        transferInitiationClaimedAt: null,
      },
      data: {
        status: "FAILED",
        reviewStatus: "REJECTED",
      },
    });

    if (cancellation.count !== 1) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This transfer has changed or entered processing. Refresh and check its latest status.",
          reference,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transfer cancelled successfully.",
      transaction: {
        reference,
        status: "FAILED",
        reviewStatus: "REJECTED",
      },
    });
  } catch (error) {
    console.error("TRANSFER_REVIEW_REJECTION_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to cancel transfer.",
      },
      { status: 500 }
    );
  }
}
