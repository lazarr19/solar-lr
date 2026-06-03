import { getCachedPrices, getTomorrowInSerbia } from '@/lib/prices';
import PriceChart from '@/components/PriceChart';
import PriceTable from '@/components/PriceTable';

export const revalidate = 3600;

function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('sr-RS', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function Home() {
  const tomorrow = getTomorrowInSerbia();
  const data = await getCachedPrices(tomorrow);

  const validHours = data.hours.filter((h) => h.efektivna !== null);
  const avg =
    validHours.length > 0
      ? validHours.reduce((s, h) => s + h.efektivna!, 0) / validHours.length
      : null;
  const min = validHours.length > 0 ? Math.min(...validHours.map((h) => h.efektivna!)) : null;
  const max = validHours.length > 0 ? Math.max(...validHours.map((h) => h.efektivna!)) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☀️</span>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">
                Sutrašnje cene električne energije
              </h1>
              <p className="text-sm text-slate-500">Srbija · BA→RS granica</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                data.seepexAvailable
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {data.seepexAvailable ? '✓ SEEPEX Live' : '⚠ SEEPEX Demo'}
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                data.cbcAvailable
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {data.cbcAvailable ? '✓ CBC Live' : '⚠ CBC Demo'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Date banner */}
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
              Datum isporuke
            </p>
            <p className="text-xl font-bold text-slate-800 capitalize">
              {formatDisplayDate(data.date)}
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Učitano: {new Date(data.fetchedAt).toLocaleTimeString('sr-RS', { timeZone: 'Europe/Belgrade' })}
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Minimum', value: min, color: 'text-orange-600' },
            { label: 'Prosek', value: avg, color: 'text-blue-600' },
            { label: 'Maksimum', value: max, color: 'text-green-600' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-slate-200 p-4 text-center"
            >
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                {stat.label}
              </p>
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value !== null ? stat.value.toFixed(2) : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">€/MWh</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">
            Efektivna cena = SEEPEX × 0.85 − CBC
          </h2>
          <PriceChart hours={data.hours} />
          <div className="mt-3 flex gap-4 text-xs text-slate-400 flex-wrap">
            <span>
              <span className="inline-block w-3 h-3 rounded-sm bg-green-500 mr-1 align-middle" />
              Dobra cena (≥40)
            </span>
            <span>
              <span className="inline-block w-3 h-3 rounded-sm bg-yellow-400 mr-1 align-middle" />
              Srednja (20–40)
            </span>
            <span>
              <span className="inline-block w-3 h-3 rounded-sm bg-orange-500 mr-1 align-middle" />
              Niska (0–20)
            </span>
            <span>
              <span className="inline-block w-3 h-3 rounded-sm bg-red-500 mr-1 align-middle" />
              Negativna (&lt;0)
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">
            Satni pregled · sve vrednosti u €/MWh
          </h2>
          <PriceTable hours={data.hours} />
        </div>

        <p className="text-xs text-center text-slate-400 pb-4">
          Podaci: ENTSO-E Transparency Platform · NOSBiH aukcijski XML
        </p>
      </main>
    </div>
  );
}
