"use client";

import { useState } from "react";
import { Maximize2, X } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { HourlyPrice } from "@/lib/types";

interface Props {
  hours: HourlyPrice[];
  currentHour?: number | null;
}

function barColor(efektivna: number | null): string {
  if (efektivna === null) return "#94a3b8";
  if (efektivna < 0) return "#ef4444";
  if (efektivna < 20) return "#f97316";
  if (efektivna < 40) return "#eab308";
  if (efektivna < 60) return "#22c55e";
  return "#10b981"; // emerald — excellent
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, show }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as HourlyPrice;
  const endHour = String(d.hour + 1).padStart(2, "0");
  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-xs min-w-[160px]">
      <p className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-2.5">
        {d.label}–{endHour}:00
      </p>
      <div className="space-y-1.5">
        {show?.seepex && (
          <div className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span className="w-3 h-px bg-blue-500 inline-block" />
              SEEPEX
            </span>
            <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
              {d.seepex !== null ? d.seepex.toFixed(2) : "—"}
            </span>
          </div>
        )}
        {show?.cbc && (
          <div className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span className="w-3 h-px bg-orange-500 inline-block border-dashed" />
              CBC
            </span>
            <span className="font-semibold text-orange-500 dark:text-orange-400 tabular-nums">
              {d.cbc !== null ? d.cbc.toFixed(2) : "—"}
            </span>
          </div>
        )}
        {show?.efektivna && (
          <div className="pt-1.5 mt-0.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300 font-semibold">
              Efektivna
            </span>
            <span
              className="font-bold tabular-nums text-sm"
              style={{ color: barColor(d.efektivna) }}
            >
              {d.efektivna !== null ? d.efektivna.toFixed(2) : "—"}
            </span>
          </div>
        )}
        <p className="text-slate-300 dark:text-slate-600 text-center">€/MWh</p>
      </div>
    </div>
  );
}

function ChartCanvas({
  hours,
  show,
  currentHour,
}: {
  hours: HourlyPrice[];
  show: { efektivna: boolean; seepex: boolean; cbc: boolean };
  currentHour?: number | null;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={hours}
        margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e2e8f0"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          interval={2}
          tickFormatter={(v: string) => v.replace(":00", "")}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip
          content={<CustomTooltip show={show} />}
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
        />
        <ReferenceLine
          y={0}
          stroke="#ef4444"
          strokeDasharray="4 2"
          strokeWidth={1.5}
          opacity={0.5}
        />

        {currentHour !== null && currentHour !== undefined && (
          <ReferenceLine
            x={String(currentHour).padStart(2, "0") + ":00"}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="4 3"
            label={{
              value: "SADA",
              position: "insideTopRight",
              fontSize: 9,
              fill: "#f59e0b",
              fontWeight: 700,
            }}
          />
        )}

        {show.efektivna && (
          <Bar
            dataKey="efektivna"
            name="efektivna"
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          >
            {hours.map((h) => (
              <Cell key={h.hour} fill={barColor(h.efektivna)} />
            ))}
          </Bar>
        )}

        {show.seepex && (
          <Line
            type="monotone"
            dataKey="seepex"
            name="seepex"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        )}

        {show.cbc && (
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
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function PriceChart({ hours, currentHour }: Props) {
  const [show, setShow] = useState({
    efektivna: true,
    seepex: false,
    cbc: false,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggle = (key: keyof typeof show) =>
    setShow((prev) => ({ ...prev, [key]: !prev[key] }));

  const series = [
    {
      key: "efektivna" as const,
      label: "Efektivna",
      activeColor: "#22c55e",
      solid: false,
    },
    {
      key: "seepex" as const,
      label: "SEEPEX DA",
      activeColor: "#3b82f6",
      solid: true,
    },
    { key: "cbc" as const, label: "CBC", activeColor: "#f97316", solid: true },
  ];

  const TogglePills = () => (
    <div className="flex gap-2 flex-wrap">
      {series.map(({ key, label, activeColor, solid }) => (
        <button
          key={key}
          onClick={() => toggle(key)}
          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-all select-none ${
            show[key]
              ? "border-transparent text-white shadow-sm"
              : "bg-transparent text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
          }`}
          style={show[key] ? { backgroundColor: activeColor } : undefined}
        >
          {key === "efektivna" ? (
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{
                backgroundColor: show[key]
                  ? "rgba(255,255,255,0.6)"
                  : "#94a3b8",
              }}
            />
          ) : solid ? (
            <span
              className="w-3 h-0.5 rounded-full"
              style={{
                backgroundColor: show[key]
                  ? "rgba(255,255,255,0.7)"
                  : "#94a3b8",
              }}
            />
          ) : null}
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between gap-2">
          <TogglePills />
          <button
            onClick={() => setIsFullscreen(true)}
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Proširi grafikon"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <ChartCanvas hours={hours} show={show} currentHour={currentHour} />
        </div>
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-slate-950 overflow-hidden">
          {/* Close button — always at physical top-right */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Zatvori"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Chart area: fills screen normally, rotates 90° in portrait */}
          <div className="chart-landscape">
            <TogglePills />
            <div className="flex-1 min-h-0">
              <ChartCanvas hours={hours} show={show} currentHour={currentHour} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
