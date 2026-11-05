import { prisma } from "../../../prisma";
import crypto from "crypto";

function hashPassword(password: string) {
  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const tag = body.tag?.trim();

    if (!name || !email || !password || !tag) {
      return Response.json(
        {
          error: "name, email, password, and tag are required",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        {
          error: "Password must be at least 8 characters",
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { tag },
        ],
      },
    });

    if (existingUser) {
      return Response.json(
        {
          error: "A user with this email or tag already exists",
        },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        tag,
        passwordHash,
        account: {
          create: {
            balance: 0,
            currency: "NGN",
          },
        },
      },
      include: {
        account: true,
      },
    });

    return Response.json(
      {
        message: "Account created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          tag: user.tag,
          isVerified: user.isVerified,
          onboardingComplete: user.onboardingComplete,
          account: user.account,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup failed:", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}