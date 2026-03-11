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

export async function checkAndApplyLatestVersion(): Promise<UpdateCheckResult> {
  try {
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

    const response = await fetch(`/index.html?_v=${Date.now()}`, {
      cache: "no-store",
    });

    if (!response.ok) return "up-to-date";

    const latestBundlePath = extractBundlePath(await response.text());
    const currentBundlePath = getCurrentBundlePath();

    if (latestBundlePath && currentBundlePath && latestBundlePath !== currentBundlePath) {
      triggerReload();
      return "updated";
    }

    return "up-to-date";
  } catch {
    return "error";
  }
}
