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
  if (efektivna < 0) return '#ef4444';   // red  — negative
  if (efektivna < 20) return '#f97316';  // orange — very low
  if (efektivna < 40) return '#eab308';  // yellow — low
  if (efektivna < 60) return '#22c55e';  // green  — good
  return '#16a34a';                       // dark green — great
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as HourlyPrice;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-blue-600">
        SEEPEX: {d.seepex !== null ? `${d.seepex.toFixed(2)} €/MWh` : '—'}
      </p>
      <p className="text-orange-500">
        CBC:&nbsp;&nbsp;&nbsp;&nbsp;{d.cbc !== null ? `${d.cbc.toFixed(2)} €/MWh` : '—'}
      </p>
      <p className="font-bold text-slate-800 mt-1 border-t border-slate-100 pt-1">
        Efektivna: {d.efektivna !== null ? `${d.efektivna.toFixed(2)} €/MWh` : '—'}
      </p>
    </div>
  );
}

export default function PriceChart({ hours }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={hours} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#cbd5e1' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}`}
          label={{
            value: '€/MWh',
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            style: { fill: '#94a3b8', fontSize: 11 },
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(value) =>
            value === 'efektivna'
              ? 'Efektivna cena'
              : value === 'seepex'
                ? 'SEEPEX DA'
                : 'CBC (BA→RS)'
          }
        />
        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />

        {/* Efektivna cena — colored bars */}
        <Bar dataKey="efektivna" name="efektivna" radius={[3, 3, 0, 0]} maxBarSize={28}>
          {hours.map((h) => (
            <Cell key={h.hour} fill={barColor(h.efektivna)} />
          ))}
        </Bar>

        {/* SEEPEX day-ahead price */}
        <Line
          type="monotone"
          dataKey="seepex"
          name="seepex"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />

        {/* CBC */}
        <Line
          type="monotone"
          dataKey="cbc"
          name="cbc"
          stroke="#f97316"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          strokeDasharray="5 3"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
