'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { HourlyPrice } from '@/lib/types';

interface Props {
  hours: HourlyPrice[];
}

function barColor(efektivna: number | null): string {
  if (efektivna === null) return '#94a3b8';
  if (efektivna < 0) return '#ef4444';
  if (efektivna < 20) return '#f97316';
  if (efektivna < 40) return '#eab308';
  if (efektivna < 60) return '#22c55e';
  return '#10b981'; // emerald — excellent
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as HourlyPrice;
  const endHour = String(d.hour + 1).padStart(2, '0');
  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-xs min-w-[160px]">
      <p className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-2.5">
        {d.label}–{endHour}:00
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="w-3 h-px bg-blue-500 inline-block" />
            SEEPEX
          </span>
          <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
            {d.seepex !== null ? d.seepex.toFixed(2) : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="w-3 h-px bg-orange-500 inline-block border-dashed" />
            CBC
          </span>
          <span className="font-semibold text-orange-500 dark:text-orange-400 tabular-nums">
            {d.cbc !== null ? d.cbc.toFixed(2) : '—'}
          </span>
        </div>
        <div className="pt-1.5 mt-0.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-300 font-semibold">Efektivna</span>
          <span
            className="font-bold tabular-nums text-sm"
            style={{ color: barColor(d.efektivna) }}
          >
            {d.efektivna !== null ? d.efektivna.toFixed(2) : '—'}
          </span>
        </div>
        <p className="text-slate-300 dark:text-slate-600 text-center">€/MWh</p>
      </div>
    </div>
  );
}

export default function PriceChart({ hours }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={hours} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          interval={2}
          tickFormatter={(v: string) => v.replace(':00', '')}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(148,163,184,0.08)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
          iconType="plainline"
          iconSize={14}
          formatter={(value) =>
            value === 'efektivna'
              ? 'Efektivna cena'
              : value === 'seepex'
                ? 'SEEPEX DA'
                : 'CBC (BA→RS)'
          }
        />
        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} opacity={0.5} />

        <Bar dataKey="efektivna" name="efektivna" radius={[4, 4, 0, 0]} maxBarSize={22}>
          {hours.map((h) => (
            <Cell key={h.hour} fill={barColor(h.efektivna)} />
          ))}
        </Bar>

        <Line
          type="monotone"
          dataKey="seepex"
          name="seepex"
          stroke="#3b82f6"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />

        <Line
          type="monotone"
          dataKey="cbc"
          name="cbc"
          stroke="#f97316"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
          strokeDasharray="5 3"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
