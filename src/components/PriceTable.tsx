import type { HourlyPrice } from '@/lib/types';

interface Props {
  hours: HourlyPrice[];
}

function dotBg(v: number | null): string {
  if (v === null) return 'bg-slate-300 dark:bg-slate-600';
  if (v < 0) return 'bg-red-500';
  if (v < 20) return 'bg-orange-500';
  if (v < 40) return 'bg-yellow-400';
  if (v < 60) return 'bg-green-500';
  return 'bg-emerald-500';
}

function efektivnaClass(v: number | null): string {
  if (v === null) return 'text-slate-400 dark:text-slate-600';
  if (v < 0) return 'text-red-600 dark:text-red-400 font-semibold';
  if (v < 20) return 'text-orange-600 dark:text-orange-400 font-semibold';
  if (v < 40) return 'text-yellow-600 dark:text-yellow-400 font-semibold';
  if (v < 60) return 'text-green-600 dark:text-green-400 font-semibold';
  return 'text-emerald-600 dark:text-emerald-400 font-bold';
}

function fmt(v: number | null): string {
  return v !== null ? v.toFixed(2) : '—';
}

export default function PriceTable({ hours }: Props) {
  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[min(520px,80vh)]">
      <table className="w-full">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-50 dark:bg-slate-800/90 backdrop-blur-sm border-b border-slate-100 dark:border-slate-700 text-xs">
            <th className="py-2.5 px-3 sm:px-5 text-left font-medium text-slate-500 dark:text-slate-400">
              Sat
            </th>
            <th className="py-2.5 px-3 sm:px-5 text-right font-medium text-blue-500">
              SEEPEX
            </th>
            <th className="py-2.5 px-3 sm:px-5 text-right font-medium text-orange-500">
              <span className="sm:hidden">CBC</span>
              <span className="hidden sm:inline">CBC BA→RS</span>
            </th>
            <th className="py-2.5 px-3 sm:px-5 text-right font-medium text-slate-700 dark:text-slate-300">
              Efektivna
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
          {hours.map((h) => (
            <tr
              key={h.hour}
              className="group hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors"
            >
              <td className="py-2.5 px-3 sm:px-5">
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 transition-transform group-hover:scale-125 ${dotBg(h.efektivna)}`}
                  />
                  <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 tabular-nums font-medium">
                    {h.label}
                  </span>
                </span>
              </td>
              <td className="py-2.5 px-3 sm:px-5 text-right text-xs sm:text-sm text-blue-600 dark:text-blue-400 tabular-nums">
                {fmt(h.seepex)}
              </td>
              <td className="py-2.5 px-3 sm:px-5 text-right text-xs sm:text-sm text-orange-500 dark:text-orange-400 tabular-nums">
                {fmt(h.cbc)}
              </td>
              <td className={`py-2.5 px-3 sm:px-5 text-right text-xs sm:text-sm tabular-nums ${efektivnaClass(h.efektivna)}`}>
                {fmt(h.efektivna)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
