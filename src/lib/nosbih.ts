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

function httpsPost(url: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { hostname, pathname, search } = new URL(url);
    const req = https.request(
      {
        hostname,
        path: `${pathname}${search}`,
        method: "POST",
        rejectUnauthorized: false,
        headers: {
          "User-Agent": "solar-prices-app/1.0",
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Primary source: the "rezultati-aukcija" page's AJAX endpoint. Its results
 * table reflects the auction DB directly and is available sooner (and more
 * reliably) than the static XML export used by fetchCBCFromXml.
 */
async function fetchCBCFromWeb(
  deliveryDate: string,
): Promise<(number | null)[]> {
  const [year, month, day] = deliveryDate.split("-");
  const formattedDate = `${day}.${month}.${year}.`;

  const body = new URLSearchParams({
    action: "auction",
    auction: `date=${formattedDate}&region=BA-RS`,
  }).toString();

  const raw = await httpsPost(
    "https://www.nosbih.ba/sr/wp-admin/admin-ajax.php",
    body,
  );

  const json = JSON.parse(raw) as { success?: boolean; data?: string };
  if (!json.success || !json.data) {
    throw new Error("nosbih AJAX endpoint returned no data");
  }

  const cbc: (number | null)[] = Array(24).fill(null);
  // The table lists both directions (BA-RS and RS-BA) per hour — must filter
  // on the "Смјер" column, not just take the first/last row per hour.
  const rowRegex =
    /<tr>\s*<td>(\d{2}):\d{2} - \d{2}:\d{2}<\/td>\s*<td>([^<]*)<\/td>\s*<td>[^<]*<\/td>\s*<td>[^<]*<\/td>\s*<td>[^<]*<\/td>\s*<td>([\d.]+)<\/td>/g;

  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(json.data)) !== null) {
    if (match[2] !== "BA-RS") continue;
    const hourIndex = parseInt(match[1], 10);
    const price = parseFloat(match[3]);
    if (hourIndex >= 0 && hourIndex <= 23 && !isNaN(price)) {
      cbc[hourIndex] = Math.round(price * 100) / 100;
    }
  }

  if (cbc.every((v) => v === null)) {
    throw new Error("nosbih AJAX endpoint returned no parseable rows");
  }

  return cbc;
}

/**
 * Fallback source: the static per-day XML file. Kept because it's the only
 * source once nosbih.ba drops a date from the auction-results page/DB.
 */
async function fetchCBCFromXml(
  deliveryDate: string,
): Promise<(number | null)[]> {
  const d = deliveryDate.replace(/-/g, "");
  const url = `https://www.nosbih.ba/files/auction/${d}_AuctionSummary_BA-RS-D-${d}.xml`;

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

    const price = parseFloat(s.MarginalPrice?.[0] ?? "");
    if (!isNaN(price)) {
      cbc[hourIndex] = Math.round(price * 100) / 100;
    }
  }

  return cbc;
}

export async function fetchCBC(
  deliveryDate: string,
): Promise<(number | null)[]> {
  try {
    return await fetchCBCFromWeb(deliveryDate);
  } catch (webErr) {
    console.error(
      `[nosbih] web AJAX fetch failed for ${deliveryDate}, falling back to XML:`,
      webErr,
    );
  }

  try {
    return await fetchCBCFromXml(deliveryDate);
  } catch (xmlErr) {
    console.error(
      `[nosbih] XML fallback fetch also failed for ${deliveryDate}:`,
      xmlErr,
    );
    return Array(24).fill(null);
  }
}