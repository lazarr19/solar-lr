import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import webpush from "web-push";

export const runtime = "nodejs";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allSubs = await redis.hgetall<
    Record<string, { subscription: webpush.PushSubscription; threshold: number }>
  >("push:subs");

  if (!allSubs) return NextResponse.json({ sent: 0 });

  const results = await Promise.allSettled(
    Object.entries(allSubs).map(([endpoint, stored]) =>
      webpush.sendNotification(
        stored.subscription,
        JSON.stringify({
          title: "⚡ Test push upozorenje",
          body: "Push notifikacije rade ispravno!",
          tag: "push-test",
        })
      ).catch(async (err) => {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await redis.hdel("push:subs", endpoint);
        }
        throw err;
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent, total: Object.keys(allSubs).length });
}
