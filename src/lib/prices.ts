import { unstable_cache } from 'next/cache';
import { fetchDayAheadPrices } from './entsoe';
import { fetchCBC } from './nosbih';
import { MOCK_SEEPEX, MOCK_CBC } from './mock';
import type { PricesResponse } from './types';

/** Return tomorrow's date as YYYY-MM-DD in Europe/Belgrade timezone */
export function getTomorrowInSerbia(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrow);
}

async function _getPrices(deliveryDate: string): Promise<PricesResponse> {
  const useMockSeepex = !process.env.ENTSOE_API_KEY;

  const [seepexRaw, cbcRaw] = await Promise.all([
    useMockSeepex
      ? Promise.resolve(MOCK_SEEPEX as (number | null)[])
      : fetchDayAheadPrices(deliveryDate),
    fetchCBC(deliveryDate),
  ]);

  // If live CBC fetch returned all nulls, fall back to mock CBC
  const cbcFinal: (number | null)[] = cbcRaw.some((v) => v !== null)
    ? cbcRaw
    : (MOCK_CBC as (number | null)[]);

  const cbcAvailable = cbcRaw.some((v) => v !== null);

  const hours = Array.from({ length: 24 }, (_, i) => {
    const seepex = seepexRaw[i] ?? null;
    const cbc = cbcFinal[i] ?? null;
    const efektivna =
      seepex !== null && cbc !== null
        ? Math.round((seepex * 0.85 - cbc) * 100) / 100
        : null;
    return {
      hour: i,
      label: `${String(i).padStart(2, '0')}:00`,
      seepex,
      cbc,
      efektivna,
    };
  });

  return {
    date: deliveryDate,
    fetchedAt: new Date().toISOString(),
    hours,
    seepexAvailable: !useMockSeepex,
    cbcAvailable,
  };
}

/** Cached version — revalidates every hour */
export const getCachedPrices = unstable_cache(
  _getPrices,
  ['prices'],
  { revalidate: 3600, tags: ['prices'] },
);
