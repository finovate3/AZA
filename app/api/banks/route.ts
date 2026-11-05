import { NextResponse } from "next/server";

export async function GET() {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Paystack secret key is not configured.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.paystack.co/bank?country=nigeria&perPage=100",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error("PAYSTACK_BANKS_ERROR:", data);

      return NextResponse.json(
        {
          success: false,
          error:
            data.message ||
            "Unable to retrieve banks from Paystack.",
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      banks: data.data,
    });
  } catch (error) {
    console.error("BANKS_ROUTE_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve banks.",
      },
      { status: 500 }
    );
  }
}