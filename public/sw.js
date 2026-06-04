/* eslint-disable no-undef */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? "⚡ Upozorenje", {
      body: data.body ?? "",
      icon: "/icon-192.png",
      tag: data.tag ?? "push",
      data: { url: "/" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow("/")))
  );
});
