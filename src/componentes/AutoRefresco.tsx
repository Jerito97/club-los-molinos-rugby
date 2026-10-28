"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Vuelve a pedir los datos de la pantalla cada `segundos` (por defecto 5).
 * Así el marcador en vivo y la lista de pendientes se actualizan solos y un
 * evento validado se ve en mucho menos de los 30 s que fija el RNF 5.
 * Se pausa mientras la pestaña está oculta y se refresca al volver.
 */
export function AutoRefresco({ segundos = 5 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refrescar = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(refrescar, segundos * 1000);
    document.addEventListener("visibilitychange", refrescar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refrescar);
    };
  }, [router, segundos]);
  return null;
}
