'use client';

import { useState } from 'react';
import type { HourlyPrice } from '@/lib/types';

function pillStyle(v: number): { bg: string; text: string } {
  if (v < 0) return { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400' };
  if (v < 20) return { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-600 dark:text-orange-400' };
  if (v < 40) return { bg: 'bg-yellow-50 dark:bg-yellow-950/40', text: 'text-yellow-600 dark:text-yellow-400' };
  if (v < 60) return { bg: 'bg-green-50 dark:bg-green-950/40', text: 'text-green-600 dark:text-green-400' };
  return { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400' };
}

export default function ThresholdSection({ hours }: { hours: HourlyPrice[] }) {
  const [threshold, setThreshold] = useState(0);

  const above = hours.filter((h) => h.efektivna !== null && h.efektivna > threshold);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Satovi iznad praga
        </h2>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-20 text-right tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400 border-0"
            step={5}
          />
          <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">€/MWh</span>
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
        {above.length === 0
          ? 'Nema sati iznad praga'
          : `${above.length} od 24 sata (${Math.round((above.length / 24) * 100)}%)`}
      </p>

      {above.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {above.map((h) => {
            const { bg, text } = pillStyle(h.efektivna!);
            return (
              <div
                key={h.hour}
                className={`inline-flex flex-col items-center rounded-xl px-3 py-2 ${bg}`}
              >
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 leading-none">
                  {h.label}
                </span>
                <span className={`text-sm font-bold tabular-nums leading-tight mt-0.5 ${text}`}>
                  {h.efektivna!.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
