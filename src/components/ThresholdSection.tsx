"use client";

import { useMemo, useEffect } from "react";
import { Power } from "lucide-react";
import type { HourlyPrice } from "@/lib/types";

function pillStyle(v: number): { bg: string; text: string } {
  if (v < 0)
    return {
      bg: "bg-red-50 dark:bg-red-950/40",
      text: "text-red-600 dark:text-red-400",
    };
  if (v < 20)
    return {
      bg: "bg-orange-50 dark:bg-orange-950/40",
      text: "text-orange-600 dark:text-orange-400",
    };
  if (v < 40)
    return {
      bg: "bg-yellow-50 dark:bg-yellow-950/40",
      text: "text-yellow-600 dark:text-yellow-400",
    };
  if (v < 60)
    return {
      bg: "bg-green-50 dark:bg-green-950/40",
      text: "text-green-600 dark:text-green-400",
    };
  return {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
  };
}

export interface Range {
  startHour: number;
  endHour: number;
  avgEfektivna: number;
}

function buildRanges(above: HourlyPrice[]): Range[] {
  if (above.length === 0) return [];
  const ranges: Range[] = [];
  let start = above[0].hour;
  let prev = above[0].hour;
  let sum = above[0].efektivna!;
  let count = 1;

  for (let i = 1; i < above.length; i++) {
    const h = above[i];
    if (h.hour === prev + 1) {
      sum += h.efektivna!;
      count++;
      prev = h.hour;
    } else {
      ranges.push({
        startHour: start,
        endHour: prev + 1,
        avgEfektivna: sum / count,
      });
      start = h.hour;
      prev = h.hour;
      sum = h.efektivna!;
      count = 1;
    }
  }
  ranges.push({
    startHour: start,
    endHour: prev + 1,
    avgEfektivna: sum / count,
  });
  return ranges;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function ThresholdSection({
  hours,
  threshold,
  onThresholdChange,
  onRangesChange,
}: {
  hours: HourlyPrice[];
  threshold: number;
  onThresholdChange: (t: number) => void;
  onRangesChange?: (ranges: Range[]) => void;
}) {

  const above = useMemo(
    () => hours.filter((h) => h.efektivna !== null && h.efektivna > threshold),
    [hours, threshold],
  );
  const ranges = useMemo(() => buildRanges(above), [above]);

  useEffect(() => {
    onRangesChange?.(ranges);
  }, [ranges, onRangesChange]);

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
              onChange={(e) => onThresholdChange(Number(e.target.value))}
              className="w-20 text-right tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400 border-0"
              step={5}
            />
            <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
              &euro;/MWh
            </span>
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
        {above.length === 0
          ? "Nema sati iznad praga"
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
                <span
                  className={`text-sm font-bold tabular-nums leading-tight mt-0.5 ${text}`}
                >
                  {h.efektivna!.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {ranges.length > 0 && (
        <>
          <div className="mt-4 mb-2.5 flex items-center gap-2">
            <Power className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Intervali rada
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {ranges.map((r) => {
              const duration = r.endHour - r.startHour;
              const { text } = pillStyle(r.avgEfektivna);
              return (
                <div
                  key={r.startHour}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
                      {pad(r.startHour)}:00 &ndash; {pad(r.endHour)}:00
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {duration}h
                    </span>
                  </div>
                  <span
                    className={`text-xs font-semibold tabular-nums ${text}`}
                  >
                    &oslash; {r.avgEfektivna.toFixed(1)} &euro;/MWh
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
