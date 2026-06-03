import { parseStringPromise } from "xml2js";

const ENTSOE_API = "https://web-api.tp.entsoe.eu/api";
const SERBIA_EIC = "10YCS-SERBIATSOV";

/** Format a Date as YYYYMMDDHHMM (UTC) for the ENTSO-E API */
function fmtEntsoe(d: Date): string {
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    p(d.getUTCFullYear(), 4) +
    p(d.getUTCMonth() + 1) +
    p(d.getUTCDate()) +
    p(d.getUTCHours()) +
    p(d.getUTCMinutes())
  );
}

/**
 * Return the UTC offset in hours for Europe/Belgrade on the given date.
 * CEST (summer) = UTC+2, CET (winter) = UTC+1.
 */
function getSerbiaOffsetHours(date: Date): number {
  // 'longOffset' timeZoneName gives e.g. "6/3/2026, GMT+02:00"
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Belgrade",
    timeZoneName: "longOffset",
  }).format(date);
  const m = s.match(/GMT([+-])(\d+)/);
  if (!m) return 1;
  return m[1] === "+" ? parseInt(m[2], 10) : -parseInt(m[2], 10);
}

/**
 * Fetch ENTSO-E day-ahead prices for Serbia for `deliveryDate` (YYYY-MM-DD, local time).
 * Returns an array of 24 values indexed by local hour (0 = 00:00–01:00).
 * Returns 24 nulls if the API key is absent or the request fails.
 */
export async function fetchDayAheadPrices(
  deliveryDate: string,
): Promise<(number | null)[]> {
  const apiKey = process.env.ENTSOE_API_KEY;
  if (!apiKey) return Array(24).fill(null);

  // Determine UTC midnight for the delivery day (local 00:00 in Belgrade)
  const [y, mo, d] = deliveryDate.split("-").map(Number);
  const midDayUTC = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const offset = getSerbiaOffsetHours(midDayUTC);

  // periodStart = local midnight UTC = Date.UTC(y, mo-1, d, -offset)
  const periodStart = new Date(Date.UTC(y, mo - 1, d, -offset, 0, 0));
  const periodEnd = new Date(Date.UTC(y, mo - 1, d + 1, -offset, 0, 0));

  const params = new URLSearchParams({
    securityToken: apiKey,
    documentType: "A44",
    in_Domain: SERBIA_EIC,
    out_Domain: SERBIA_EIC,
    periodStart: fmtEntsoe(periodStart),
    periodEnd: fmtEntsoe(periodEnd),
  });

  try {
    const res = await fetch(`${ENTSOE_API}?${params}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return Array(24).fill(null);

    const xml = await res.text();
    const parsed = await parseStringPromise(xml, { explicitArray: true });

    // ENTSO-E root can be namespaced; access by known key
    const doc =
      parsed["Publication_MarketDocument"] ?? parsed[Object.keys(parsed)[0]];

    const timeSeriesArr: unknown[] = doc?.TimeSeries ?? [];
    const prices: (number | null)[] = Array(24).fill(null);

    for (const rawTs of timeSeriesArr) {
      const ts = rawTs as Record<string, unknown[]>;
      const periods = (ts.Period as Record<string, unknown[]>[]) ?? [];

      for (const period of periods) {
        const resolution = (period.resolution as string[])?.[0];
        if (resolution !== "PT60M") continue; // only hourly data

        // Get the UTC start of this period to map positions → local hours
        const intervalStart = (
          period.timeInterval as Record<string, string[]>[]
        )?.[0]?.start?.[0];
        if (!intervalStart) continue;

        const startUTC = new Date(intervalStart);
        const localOffsetHours = getSerbiaOffsetHours(startUTC);

        const points = (period.Point as Record<string, string[]>[]) ?? [];
        for (const pt of points) {
          const pos = parseInt(pt.position?.[0], 10); // 1-based
          const price = parseFloat(pt["price.amount"]?.[0]);
          if (isNaN(pos) || isNaN(price)) continue;

          // Convert position to local hour
          const utcHour = (startUTC.getUTCHours() + (pos - 1)) % 24;
          const localHour = (utcHour + localOffsetHours) % 24;

          if (localHour >= 0 && localHour <= 23) {
            prices[localHour] = price;
          }
        }
      }
    }

    return prices;
  } catch {
    return Array(24).fill(null);
  }
}
