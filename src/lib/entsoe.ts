const ENERGY_CHARTS_API = "https://api.energy-charts.info/price";
const SERBIA_BZN = "RS";

/** Return the UTC offset in hours for Europe/Belgrade on the given date. */
function getSerbiaOffsetHours(date: Date): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Belgrade",
    timeZoneName: "longOffset",
  }).format(date);
  const m = s.match(/GMT([+-])(\d+)/);
  if (!m) return 1;
  return m[1] === "+" ? parseInt(m[2], 10) : -parseInt(m[2], 10);
}

/**
 * Fetch day-ahead prices for Serbia for `deliveryDate` (YYYY-MM-DD, local time)
 * via the free Fraunhofer ISE energy-charts API (no API key required).
 * Returns an array of 24 values indexed by local hour (0 = 00:00–01:00).
 * Returns 24 nulls if the request fails or data is unavailable.
 */
export async function fetchDayAheadPrices(
  deliveryDate: string,
): Promise<(number | null)[]> {
  const params = new URLSearchParams({
    bzn: SERBIA_BZN,
    start: deliveryDate,
    end: deliveryDate,
  });

  try {
    const res = await fetch(`${ENERGY_CHARTS_API}?${params}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return Array(24).fill(null);

    const data = (await res.json()) as {
      unix_seconds: number[];
      price: (number | null)[];
    };

    if (!Array.isArray(data.unix_seconds) || !Array.isArray(data.price)) {
      return Array(24).fill(null);
    }

    const sums: number[] = Array(24).fill(0);
    const counts: number[] = Array(24).fill(0);

    for (let i = 0; i < data.unix_seconds.length; i++) {
      const price = data.price[i];
      if (price === null || price === undefined || isNaN(price)) continue;
      const date = new Date(data.unix_seconds[i] * 1000);
      const offset = getSerbiaOffsetHours(date);
      const localHour = ((date.getUTCHours() + offset) % 24 + 24) % 24;
      sums[localHour] += price;
      counts[localHour]++;
    }

    const prices: (number | null)[] = Array(24).fill(null);
    for (let h = 0; h < 24; h++) {
      if (counts[h] > 0) prices[h] = sums[h] / counts[h];
    }

    return prices;
  } catch {
    return Array(24).fill(null);
  }
}
