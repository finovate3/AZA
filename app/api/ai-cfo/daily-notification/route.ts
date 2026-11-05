import { NextResponse } from "next/server";
import { prisma } from "../../../prisma";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        {
          error: "CRON_SECRET is not configured.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    /*
     * AZA currently schedules the daily CFO notification
     * for 10:00 AM Nigeria time (WAT = UTC+1).
     *
     * 10:00 AM WAT = 09:00 UTC.
     *
     * Using a fixed scheduledAt value for the day also lets us
     * detect duplicate cron executions safely.
     */
    const now = new Date();

    const scheduledAt = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        9,
        0,
        0,
        0
      )
    );

    const users = await prisma.user.findMany({
      where: {
        account: {
          isNot: null,
        },
      },
      include: {
        account: {
          include: {
            savings: true,
            rainyDaySavings: true,
          },
        },
      },
    });

    const results = [];

    for (const user of users) {
      if (!user.account) {
        continue;
      }

      const account = user.account;

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(
        yesterdayStart.getDate() - 1
      );

      const transactions =
        await prisma.transaction.findMany({
          where: {
            accountId: account.id,
            createdAt: {
              gte: yesterdayStart,
              lt: todayStart,
            },
            status: "COMPLETED",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      const spendingTypes = new Set([
        "SENT",
        "BILL PAYMENT",
        "CARD PAYMENT",
        "SUBSCRIPTION PAYMENT",
      ]);

      const moneyInTypes = new Set([
        "TOP UP",
        "RECEIVED",
      ]);

      const spending = transactions
        .filter((transaction) =>
          spendingTypes.has(transaction.type)
        )
        .reduce(
          (total, transaction) =>
            total + Number(transaction.amount),
          0
        );

      const moneyIn = transactions
        .filter((transaction) =>
          moneyInTypes.has(transaction.type)
        )
        .reduce(
          (total, transaction) =>
            total + Number(transaction.amount),
          0
        );

      const balance = Number(account.balance);

      const lockedSavings = account.savings
        ? Number(account.savings.amount)
        : 0;

      const rainyDaySavings =
        account.rainyDaySavings.reduce(
          (total, saving) =>
            total + Number(saving.amount),
          0
        );

      let focus =
        "Maintain your current financial position.";

      if (balance <= 0) {
        focus =
          "Protect your available balance and avoid unnecessary spending.";
      } else if (spending > balance) {
        focus =
          "Watch your spending closely today.";
      } else if (rainyDaySavings === 0) {
        focus =
          "Consider building your Rainy Day Savings.";
      } else {
        focus =
          "Keep your spending controlled and continue building your savings.";
      }

      const firstName =
        user.name.trim().split(" ")[0] || "there";

      const message = [
        `Good morning ${firstName}.`,
        `Yesterday you spent ${formatNaira(spending)} and received ${formatNaira(moneyIn)}.`,
        `Your current available balance is ${formatNaira(balance)}.`,
        `Your Rainy Day Savings is ${formatNaira(
          rainyDaySavings
        )}, while Locked Savings is ${formatNaira(
          lockedSavings
        )}.`,
        `Today's CFO focus: ${focus}`,
      ].join(" ");

      const channels = [
  {
    channel: "EMAIL",
    enabled:
      user.emailNotifications &&
      Boolean(user.email),
  },
  {
    channel: "SMS",
    enabled:
      user.smsNotifications &&
      Boolean(user.phone),
  },
  {
    channel: "WHATSAPP",
    enabled:
      user.whatsappNotifications &&
      Boolean(user.phone),
  },
];

      const notificationResults = [];

      for (const channel of channels) {
        if (!channel.enabled) {
          continue;
        }

        /*
         * Prevent duplicate daily notifications.
         *
         * If this endpoint is accidentally triggered twice,
         * AZA will find the existing notification instead of
         * creating another one.
         */
        const existingNotification =
          await prisma.notification.findFirst({
            where: {
              userId: user.id,
              channel: channel.channel,
              type: "AI_CFO_DAILY",
              scheduledAt,
            },
          });

        if (existingNotification) {
          notificationResults.push({
            channel: channel.channel,
            notificationId: existingNotification.id,
            status: "ALREADY_EXISTS",
          });

          continue;
        }

        const notification =
          await prisma.notification.create({
            data: {
              userId: user.id,
              channel: channel.channel,
              type: "AI_CFO_DAILY",
              title: "Your AZA Daily CFO Brief",
              message,
              status: "PENDING",
              scheduledAt,
            },
          });

        notificationResults.push({
          channel: channel.channel,
          notificationId: notification.id,
          status: "CREATED",
        });
      }

      results.push({
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        channels: {
          email: Boolean(user.email),
          sms: Boolean(user.phone),
          whatsapp: Boolean(user.phone),
        },
        message,
        financialSummary: {
          balance,
          yesterdaySpending: spending,
          yesterdayMoneyIn: moneyIn,
          rainyDaySavings,
          lockedSavings,
        },
        notificationRecords: notificationResults,
      });
    }

    const notificationsCreated = results.reduce(
      (total, result) =>
        total +
        result.notificationRecords.filter(
          (notification) =>
            notification.status === "CREATED"
        ).length,
      0
    );

    const notificationsAlreadyExisting =
      results.reduce(
        (total, result) =>
          total +
          result.notificationRecords.filter(
            (notification) =>
              notification.status === "ALREADY_EXISTS"
          ).length,
        0
      );

    return NextResponse.json({
      success: true,
      scheduledFor: "10:00",
      scheduledAt: scheduledAt.toISOString(),
      generatedAt: new Date().toISOString(),
      totalUsers: users.length,
      notificationsCreated,
      notificationsAlreadyExisting,
      results,
    });
  } catch (error) {
    console.error(
      "AI_CFO_DAILY_NOTIFICATION_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to generate daily AI CFO notifications.",
      },
      { status: 500 }
    );
  }
}