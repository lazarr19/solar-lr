import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import webpush from "web-push";
import { getCachedPrices, getTodayInSerbia, getTomorrowInSerbia } from "@/lib/prices";
import type { HourlyPrice } from "@/lib/types";

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

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function buildRanges(hours: HourlyPrice[], threshold: number) {
  const above = hours.filter((h) => h.efektivna !== null && h.efektivna > threshold);
  if (above.length === 0) return [];

  const ranges: { startHour: number; endHour: number }[] = [];
  let start = above[0].hour;
  let prev = above[0].hour;

  for (let i = 1; i < above.length; i++) {
    if (above[i].hour === prev + 1) {
      prev = above[i].hour;
    } else {
      ranges.push({ startHour: start, endHour: prev + 1 });
      start = above[i].hour;
      prev = above[i].hour;
    }
  }
  ranges.push({ startHour: start, endHour: prev + 1 });
  return ranges;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentHour =
    parseInt(
      new Intl.DateTimeFormat("en", {
        timeZone: "Europe/Belgrade",
        hour: "numeric",
        hour12: false,
      }).format(new Date()),
      10
    ) % 24;
  const nextHour = (currentHour + 1) % 24;
  const date = currentHour === 23 ? getTomorrowInSerbia() : getTodayInSerbia();

  const prices = await getCachedPrices(date);

  const allSubs = await redis.hgetall<
    Record<string, { subscription: webpush.PushSubscription; threshold: number }>
  >("push:subs");

  if (!allSubs) return NextResponse.json({ sent: 0 });

  const sends = Object.entries(allSubs).flatMap(([endpoint, stored]) => {
    const { subscription, threshold } = stored;
    const ranges = buildRanges(prices.hours, threshold ?? 0);

    return ranges.flatMap((range) => {
      const payloads: { title: string; body: string; tag: string }[] = [];

      if (range.startHour === nextHour) {
        payloads.push({
          title: "⚡ Uključite postrojenje za 5 min",
          body: `Interval rada: ${pad(range.startHour)}:00 – ${pad(range.endHour)}:00`,
          tag: `on-${date}-${range.startHour}`,
        });
      }
      if (range.endHour === nextHour) {
        payloads.push({
          title: "⚡ Isključite postrojenje za 5 min",
          body: `Kraj intervala u ${pad(range.endHour)}:00`,
          tag: `off-${date}-${range.endHour}`,
        });
      }

      return payloads.map((payload) => ({ endpoint, subscription, payload }));
    });
  });

  const results = await Promise.allSettled(
    sends.map(({ endpoint, subscription, payload }) =>
      webpush.sendNotification(subscription, JSON.stringify(payload)).catch(async (err) => {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await redis.hdel("push:subs", endpoint);
        }
        throw err;
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent });
}
