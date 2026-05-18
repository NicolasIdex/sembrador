const CACHE_SEDA = "sembrador-vault-v2";
const ASSETS = [
  "./index.html",
  "./styles.css",
  "./acordes-style.css",
  "./script.js",
  "./acordes-engine.js"
];

// Almacena los archivos en la memoria de la tableta al abrir la app con red
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_SEDA).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_SEDA) return caches.delete(key);
        })
      );
    })
  );
});

// Si la tableta no tiene internet, saca la copia guardada al instante
self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("://googleapis.com") || e.request.url.includes("firebaseapp.com")) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(e.request).catch(() => console.warn("Modo Offline"));
    })
  );
});
