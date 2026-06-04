"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sun, ArrowLeft, Bell, CheckCircle2, Share2, PlusSquare, Smartphone } from "lucide-react";

function Step({
  number,
  title,
  description,
  icon,
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">
        {number}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-slate-400 dark:text-slate-500">{icon}</span>
          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{title}</p>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export default function SetupPage() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsIOS(/iPhone|iPad|iPod/.test(navigator.userAgent));
    setIsStandalone(
      (navigator as { standalone?: boolean }).standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches
    );
    if ("Notification" in window) setNotifPermission(Notification.permission);
  }, []);

  const allDone = isStandalone && notifPermission === "granted";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c14]">
      <div className="h-0.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />

      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 dark:bg-slate-950/90 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-sm">
              <Sun className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Postavljanje na iPhone
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {mounted && allDone && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">
                Sve je postavljeno
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                Aplikacija je instalirana i obaveštenja su omogućena. Primaćete push poruke 5 minuta pre svakog intervala rada.
              </p>
            </div>
          </div>
        )}

        {mounted && isStandalone && !allDone && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-start gap-3">
            <Bell className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
                Aplikacija je instalirana
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                Sada tapnite zvono 🔔 na glavnoj stranici da biste omogućili push obaveštenja.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Instalacija na iPhone
            </h2>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
            Push obaveštenja na iPhone-u rade samo kada je aplikacija dodata na početni ekran.
          </p>

          <div className="space-y-5">
            <Step
              number={1}
              title="Otvorite u Safari"
              description="Aplikacija mora biti otvorena u Safari pregledaču — ne Chrome, ne Firefox."
              icon={<Sun className="w-3.5 h-3.5" />}
            />
            <div className="ml-4 border-l-2 border-slate-100 dark:border-slate-800" />
            <Step
              number={2}
              title='Tapnite dugme "Podeli"'
              description='Tapnite ikonicu kvadrata sa strelicom nagore na dnu ekrana.'
              icon={<Share2 className="w-3.5 h-3.5" />}
            />
            <div className="ml-4 border-l-2 border-slate-100 dark:border-slate-800" />
            <Step
              number={3}
              title='"Dodaj na početni ekran"'
              description="Skrolujte kroz listu opcija i tapnite Dodaj na početni ekran."
              icon={<PlusSquare className="w-3.5 h-3.5" />}
            />
            <div className="ml-4 border-l-2 border-slate-100 dark:border-slate-800" />
            <Step
              number={4}
              title="Otvorite sa početnog ekrana"
              description="Zatvorite Safari i otvorite aplikaciju tapom na ikonicu koja se pojavila."
              icon={<Smartphone className="w-3.5 h-3.5" />}
            />
            <div className="ml-4 border-l-2 border-slate-100 dark:border-slate-800" />
            <Step
              number={5}
              title="Omogućite obaveštenja"
              description="Tapnite zvono 🔔 u zaglavlju i odobrite dozvolu kada se pojavi dijaloški okvir."
              icon={<Bell className="w-3.5 h-3.5" />}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Zašto je ovo potrebno?
          </h2>
          <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <p>
              Apple omogućava push obaveštenja samo za web aplikacije instalirane na početnom ekranu — ne za obične Safari kartice.
            </p>
            <p>
              Nakon instalacije, primaćete obaveštenje <span className="font-medium text-slate-700 dark:text-slate-300">5 minuta pre</span> svakog intervala kada je cena struje iznad vašeg praga, čak i kada je aplikacija zatvorena.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Nazad na aplikaciju
        </Link>
      </main>
    </div>
  );
}
