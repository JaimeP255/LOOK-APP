// Service worker mínimo para Planells
// -------------------------------------
// A propósito NO cachea nada todavía. Su único trabajo ahora mismo es
// existir y estar registrado: Chrome en Android exige un service worker
// con un listener de "fetch" para considerar una web "instalable de
// verdad" (modo standalone, sin barra de navegador) en vez de tratar
// "Añadir a pantalla de inicio" como un simple acceso directo con la
// barra de direcciones visible.
//
// Si en el futuro quieres soporte offline real (que la app cargue algo
// aunque no haya conexión), aquí es donde se añadiría el cacheo de los
// assets estáticos — pero eso es una decisión aparte, con sus propias
// implicaciones (hay que gestionar versiones de caché con cuidado para
// no quedarte viendo una versión antigua de la app). De momento, mejor
// mantenerlo simple y no arriesgarnos a ese problema mientras la app
// sigue cambiando a diario.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Dejamos pasar todas las peticiones a la red tal cual, sin cachear.
  event.respondWith(fetch(event.request));
});
