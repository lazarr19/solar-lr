import https from "node:https";
import { parseStringPromise } from "xml2js";

const SERBIA_EIC = "10YCS-SERBIATSOV";

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        { rejectUnauthorized: false, headers: { "User-Agent": "solar-prices-app/1.0" } },
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        },
      )
      .on("error", reject);
  });
}

export async function fetchCBC(
  deliveryDate: string,
): Promise<(number | null)[]> {
  const d = deliveryDate.replace(/-/g, "");
  const url = `https://www.nosbih.ba/files/auction/${d}_AuctionSummary_BA-RS-D-${d}.xml`;

  try {
    const raw = await httpsGet(url);
    const xml = raw.replace(/^\uFEFF/, "");
    const parsed = await parseStringPromise(xml, { explicitArray: true });

    const summaries: unknown[] =
      parsed?.AuctionSummary?.ProductInstanceSummaries?.[0]
        ?.ProductInstanceSummary ?? [];

    const cbc: (number | null)[] = Array(24).fill(null);

    for (const entry of summaries) {
      const s = entry as Record<string, string[]>;

      if (s.InAreaEicCode?.[0] !== SERBIA_EIC) continue;

      const code: string = s.ProductInstanceCode?.[0] ?? "";
      const hourMatch = code.match(/_(\d{2})H_/);
      if (!hourMatch) continue;

      const hourIndex = parseInt(hourMatch[1], 10) - 1;
      if (hourIndex < 0 || hourIndex > 23) continue;

      const priceKM = parseFloat(s.MarginalPrice?.[0] ?? "");
      if (!isNaN(priceKM)) {
        cbc[hourIndex] = Math.round((priceKM / 1.95583) * 100) / 100;
      }
    }

    return cbc;
  } catch {
    return Array(24).fill(null);
  }
}