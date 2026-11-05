import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "../../../../prisma";

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("aza_session")?.value;

  if (!sessionToken) {
    return null;
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  const session = await prisma.session.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: {
        emailNotifications: user.emailNotifications,
        smsNotifications: user.smsNotifications,
        whatsappNotifications: user.whatsappNotifications,
      },
    });
  } catch (error) {
    console.error(
      "NOTIFICATION_PREFERENCES_GET_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const updateData: {
      emailNotifications?: boolean;
      smsNotifications?: boolean;
      whatsappNotifications?: boolean;
    } = {};

    if (typeof body.emailNotifications === "boolean") {
      updateData.emailNotifications =
        body.emailNotifications;
    }

    if (typeof body.smsNotifications === "boolean") {
      updateData.smsNotifications =
        body.smsNotifications;
    }

    if (typeof body.whatsappNotifications === "boolean") {
      updateData.whatsappNotifications =
        body.whatsappNotifications;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error: "No valid notification preferences supplied.",
        },
        { status: 400 }
      );
    }

    if (
      updateData.smsNotifications === true &&
      !user.phone
    ) {
      return NextResponse.json(
        {
          error:
            "Add a phone number before enabling SMS notifications.",
        },
        { status: 400 }
      );
    }

    if (
      updateData.whatsappNotifications === true &&
      !user.phone
    ) {
      return NextResponse.json(
        {
          error:
            "Add a phone number before enabling WhatsApp notifications.",
        },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: updateData,
      select: {
        emailNotifications: true,
        smsNotifications: true,
        whatsappNotifications: true,
      },
    });

    return NextResponse.json({
      success: true,
      preferences: updatedUser,
    });
  } catch (error) {
    console.error(
      "NOTIFICATION_PREFERENCES_PATCH_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}