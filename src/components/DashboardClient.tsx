"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp, Minus, Sun, Bell, BellOff, Smartphone } from "lucide-react";
import type { PricesResponse } from "@/lib/types";
import PriceChart from "./PriceChart";
import PriceTable from "./PriceTable";
import ThresholdSection, { type Range } from "./ThresholdSection";
import { useNotifications } from "@/lib/useNotifications";

function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("sr-RS", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function DataBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
        ok
          ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green-500" : "bg-amber-400"}`}
      />
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  unit = "€/MWh",
  icon,
  iconClass,
  valueClass,
}: {
  label: string;
  value: number | null;
  unit?: string;
  icon: ReactNode;
  iconClass: string;
  valueClass: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-3 sm:p-4 flex flex-col gap-2.5">
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${iconClass}`}
      >
        {icon}
      </div>
      <div>
        <p
          className={`text-xl sm:text-2xl font-bold tabular-nums leading-none ${valueClass}`}
        >
          {value !== null ? value.toFixed(1) : "—"}
        </p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
          <p className="text-xs text-slate-300 dark:text-slate-600 hidden sm:inline">
            {unit}
          </p>
        </div>
      </div>
    </div>
  );
}

interface Props {
  todayData: PricesResponse;
  tomorrowData: PricesResponse;
}

export default function DashboardClient({ todayData, tomorrowData }: Props) {
  const [activeTab, setActiveTab] = useState<"today" | "tomorrow">("today");
  const data = activeTab === "today" ? todayData : tomorrowData;

  const [ranges, setRanges] = useState<Range[]>([]);
  const handleRangesChange = useCallback((r: Range[]) => setRanges(r), []);

  const [threshold, setThreshold] = useState(0);
  useEffect(() => {
    const saved = localStorage.getItem("notification_threshold");
    if (saved !== null) setThreshold(Number(saved));
  }, []);
  const handleThresholdChange = useCallback((t: number) => {
    setThreshold(t);
    localStorage.setItem("notification_threshold", String(t));
  }, []);

  const { active, permission, toggle, supported } = useNotifications(
    data.date,
    ranges,
    threshold,
  );

  const [showIOSHint, setShowIOSHint] = useState(false);
  useEffect(() => {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone =
      (navigator as { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    setShowIOSHint(isIOS && !isStandalone);
  }, []);

  const [currentHour, setCurrentHour] = useState<number | null>(null);
  useEffect(() => {
    if (activeTab === "today") {
      setCurrentHour(
        Number(
          new Date().toLocaleString("en-US", {
            timeZone: "Europe/Belgrade",
            hour: "numeric",
            hour12: false,
          }),
        ) % 24,
      );
    } else {
      setCurrentHour(null);
    }
  }, [activeTab]);

  const validHours = data.hours.filter((h) => h.efektivna !== null);
  const avg =
    validHours.length > 0
      ? validHours.reduce((s, h) => s + h.efektivna!, 0) / validHours.length
      : null;
  const min =
    validHours.length > 0
      ? Math.min(...validHours.map((h) => h.efektivna!))
      : null;
  const max =
    validHours.length > 0
      ? Math.max(...validHours.map((h) => h.efektivna!))
      : null;
  const bestHour =
    validHours.length > 0
      ? validHours.reduce((best, h) =>
          h.efektivna! > best.efektivna! ? h : best,
        )
      : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c14]">
      {/* Top accent stripe */}
      <div className="h-0.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />

      {/* Sticky header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 dark:bg-slate-950/90 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-sm">
              <Sun className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                <span className="sm:hidden">Cene struje</span>
                <span className="hidden sm:inline">Cene električne energije</span>
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-none hidden sm:block">
                Srbija · {activeTab === "today" ? "današnje" : "sutrašnje"} cene
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <DataBadge ok={data.seepexAvailable} label="SEEPEX" />
            <DataBadge ok={data.cbcAvailable} label="CBC" />
            {showIOSHint && (
              <Link
                href="/setup"
                title="Postavi na iPhone za push obaveštenja"
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
              >
                <Smartphone className="w-3 h-3" />
                <span className="hidden sm:inline">Postavi</span>
              </Link>
            )}
            {supported && (
              <>
                <button
                  onClick={toggle}
                  disabled={permission === "denied"}
                  title={
                    permission === "denied"
                      ? "Notifikacije su blokirane u pregledaču"
                      : active
                        ? "Isključi upozorenja"
                        : "Uključi upozorenja (10 min pre intervala)"
                  }
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    active
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${active ? "bg-amber-500" : "bg-slate-400 dark:bg-slate-500"}`}
                  />
                  {active ? (
                    <Bell className="w-3 h-3" />
                  ) : (
                    <BellOff className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">
                    {active ? "Uključeno" : "Isključeno"}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
        {/* Today / Tomorrow toggle */}
        <div className="flex gap-2">
          {(
            [
              { key: "today" as const, label: "Danas" },
              { key: "tomorrow" as const, label: "Sutra" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 sm:flex-none sm:min-w-[88px] py-2 px-4 rounded-xl text-sm font-semibold transition-all ${
                activeTab === key
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 sm:p-5">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-1">
                Datum isporuke
              </p>
              <p className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100 capitalize leading-tight">
                {formatDisplayDate(data.date)}
              </p>
              {bestHour && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                  Najpovoljniji sat:{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {bestHour.label} · {bestHour.efektivna!.toFixed(2)} €/MWh
                  </span>
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Učitano
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                {new Date(data.fetchedAt).toLocaleTimeString("sr-RS", {
                  timeZone: "Europe/Belgrade",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <StatCard
            label="Minimum"
            value={min}
            icon={<TrendingDown className="w-4 h-4" />}
            iconClass="text-red-500 bg-red-50 dark:bg-red-950/40 dark:text-red-400"
            valueClass="text-red-600 dark:text-red-400"
          />
          <StatCard
            label="Prosek"
            value={avg}
            icon={<Minus className="w-4 h-4" />}
            iconClass="text-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400"
            valueClass="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            label="Maksimum"
            value={max}
            icon={<TrendingUp className="w-4 h-4" />}
            iconClass="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"
            valueClass="text-emerald-600 dark:text-emerald-400"
          />
        </div>

        {/* Chart card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Satna prognoza
            </h2>
            <span className="flex-shrink-0 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full font-mono whitespace-nowrap">
              P × 0.85 − CBC
            </span>
          </div>
          <div className="h-72 sm:h-80 lg:h-96">
            <PriceChart hours={data.hours} currentHour={currentHour} />
          </div>
        </div>

        {/* Threshold section */}
        <ThresholdSection
          hours={data.hours}
          threshold={threshold}
          onThresholdChange={handleThresholdChange}
          onRangesChange={handleRangesChange}
        />

        {/* Table card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Satni pregled
              <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                €/MWh
              </span>
            </h2>
          </div>
          <PriceTable hours={data.hours} currentHour={currentHour} />
        </div>

        <p className="text-xs text-center text-slate-400 dark:text-slate-600 pb-6 pt-1">
          Podaci: ENTSO-E Transparency Platform · NOSBiH aukcijski XML
        </p>
      </main>
    </div>
  );
}
