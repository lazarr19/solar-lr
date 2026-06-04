"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface NotificationRange {
  startHour: number;
  endHour: number;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Convert a Belgrade local date+hour to a UTC ms timestamp.
function belgradeDateHourToUTC(date: string, hour: number): number {
  const [y, m, d] = date.split("-").map(Number);
  const probeUTC = Date.UTC(y, m - 1, d, 12, 0, 0);
  const belgHourAtNoon =
    parseInt(
      new Intl.DateTimeFormat("en", {
        timeZone: "Europe/Belgrade",
        hour: "numeric",
        hour12: false,
      }).format(new Date(probeUTC)),
      10
    ) % 24;
  const offsetHours = belgHourAtNoon - 12;
  return Date.UTC(y, m - 1, d, hour - offsetHours, 0, 0);
}

async function showViaReg(
  title: string,
  options: NotificationOptions & { tag: string }
) {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(title, options);
}

export function useNotifications(date: string, ranges: NotificationRange[]) {
  const supported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator;

  // SSR-safe: all start false/"default", synced after hydration
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [mounted, setMounted] = useState(false);

  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setMounted(true);
    if (!supported) return;
    setPermission(Notification.permission);
    // Default enabled on first visit (no key stored yet means opted-in)
    setEnabled(localStorage.getItem("notifications_enabled") !== "false");
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, [supported]);

  // Schedule / clear whenever anything changes
  useEffect(() => {
    if (!mounted || !supported) return;

    // Cancel existing timers
    for (const id of timeoutIds.current) clearTimeout(id);
    timeoutIds.current = [];

    const active = enabled && permission === "granted";
    if (!active || ranges.length === 0) return;

    const now = Date.now();
    for (const r of ranges) {
      const startMs =
        belgradeDateHourToUTC(date, r.startHour) - 10 * 60 * 1000;
      if (startMs > now) {
        const id = setTimeout(() => {
          showViaReg("⚡ Uključite postrojenje za 10 min", {
            body: `Interval rada: ${pad(r.startHour)}:00 – ${pad(r.endHour)}:00`,
            icon: "/icon-192.png",
            tag: `on-${date}-${r.startHour}`,
          }).catch(() => {});
        }, startMs - now);
        timeoutIds.current.push(id);
      }

      const endMs =
        belgradeDateHourToUTC(date, r.endHour) - 10 * 60 * 1000;
      if (endMs > now) {
        const id = setTimeout(() => {
          showViaReg("⚡ Isključite postrojenje za 10 min", {
            body: `Kraj intervala u ${pad(r.endHour)}:00`,
            icon: "/icon-192.png",
            tag: `off-${date}-${r.endHour}`,
          }).catch(() => {});
        }, endMs - now);
        timeoutIds.current.push(id);
      }
    }

    return () => {
      for (const id of timeoutIds.current) clearTimeout(id);
      timeoutIds.current = [];
    };
  }, [mounted, supported, enabled, permission, date, ranges]);

  // "active" = the system is actually working right now
  const active = mounted && enabled && permission === "granted";

  const toggle = useCallback(async () => {
    if (!supported) return;

    if (active) {
      // Turn off
      setEnabled(false);
      localStorage.setItem("notifications_enabled", "false");
    } else {
      // Turn on — request permission if not yet granted
      let perm = Notification.permission;
      if (perm === "default") {
        perm = await Notification.requestPermission();
        setPermission(perm);
      }
      if (perm !== "granted") return;
      setEnabled(true);
      localStorage.setItem("notifications_enabled", "true");
    }
  }, [supported, active]);

  const sendTest = useCallback(async () => {
    if (!supported) return;
    let perm = Notification.permission;
    if (perm === "default") {
      perm = await Notification.requestPermission();
      setPermission(perm);
    }
    if (perm !== "granted") return;
    // 5-second delay so the user can switch away from the tab
    setTimeout(() => {
      showViaReg("⚡ Test upozorenje", {
        body: "Sistem notifikacija radi ispravno!",
        icon: "/icon-192.png",
        tag: "test",
      }).catch(() => {});
    }, 5000);
  }, [supported]);

  return { active, permission: mounted ? permission : "default" as NotificationPermission, toggle, supported: mounted && supported, sendTest };
}
