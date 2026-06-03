import { NextResponse } from 'next/server';
import { getCachedPrices, getTomorrowInSerbia } from '@/lib/prices';

export const revalidate = 3600;

export async function GET() {
  const tomorrow = getTomorrowInSerbia();
  const data = await getCachedPrices(tomorrow);
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
