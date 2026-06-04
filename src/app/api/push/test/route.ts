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

  const raw = await redis.hgetall("push:subs");
  if (!raw) return NextResponse.json({ results: [], total: 0 });

  const entries = Object.entries(raw as Record<string, unknown>);

  const results = await Promise.all(
    entries.map(async ([endpoint, value]) => {
      const shortEndpoint = endpoint.slice(0, 50) + "...";
      let stored: { subscription: webpush.PushSubscription; threshold: number };
      try {
        stored = typeof value === "string" ? JSON.parse(value) : (value as typeof stored);
      } catch {
        return { endpoint: shortEndpoint, status: "parse_error" };
      }

      try {
        await webpush.sendNotification(
          stored.subscription,
          JSON.stringify({
            title: "⚡ Test push upozorenje",
            body: "Push notifikacije rade ispravno!",
            tag: "push-test",
          })
        );
        return { endpoint: shortEndpoint, threshold: stored.threshold, status: "sent" };
      } catch (err) {
        const e = err as { statusCode?: number; body?: string; message?: string };
        if (e.statusCode === 404 || e.statusCode === 410) {
          await redis.hdel("push:subs", endpoint);
        }
        return {
          endpoint: shortEndpoint,
          threshold: stored.threshold,
          status: "failed",
          statusCode: e.statusCode,
          error: e.body ?? e.message,
        };
      }
    })
  );

  return NextResponse.json({ total: entries.length, results });
}
