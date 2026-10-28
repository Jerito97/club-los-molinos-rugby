"use client";

import { useEffect } from "react";

/** Registra una visita anónima al marcador (una por apertura de la pantalla). */
export function RegistrarVisita({ id_partido }: { id_partido: number }) {
  useEffect(() => {
    fetch(`/api/partidos/${id_partido}/visita`, { method: "POST" }).catch(() => {});
  }, [id_partido]);
  return null;
}
