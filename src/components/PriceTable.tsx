import type { HourlyPrice } from '@/lib/types';

interface Props {
  hours: HourlyPrice[];
}

function efektivnaClass(v: number | null): string {
  if (v === null) return 'text-slate-400';
  if (v < 0) return 'text-red-600 font-semibold';
  if (v < 20) return 'text-orange-500 font-semibold';
  if (v < 40) return 'text-yellow-600 font-semibold';
  return 'text-green-600 font-semibold';
}

function fmt(v: number | null): string {
  return v !== null ? v.toFixed(2) : '—';
}

export default function PriceTable({ hours }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm text-right">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <th className="py-3 px-4 text-left font-medium">Sat</th>
            <th className="py-3 px-4 font-medium text-blue-600">SEEPEX DA</th>
            <th className="py-3 px-4 font-medium text-orange-500">CBC BA→RS</th>
            <th className="py-3 px-4 font-medium text-slate-700">Efektivna cena</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((h, idx) => (
            <tr
              key={h.hour}
              className={
                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
              }
            >
              <td className="py-2 px-4 text-left text-slate-500 tabular-nums">
                {h.label}
              </td>
              <td className="py-2 px-4 text-blue-700 tabular-nums">
                {fmt(h.seepex)}
              </td>
              <td className="py-2 px-4 text-orange-600 tabular-nums">
                {fmt(h.cbc)}
              </td>
              <td className={`py-2 px-4 tabular-nums ${efektivnaClass(h.efektivna)}`}>
                {fmt(h.efektivna)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
