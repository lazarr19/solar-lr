import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const KEY = "push:subs";

export async function POST(request: Request) {
  const { subscription, threshold } = await request.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  await redis.hset(KEY, {
    [subscription.endpoint]: { subscription, threshold: threshold ?? 0 },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { endpoint } = await request.json();
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }
  await redis.hdel(KEY, endpoint);
  return NextResponse.json({ ok: true });
}
