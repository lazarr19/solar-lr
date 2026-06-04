import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Client } from "@upstash/qstash";
import { getCachedPrices, getTodayInSerbia, getTomorrowInSerbia } from "@/lib/prices";
import type { HourlyPrice } from "@/lib/types";

export const runtime = "nodejs";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

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

// Convert a Belgrade date+hour to a UTC ms timestamp
function belgradeDateHourToUTC(date: string, hour: number): number {
  const [y, m, d] = date.split("-").map(Number);
  const probeUTC = Date.UTC(y, m - 1, d, 12, 0, 0);
  const belgHourAtNoon =
    parseInt(
      new Intl.DateTimeFormat("en", {
        timeZone: "Europe/Belgrade",
        hour: "numeric",
        hour12: false,
      }).format(new Date(probeUTC)),
      10
    ) % 24;
  const offsetHours = belgHourAtNoon - 12;
  return Date.UTC(y, m - 1, d, hour - offsetHours, 0, 0);
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const todayDate = getTodayInSerbia();
  const tomorrowDate = getTomorrowInSerbia();
  const appUrl = process.env.APP_URL!;

  const [todayPrices, tomorrowPrices] = await Promise.all([
    getCachedPrices(todayDate),
    getCachedPrices(tomorrowDate),
  ]);

  const allSubs = await redis.hgetall<
    Record<string, { subscription: { endpoint: string }; threshold: number }>
  >("push:subs");

  if (!allSubs) return NextResponse.json({ scheduled: 0 });

  const schedules: Promise<unknown>[] = [];

  for (const [endpoint, stored] of Object.entries(allSubs)) {
    const threshold = stored.threshold ?? 0;
    const shortId = endpoint.slice(-20);

    const todayRanges = buildRanges(todayPrices.hours, threshold);
    const tomorrowRanges = buildRanges(tomorrowPrices.hours, threshold);

    // If today ends at midnight AND tomorrow starts at midnight, prices are continuous
    // across the day boundary — skip both phantom notifications
    const todayEndsAtMidnight = todayRanges.some((r) => r.endHour === 24);
    const tomorrowStartsAtMidnight = tomorrowRanges.some((r) => r.startHour === 0);
    const continuousAcrossMidnight = todayEndsAtMidnight && tomorrowStartsAtMidnight;

    for (const { ranges, date } of [
      { ranges: todayRanges, date: todayDate },
      { ranges: tomorrowRanges, date: tomorrowDate },
    ]) {
      for (const range of ranges) {
        // Start notification — 10 min before interval begins
        // Skip if this is the midnight continuation (tomorrow starts at 0, no real transition)
        const isPhantomStart = continuousAcrossMidnight && date === tomorrowDate && range.startHour === 0;
        const startUtc = belgradeDateHourToUTC(date, range.startHour);
        const startNotifyAt = startUtc - 10 * 60 * 1000;
        if (!isPhantomStart && startNotifyAt > now + 30_000) {
          const endDisplay = range.endHour === 24 ? 0 : range.endHour;
          schedules.push(
            qstash.publishJSON({
              url: `${appUrl}/api/push/send`,
              body: {
                endpoint,
                title: "⚡ Uključite postrojenje za 10 min",
                body: `Interval rada: ${pad(range.startHour)}:00 – ${pad(endDisplay)}:00`,
                tag: `on-${date}-${range.startHour}`,
              },
              notBefore: Math.floor(startNotifyAt / 1000),
              deduplicationId: `on-${shortId}-${date}-${range.startHour}`,
            }).catch(() => null)
          );
        }

        // End notification — 10 min before interval ends (endHour=24 means midnight)
        // Skip if this is the midnight continuation (today ends at 24, no real transition)
        const isPhantomEnd = continuousAcrossMidnight && date === todayDate && range.endHour === 24;
        const endUtc = belgradeDateHourToUTC(date, range.endHour);
        const endNotifyAt = endUtc - 10 * 60 * 1000;
        if (!isPhantomEnd && endNotifyAt > now + 30_000) {
          const endDisplay = range.endHour === 24 ? 0 : range.endHour;
          schedules.push(
            qstash.publishJSON({
              url: `${appUrl}/api/push/send`,
              body: {
                endpoint,
                title: "⚡ Isključite postrojenje za 10 min",
                body: `Kraj intervala u ${pad(endDisplay)}:00`,
                tag: `off-${date}-${range.endHour}`,
              },
              notBefore: Math.floor(endNotifyAt / 1000),
              deduplicationId: `off-${shortId}-${date}-${range.endHour}`,
            }).catch(() => null)
          );
        }
      }
    }
  }

  const results = await Promise.allSettled(schedules);
  const scheduled = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ scheduled });
}
