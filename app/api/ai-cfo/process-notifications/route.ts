import { NextResponse } from "next/server";
import { prisma } from "../../../prisma";
import { deliverEmailNotification } from "../../../lib/notifications";

async function processNotifications(request: Request) {
  try {
    const authorization =
      request.headers.get("authorization");

    const expectedSecret =
      process.env.CRON_SECRET;

    if (
      !expectedSecret ||
      authorization !== `Bearer ${expectedSecret}`
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const now = new Date();

    const pendingNotifications =
      await prisma.notification.findMany({
        where: {
          status: "PENDING",
          scheduledAt: {
            lte: now,
          },
        },
        orderBy: {
          scheduledAt: "asc",
        },
        take: 100,
      });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    const results = [];

    for (const notification of pendingNotifications) {
      try {
        if (notification.channel === "EMAIL") {
          const result =
            await deliverEmailNotification(
              notification.id
            );

          if (
            result.status === "SENT" ||
            result.status === "ALREADY_SENT"
          ) {
            sent++;
          } else {
            skipped++;
          }

          results.push({
            notificationId: notification.id,
            channel: notification.channel,
            status: result.status,
          });

          continue;
        }

        if (
          notification.channel === "SMS" ||
          notification.channel === "WHATSAPP"
        ) {
          skipped++;

          results.push({
            notificationId: notification.id,
            channel: notification.channel,
            status: "PROVIDER_NOT_CONFIGURED",
          });

          continue;
        }

        skipped++;

        results.push({
          notificationId: notification.id,
          channel: notification.channel,
          status: "UNSUPPORTED_CHANNEL",
        });
      } catch (error) {
        failed++;

        results.push({
          notificationId: notification.id,
          channel: notification.channel,
          status: "FAILED",
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: pendingNotifications.length,
      sent,
      failed,
      skipped,
      results,
      processedAt: now,
    });
  } catch (error) {
    console.error(
      "AI_CFO_NOTIFICATION_PROCESSOR_ERROR:",
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

export async function POST(request: Request) {
    return processNotifications(request);
}

export async function GET(request: Request) {
    return processNotifications(request);
}