const CACHE_NAME = "lifting-study-v1";
const BASE_PATH = "/Lifting-Study/";

const CORE_PAGES = [
  BASE_PATH,
  BASE_PATH + "index.html",
  BASE_PATH + "calculation.html",
  BASE_PATH + "study-notes.html",
  BASE_PATH + "study-notes/tuv/index.html",
  BASE_PATH + "study-notes/tuv/mcqs.html",
  BASE_PATH + "study-notes/tuv/questions-answers.html",
  BASE_PATH + "study-notes/tuv/calculations-questions-answer.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    await Promise.all(CORE_PAGES.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "reload" });

        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        // Skip pages that cannot be fetched during installation.
      }
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter((key) =>
          key.startsWith("lifting-study-") &&
          key !== CACHE_NAME
        )
        .map((key) => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(BASE_PATH)
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        const cached = await caches.match(request);

        if (cached) return cached;

        const path = url.pathname.endsWith("/")
          ? url.pathname + "index.html"
          : url.pathname;

        return await caches.match(path) ||
          new Response(
            "This page is not available offline yet. Connect to the internet and open it once.",
            {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" }
            }
          );
      }
    })());

    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);

      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    } catch (error) {
      return new Response("This resource is unavailable offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
