import { parseStringPromise } from 'xml2js';

// Serbia EIC code — "in" area means energy flows INTO Serbia (BA→RS import)
const SERBIA_EIC = '10YCS-SERBIATSOV';

/**
 * Fetch the CBC (MarginalPrice) for each of the 24 local hours of `deliveryDate`
 * from the NOSBiH day-ahead capacity auction XML.
 *
 * URL pattern: https://www.nosbih.ba/files/auction/{YYYYMMDD}_AuctionSummary_BA-RS-D-{YYYYMMDD}.xml
 * Returns an array of 24 values (index 0 = 00:00–01:00 local time).
 * Null values indicate the data was unavailable for that hour.
 */
export async function fetchCBC(deliveryDate: string): Promise<(number | null)[]> {
  const d = deliveryDate.replace(/-/g, ''); // YYYYMMDD
  const url = `https://www.nosbih.ba/files/auction/${d}_AuctionSummary_BA-RS-D-${d}.xml`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'solar-prices-app/1.0' },
    });

    if (!res.ok) return Array(24).fill(null);

    // Strip BOM if present (\uFEFF), then parse XML
    const raw = await res.text();
    const xml = raw.replace(/^\uFEFF/, '');
    const parsed = await parseStringPromise(xml, { explicitArray: true });

    const summaries: unknown[] =
      parsed?.AuctionSummary?.ProductInstanceSummaries?.[0]?.ProductInstanceSummary ?? [];

    const cbc: (number | null)[] = Array(24).fill(null);

    for (const raw of summaries) {
      const s = raw as Record<string, string[]>;

      // Only take BA→RS direction (energy flowing INTO Serbia)
      const inArea = s.InAreaEicCode?.[0];
      if (inArea !== SERBIA_EIC) continue;

      // ProductInstanceCode format: "BA-RS_01H_04" — extract 1-based hour index
      const code: string = s.ProductInstanceCode?.[0] ?? '';
      const hourMatch = code.match(/_(\d{2})H_/);
      if (!hourMatch) continue;

      const hourIndex = parseInt(hourMatch[1], 10) - 1; // convert to 0-based
      if (hourIndex < 0 || hourIndex > 23) continue;

      const price = parseFloat(s.MarginalPrice?.[0] ?? '');
      if (!isNaN(price)) {
        cbc[hourIndex] = price;
      }
    }

    return cbc;
  } catch {
    return Array(24).fill(null);
  }
}
