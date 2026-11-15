/* Service worker — by Lollo ®2026
   1. tiene sul telefono i file dell'app: si apre anche senza rete;
   2. si accorge delle nuove versioni (cambia versione.js) e aspetta il pulsante «Aggiorna».
   L'elenco dei file qui sotto lo scrive crea_pwa_zip.py a ogni versione. */
importScripts('versione.js'); // definisce self.VERSIONE

const CACHE = 'lollomap-' + self.VERSIONE;
const FILE = [
  "campo/.nojekyll",
  "campo/css/app.css",
  "campo/data/alberi.js",
  "campo/data/n2000.js",
  "campo/data/schede_ricerca.js",
  "campo/data/wmm.js",
  "campo/gpslogger/atlante.properties",
  "campo/icons/icon-192.png",
  "campo/icons/icon-512.png",
  "campo/icons/icon-maskable-512.png",
  "campo/index.html",
  "campo/js/01-base.js",
  "campo/js/02-mappa.js",
  "campo/js/03-gps-tracce.js",
  "campo/js/04-punti.js",
  "campo/js/05-scheda.js",
  "campo/js/06-esporta.js",
  "campo/js/07-esplora.js",
  "campo/js/08-dossier.js",
  "campo/js/09-vicino.js",
  "campo/js/10-pwa.js",
  "campo/js/11-altro.js",
  "campo/js/12-bussola.js",
  "campo/js/13-avvio.js",
  "campo/js/14-fonti.js",
  "campo/js/15-luoghi.js",
  "campo/js/16-drive.js",
  "campo/js/17-percorsi.js",
  "campo/js/18-capitoli.js",
  "campo/js/19-novita.js",
  "campo/js/20-interfaccia.js",
  "campo/js/21-gpslogger.js",
  "campo/js/22-astro.js",
  "campo/js/23-campo.js",
  "campo/js/24-soste.js",
  "campo/js/25-ai.js",
  "campo/js/26-supericerca.js",
  "campo/js/27-crescita.js",
  "campo/js/28-zona.js",
  "campo/js/29-pro-bridge.js",
  "campo/js/version.js",
  "campo/lib/leaflet/images/layers-2x.png",
  "campo/lib/leaflet/images/layers.png",
  "campo/lib/leaflet/images/marker-icon-2x.png",
  "campo/lib/leaflet/images/marker-icon.png",
  "campo/lib/leaflet/images/marker-shadow.png",
  "campo/lib/leaflet/leaflet-rotate.js",
  "campo/lib/leaflet/leaflet.css",
  "campo/lib/leaflet/leaflet.js",
  "campo/manifest.webmanifest",
  "campo/pro-campo.css",
  "campo/sw.js",
  "icone/icona-192.png",
  "icone/icona-512.png",
  "icone/icona-maskable-512.png",
  "index.html",
  "lib/LICENSE-sqljs.txt",
  "lib/sql-wasm.js",
  "lib/sql-wasm.wasm",
  "manifest.webmanifest",
  "pro.css",
  "pro.js",
  "pwa.js",
  "rilievo3d.js",
  "versione.js",
  "versione.json",
  "vettori.js"
];

self.addEventListener('install', (e) => {
  // cache: 'reload' = scarica davvero i file nuovi, saltando la cache del browser
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILE.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const nome of await caches.keys()) {
      if (/^lollomap-\d/.test(nome) && nome !== CACHE) await caches.delete(nome);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  const tipo = e.data && e.data.tipo;
  if (tipo === 'versione' && e.ports[0]) e.ports[0].postMessage(self.VERSIONE);
  if (tipo === 'attiva') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if(req.method==='GET'&&url.origin!==self.location.origin&&req.destination==='image'){
    e.respondWith(caches.open('atl-tiles').then(async c=>(await c.match(req.url))||fetch(req)));return;
  }
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const inCache = await cache.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' ? await cache.match('index.html') : undefined);
    return inCache || fetch(req);
  })());
});
