"use client";

import { useEffect } from "react";
import { warmUrls } from "@/lib/nav";

/**
 * Registers the service worker (public/sw.js) and asks it to cache every app
 * route. Production only: dev chunks aren't hashed and HMR fights the cache.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        registration.active?.postMessage({ type: "WARM", urls: warmUrls() });
      })
      .catch(() => {
        // Offline support is an enhancement; the app works without it.
      });
  }, []);

  return null;
}
