// Recipe Builder — service worker
// Caches only the app shell (this page + icons + manifest) so the app opens
// instantly and works offline in guest mode. Firebase/Firestore/network
// requests are always left to pass through untouched — never cached here,
// so sign-in and saved-recipe sync always use live data when online.

const CACHE_NAME = "recipe-builder-shell-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests for the app shell itself.
  // Anything else (Firebase, Firestore, Google Fonts, gstatic CDN) is left
  // completely alone — no respondWith() means the browser handles it normally.
  const isShellFile = url.origin === self.location.origin &&
    event.request.method === "GET" &&
    SHELL_FILES.some((f) => url.pathname.endsWith(f.replace("./", "")));

  if (!isShellFile) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
