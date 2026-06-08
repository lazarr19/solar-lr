"use client";

import { useState, useEffect, useCallback } from "react";

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

export function useNotifications(threshold: number) {
  const supported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [mounted, setMounted] = useState(false);

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

  return {
    active,
    permission: mounted ? permission : ("default" as NotificationPermission),
    toggle,
    supported: mounted && supported,
  };
}
