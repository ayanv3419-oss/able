const CACHE_NAME = "able-shell-v1";
const OFFLINE_FALLBACK = "/download";
const SHELL_ASSETS = [
  OFFLINE_FALLBACK,
  "/icon.svg",
  "/manifest.webmanifest",
  "/pwa/icon-192",
  "/pwa/icon-512",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function respondWithInstallAsset(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_FALLBACK))
    );
    return;
  }

  const isInstallAsset =
    url.pathname === "/icon.svg" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/pwa/");
  if (!isInstallAsset) {
    return;
  }

  event.respondWith(respondWithInstallAsset(request));
});
