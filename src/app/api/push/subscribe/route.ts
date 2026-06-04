import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const SUBS_KEY = "push:subs";
const DEVICES_KEY = "push:devices";

export async function POST(request: Request) {
  const { subscription, threshold, deviceId } = await request.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  if (deviceId) {
    const oldEndpoint = await redis.hget<string>(DEVICES_KEY, deviceId);
    if (oldEndpoint && oldEndpoint !== subscription.endpoint) {
      await redis.hdel(SUBS_KEY, oldEndpoint);
    }
    await redis.hset(DEVICES_KEY, { [deviceId]: subscription.endpoint });
  }

  await redis.hset(SUBS_KEY, {
    [subscription.endpoint]: { subscription, threshold: threshold ?? 0, deviceId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { endpoint, deviceId } = await request.json();
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }
  if (deviceId) {
    await redis.hdel(DEVICES_KEY, deviceId);
  }
  await redis.hdel(SUBS_KEY, endpoint);
  return NextResponse.json({ ok: true });
}
