"use client";

import { useEffect } from "react";

/** Registra el service worker (/sw.js), que recibe las notificaciones push. */
export function RegistroServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Sin service worker la app funciona igual; solo no recibe notificaciones.
      });
    }
  }, []);
  return null;
}
