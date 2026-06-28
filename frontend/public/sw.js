// Philix Finance Service Worker — PWA offline support v2
const CACHE_NAME = "philix-v2";
const STATIC_ASSETS = [
  "/",
  "/portal",
  "/portal/dashboard",
  "/portal/loans",
  "/portal/calculator",
  "/manifest.json",
  "/logo-icon.svg",
  "/logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── IndexedDB offline write queue ─────────────────────────────────────────────
const OFFLINE_QUEUE_DB = "philix-offline-queue";
const QUEUE_STORE = "pending-requests";

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_QUEUE_DB, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function queueRequest(url, method, headers, body) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).add({ url, method, headers, body, queued: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

async function replayQueue() {
  const db = await openQueueDB();
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const req = tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  for (const item of items) {
    try {
      await fetch(item.url, { method: item.method, headers: item.headers, body: item.body });
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      tx.objectStore(QUEUE_STORE).delete(item.id);
    } catch { /* still offline */ }
  }
}

self.addEventListener("message", (event) => {
  if (event.data === "SYNC_QUEUE") replayQueue();
});

self.addEventListener("sync", (event) => {
  if (event.tag === "philix-sync") event.waitUntil(replayQueue());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // API writes: queue if offline
  if (url.pathname.startsWith("/api/") && request.method !== "GET") {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        const body = await request.clone().text().catch(() => null);
        await queueRequest(request.url, request.method, Object.fromEntries(request.headers.entries()), body);
        return new Response(
          JSON.stringify({ ok: true, queued: true, message: "Queued for sync when online" }),
          { status: 202, headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // API GETs: network-first, no cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "Offline", offline: true }), {
          status: 503, headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Static/navigation: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkPromise = fetch(request)
        .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
        .catch(() => null);
      return cached || networkPromise || new Response("Offline", { status: 503 });
    })
  );
});
