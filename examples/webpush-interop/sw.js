/**
 * Minimal service worker for Web Push interop.
 * Decrypts are handled by the browser; we only display the payload JSON.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "sently webpush interop", body: "(empty payload)" };

  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch {
    payload = {
      title: "sently webpush interop",
      body: event.data ? event.data.text() : "(unreadable payload)",
    };
  }

  const title = typeof payload.title === "string" ? payload.title : "sently webpush interop";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "",
    data: payload.data,
    icon: typeof payload.icon === "string" ? payload.icon : undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
});
