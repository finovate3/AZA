import { prisma } from "../../prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        account: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({
      users,
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);

    return Response.json(
      {
        error: "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const tag = body.tag?.trim();

    if (!name || !email || !tag) {
      return Response.json(
        {
          error: "name, email, and tag are required",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        tag,
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
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create user:", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}