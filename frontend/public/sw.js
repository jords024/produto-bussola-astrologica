// Service Worker mínimo para habilitar instalação PWA no Android/iOS sem cachear chamadas de API.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through direto para rede
  return;
});
