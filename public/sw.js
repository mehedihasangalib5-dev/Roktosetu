// RoktoSetu service worker: offline app shell + runtime caching. Firebase/Auth API calls are never cached
// (Firestore has its own offline persistence inside the app).
const V = "roktosetu-v1", RT = V + "-rt", TILES = V + "-tiles";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];
const bypass = (u) =>
  /^(firestore|identitytoolkit|securetoken|firebaseinstallations)\.googleapis\.com$/.test(u.hostname) ||
  /^(www\.googleapis\.com|accounts\.google\.com|apis\.google\.com)$/.test(u.hostname) ||
  u.pathname.startsWith("/__/");

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(V)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function swr(name, req) {
  const c = await caches.open(name), hit = await c.match(req);
  const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(() => hit || Response.error());
  return hit || net;
}
async function tile(req, max) {
  const c = await caches.open(TILES), hit = await c.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) { c.put(req, res.clone()); c.keys().then((k) => { if (k.length > max) c.delete(k[0]); }); }
    return res;
  } catch (e) { return Response.error(); }
}

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (bypass(u)) return;
  if (r.mode === "navigate") {
    e.respondWith(
      fetch(r).then((res) => { const cp = res.clone(); caches.open(V).then((c) => c.put("/", cp)); return res; })
        .catch(() => caches.match("/").then((x) => x || caches.match("/index.html")))
    );
    return;
  }
  if (u.hostname === "tile.openstreetmap.org") { e.respondWith(tile(r, 150)); return; }
  e.respondWith(swr(u.origin === location.origin ? V : RT, r));
});
