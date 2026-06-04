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
  const isLastHour = currentHour === 23;

  // Today's prices: needed for end-of-interval check (endHour goes up to 24 for midnight)
  // Tomorrow's prices: needed at 23:55 for intervals starting at hour 0
  const todayPrices = await getCachedPrices(getTodayInSerbia());
  const tomorrowPrices = isLastHour ? await getCachedPrices(getTomorrowInSerbia()) : null;

  // endHour in buildRanges is prev+1, so an interval ending at midnight has endHour=24
  const endHourTarget = isLastHour ? 24 : nextHour;

  const allSubs = await redis.hgetall<
    Record<string, { subscription: webpush.PushSubscription; threshold: number }>
  >("push:subs");

  if (!allSubs) return NextResponse.json({ sent: 0 });

  const sends = Object.entries(allSubs).flatMap(([endpoint, stored]) => {
    const { subscription, threshold } = stored;
    const todayRanges = buildRanges(todayPrices.hours, threshold ?? 0);
    const tomorrowRanges = tomorrowPrices
      ? buildRanges(tomorrowPrices.hours, threshold ?? 0)
      : [];

    const payloads: { title: string; body: string; tag: string }[] = [];

    // Start notifications: at 23:55 check tomorrow's hour 0; otherwise today's nextHour
    const startRanges = isLastHour ? tomorrowRanges : todayRanges;
    const startDate = isLastHour ? getTomorrowInSerbia() : getTodayInSerbia();
    for (const range of startRanges) {
      if (range.startHour === nextHour) {
        payloads.push({
          title: "⚡ Uključite postrojenje za 5 min",
          body: `Interval rada: ${pad(range.startHour)}:00 – ${pad(range.endHour === 24 ? 0 : range.endHour)}:00`,
          tag: `on-${startDate}-${range.startHour}`,
        });
      }
    }

    // End notifications: always check today's ranges using endHourTarget (24 at midnight)
    for (const range of todayRanges) {
      if (range.endHour === endHourTarget) {
        payloads.push({
          title: "⚡ Isključite postrojenje za 5 min",
          body: `Kraj intervala u ${pad(nextHour)}:00`,
          tag: `off-${getTodayInSerbia()}-${nextHour}`,
        });
      }
    }

    return payloads.map((payload) => ({ endpoint, subscription, payload }));
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
