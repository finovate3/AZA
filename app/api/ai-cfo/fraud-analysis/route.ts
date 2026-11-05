import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../prisma";
import { generateFinancialAnalysis } from "../../../ai";

function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function getSessionToken(request: Request) {
  const cookieHeader =
    request.headers.get("cookie") ?? "";

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

    const transactions =
      await prisma.transaction.findMany({
        where: {
          accountId: account.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      });

    const transactionData =
      transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
        recipient: transaction.recipient,
        reference: transaction.reference,
        createdAt: transaction.createdAt,
      }));

    const analysis =
      await generateFinancialAnalysis(`
You are AZA's transaction risk intelligence engine.

Review the user's recent transaction activity for potential anomalies or suspicious patterns.

IMPORTANT:
- Do NOT declare a transaction fraudulent based only on this data.
- Do NOT accuse the user or recipient of criminal activity.
- Identify patterns that may deserve review.
- A high-risk result means "AZA should review this activity", not "fraud confirmed".
- Consider transaction amount, frequency, status, timing, repeated references or recipients, unusual spending patterns, and sudden changes.
- Normal repeated transactions should not automatically be considered suspicious.
- Missing information should reduce confidence rather than being treated as evidence.
- Do not invent facts.

Return a concise risk assessment containing:

Risk level:
LOW, MEDIUM, or HIGH

Confidence:
LOW, MEDIUM, or HIGH

Summary:
One short explanation.

Signals:
The specific transaction patterns that caused concern.

Recommended action:
A practical next step for AZA.

Current AZA balance:

${Number(account.balance)}

Recent transactions:

${JSON.stringify(
  transactionData,
  null,
  2
)}
`);

    return NextResponse.json({
      success: true,
      analysis:
        analysis.trim() ||
        "No additional risk analysis is currently available.",
      transactionCount:
        transactionData.length,
    });
  } catch (error) {
    console.error(
      "AI_CFO_FRAUD_ANALYSIS_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to perform fraud analysis right now.",
      },
      { status: 500 }
    );
  }
}