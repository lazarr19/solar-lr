import { unstable_cache } from "next/cache";
import { fetchDayAheadPrices } from "./entsoe";
import { fetchCBC } from "./nosbih";
import { MOCK_SEEPEX, MOCK_CBC } from "./mock";
import type { PricesResponse } from "./types";

/** Return today's date as YYYY-MM-DD in Europe/Belgrade timezone */
export function getTodayInSerbia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Return tomorrow's date as YYYY-MM-DD in Europe/Belgrade timezone */
export function getTomorrowInSerbia(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrow);
}

async function _getPrices(deliveryDate: string): Promise<PricesResponse> {
  const [seepexRaw, cbcRaw] = await Promise.all([
    fetchDayAheadPrices(deliveryDate),
    fetchCBC(deliveryDate),
  ]);

  const seepexAvailable = seepexRaw.some((v) => v !== null);
  const cbcAvailable = cbcRaw.some((v) => v !== null);

  // Fall back to mock data if live fetch returned all nulls
  const seepexFinal: (number | null)[] = seepexAvailable
    ? seepexRaw
    : (MOCK_SEEPEX as (number | null)[]);
  const cbcFinal: (number | null)[] = cbcAvailable
    ? cbcRaw
    : (MOCK_CBC as (number | null)[]);

  const hours = Array.from({ length: 24 }, (_, i) => {
    const seepex = seepexFinal[i] ?? null;
    const cbc = cbcFinal[i] ?? null;
    const efektivna =
      seepex !== null && cbc !== null
        ? Math.round((seepex * 0.85 - cbc) * 100) / 100
        : null;
    return {
      hour: i,
      label: `${String(i).padStart(2, "0")}:00`,
      seepex,
      cbc,
      efektivna,
    };
  });

  return {
    date: deliveryDate,
    fetchedAt: new Date().toISOString(),
    hours,
    seepexAvailable,
    cbcAvailable,
  };
}

/** Cached version — revalidates every hour */
export const getCachedPrices = unstable_cache(_getPrices, ["prices"], {
  revalidate: 3600,
  tags: ["prices"],
});
