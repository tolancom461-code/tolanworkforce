import webpush from "web-push";
import * as db from "./db";
import { notifications, pushSubscriptions, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@tolanworkforce.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export type NotificationType = 'success' | 'warning' | 'info' | 'error';

/**
 * Send a notification to a specific user
 * Stores in DB and attempts Web Push
 */
export async function sendNotification(params: {
  userId: number;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}) {
  try {
    const database = await db.getDb();
    if (!database) return;

    // 1. Store in Database
    await database.insert(notifications).values({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || 'info',
      link: params.link,
      isRead: 0,
    });

    // 2. Send Web Push if keys are configured
    if (vapidPublicKey && vapidPrivateKey) {
      const subs = await database
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, params.userId));

      const pushPayload = JSON.stringify({
        title: params.title,
        body: params.message,
        url: params.link || '/',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
      });

      // Send to all registered devices for this user
      const pushPromises = subs.map(async (sub) => {
        try {
          const pushConfig = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };
          await webpush.sendNotification(pushConfig, pushPayload);
        } catch (error: any) {
          console.error(`[Push] Failed to send to subscription ${sub.id}:`, error.statusCode);
          // If subscription is expired or invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await database.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
          }
        }
      });

      await Promise.all(pushPromises);
    }
  } catch (error) {
    console.error('[Notification] Error sending notification:', error);
  }
}

/**
 * Send notification to multiple users based on their role
 */
export async function sendNotificationToRole(params: {
  role: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}) {
  try {
    const database = await db.getDb();
    if (!database) return;

    const targetUsers = await database
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, params.role as any), eq(users.isActive, 1)));

    for (const user of targetUsers) {
      await sendNotification({
        userId: user.id,
        title: params.title,
        message: params.message,
        type: params.type,
        link: params.link,
      });
    }
  } catch (error) {
    console.error('[Notification] Error sending to role:', error);
  }
}
