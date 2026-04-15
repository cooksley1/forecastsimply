export type UpdateCheckResult = "updated" | "up-to-date" | "error";

const extractBundlePath = (html: string): string | null => {
  const match = html.match(/\/assets\/index-[^"']+\.js/);
  return match?.[0] ?? null;
};

const getCurrentBundlePath = (): string | null => {
  const script = document.querySelector<HTMLScriptElement>('script[src*="/assets/index-"]');
  if (!script?.src) return null;

  try {
    return new URL(script.src, window.location.origin).pathname;
  } catch {
    return null;
  }
};

const triggerReload = () => {
  const url = new URL(window.location.href);
  url.searchParams.set("_refresh", Date.now().toString());
  window.location.replace(url.toString());
};

const waitForInstallingWorker = (registration: ServiceWorkerRegistration, timeoutMs = 6000) =>
  new Promise<void>((resolve) => {
    if (!registration.installing) {
      resolve();
      return;
    }

    const installingWorker = registration.installing;
    const timeout = window.setTimeout(() => {
      installingWorker.removeEventListener("statechange", onStateChange);
      resolve();
    }, timeoutMs);

    const onStateChange = () => {
      if (installingWorker.state === "installed" || installingWorker.state === "redundant") {
        clearTimeout(timeout);
        installingWorker.removeEventListener("statechange", onStateChange);
        resolve();
      }
    };

    installingWorker.addEventListener("statechange", onStateChange);
  });

/**
 * Fetch index.html bypassing the service worker by using the `url` trick
 * (adding a query param the SW navigateFallback won't match) AND
 * the `cache: "no-store"` header to also bypass the HTTP cache.
 */
const fetchLatestIndexHtml = async (): Promise<string | null> => {
  try {
    // Use the origin directly with a cache-busting param.
    // Workbox navigateFallback only handles navigation requests;
    // a plain fetch with `redirect: "manual"` and `cache: "no-store"` bypasses precache.
    const res = await fetch(`/index.html?_nocache=${Date.now()}`, {
      cache: "no-store",
      headers: { "Service-Worker-Navigation-Preload": "false" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
};

export async function forceHardRefresh(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.unregister();
    }
    // Clear all caches
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch { /* proceed to reload anyway */ }

  const url = new URL(window.location.href);
  url.searchParams.set("_force", Date.now().toString());
  window.location.replace(url.toString());
}

export async function checkAndApplyLatestVersion(): Promise<UpdateCheckResult> {
  try {
    // --- 1. Service Worker path ---
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();

      if (registration) {
        await registration.update().catch(() => undefined);

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
          triggerReload();
          return "updated";
        }

        if (registration.installing) {
          await waitForInstallingWorker(registration);

          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
            triggerReload();
            return "updated";
          }
        }
      }
    }

    // --- 2. Bundle hash comparison (bypass SW cache) ---
    const latestHtml = await fetchLatestIndexHtml();
    if (!latestHtml) return "up-to-date";

    const latestBundlePath = extractBundlePath(latestHtml);
    const currentBundlePath = getCurrentBundlePath();

    if (latestBundlePath && currentBundlePath && latestBundlePath !== currentBundlePath) {
      // Unregister the old SW so it doesn't serve stale assets after reload
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.unregister();
      }
      triggerReload();
      return "updated";
    }

    // --- 3. Fallback: if SW is active but we still suspect staleness,
    //     compare the version string baked into the HTML ---
    const versionMatch = latestHtml.match(/__APP_VERSION__/);
    // If the fetched HTML contains a different bundle but we missed it,
    // force reload as a safety net
    if (latestBundlePath && !currentBundlePath) {
      triggerReload();
      return "updated";
    }

    return "up-to-date";
  } catch {
    return "error";
  }
}
