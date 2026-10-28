"use client";

import { useEffect, useState } from "react";
import { ETIQUETA_TIEMPO, formatearReloj, segundosDeJuego } from "@/dominio/partido";
import type { RelojJson } from "@/servicios/consultas";

/** Reloj del partido (mm:ss) y tiempo de juego. Avanza solo en el navegador. */
export function RelojPartido({ reloj, compacto = false }: { reloj: RelojJson; compacto?: boolean }) {
  // El servidor y el navegador pueden diferir por un segundo: el texto del
  // reloj se marca con suppressHydrationWarning.
  const [ahora, setAhora] = useState<Date>(() => new Date());
  useEffect(() => {
    if (!reloj.corriendo_desde) return;
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, [reloj.corriendo_desde]);

  const estado = { ...reloj, corriendo_desde: reloj.corriendo_desde ? new Date(reloj.corriendo_desde) : null };
  const segundos = segundosDeJuego(estado, ahora);
  const mostrarReloj = reloj.tiempo !== "PREVIA" && reloj.tiempo !== "ENTRETIEMPO";

  return (
    <div className="flex flex-col items-center leading-none">
      {mostrarReloj ? (
        <span className={`font-display tabular-nums ${compacto ? "text-xl" : "text-4xl"}`} suppressHydrationWarning>
          {formatearReloj(segundos)}
        </span>
      ) : null}
      <span className={`mt-1 uppercase tracking-wider text-negro/55 ${compacto ? "text-[10px]" : "text-xs"}`}>
        {ETIQUETA_TIEMPO[reloj.tiempo]}
      </span>
    </div>
  );
}
