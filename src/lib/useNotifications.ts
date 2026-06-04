"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface NotificationRange {
  startHour: number;
  endHour: number;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

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

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return view;
}

function getDeviceId(): string {
  let id = localStorage.getItem("push_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("push_device_id", id);
  }
  return id;
}

async function showViaReg(
  title: string,
  options: NotificationOptions & { tag: string }
) {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(title, options);
}

export function useNotifications(date: string, ranges: NotificationRange[], threshold: number) {
  const supported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [mounted, setMounted] = useState(false);

  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setMounted(true);
    if (!supported) return;
    setPermission(Notification.permission);
    setEnabled(localStorage.getItem("notifications_enabled") !== "false");
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, [supported]);

  // Sync push subscription with server whenever enabled+granted and threshold changes
  useEffect(() => {
    if (!mounted || !supported || !enabled || permission !== "granted") return;

    const id = setTimeout(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON(), threshold, deviceId: getDeviceId() }),
        });
      } catch {
        // non-fatal
      }
    }, 800);

    return () => clearTimeout(id);
  }, [mounted, supported, enabled, permission, threshold]);

  // Schedule local setTimeout notifications (works while app is open)
  useEffect(() => {
    if (!mounted || !supported) return;

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

  const active = mounted && enabled && permission === "granted";

  const toggle = useCallback(async () => {
    if (!supported) return;

    if (active) {
      setEnabled(false);
      localStorage.setItem("notifications_enabled", "false");

      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint, deviceId: getDeviceId() }),
          }).catch(() => {});
          await sub.unsubscribe();
        }
      } catch {
        // non-fatal
      }
    } else {
      let perm = Notification.permission;
      if (perm === "default") {
        perm = await Notification.requestPermission();
        setPermission(perm);
      }
      if (perm !== "granted") return;
      setEnabled(true);
      localStorage.setItem("notifications_enabled", "true");

      try {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) throw new Error("VAPID key not configured");
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
        }
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON(), threshold, deviceId: getDeviceId() }),
        });
      } catch (err) {
        console.warn("Push subscription failed:", err);
      }
    }
  }, [supported, active, threshold]);

  const sendTest = useCallback(async () => {
    if (!supported) return;
    let perm = Notification.permission;
    if (perm === "default") {
      perm = await Notification.requestPermission();
      setPermission(perm);
    }
    if (perm !== "granted") return;
    setTimeout(() => {
      showViaReg("⚡ Test upozorenje", {
        body: "Sistem notifikacija radi ispravno!",
        icon: "/icon-192.png",
        tag: "test",
      }).catch(() => {});
    }, 5000);
  }, [supported]);

  return {
    active,
    permission: mounted ? permission : ("default" as NotificationPermission),
    toggle,
    supported: mounted && supported,
    sendTest,
  };
}
