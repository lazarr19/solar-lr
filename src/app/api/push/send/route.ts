import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Receiver } from "@upstash/qstash";
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

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(request: Request) {
  const signature = request.headers.get("upstash-signature") ?? "";
  const body = await request.text();

  try {
    await receiver.verify({ signature, body });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { endpoint, title, body: notifBody, tag } = JSON.parse(body);

  const stored = await redis.hget<{ subscription: webpush.PushSubscription }>(
    "push:subs",
    endpoint
  );

  if (!stored) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  try {
    await webpush.sendNotification(
      stored.subscription,
      JSON.stringify({ title, body: notifBody, tag })
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await redis.hdel("push:subs", endpoint);
    }
    return NextResponse.json({ error: "Push failed" }, { status: 500 });
  }
}
