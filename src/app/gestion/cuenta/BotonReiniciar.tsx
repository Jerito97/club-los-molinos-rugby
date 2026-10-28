"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { llamar } from "@/lib/cliente";

/** Deja la base en el estado inicial, para volver a mostrar el flujo completo. */
export function BotonReiniciar() {
  const router = useRouter();
  const [estado, setEstado] = useState<"listo" | "reiniciando" | "hecho" | string>("listo");
  async function reiniciar() {
    if (!confirm("¿Reiniciar la demo? Se borran todos los cambios y la base vuelve al estado inicial.")) return;
    setEstado("reiniciando");
    const r = await llamar("/api/demo/reiniciar", "POST");
    setEstado(r.ok ? "hecho" : (r.mensaje ?? "No se pudo reiniciar."));
    router.refresh();
  }
  return (
    <div className="space-y-2">
      <button
        onClick={reiniciar}
        disabled={estado === "reiniciando"}
        className="w-full rounded-xl border border-roja-borde py-3 font-semibold text-roja-texto disabled:opacity-50"
      >
        {estado === "reiniciando" ? "Reiniciando…" : "Reiniciar demo"}
      </button>
      {estado === "hecho" ? <p className="text-center text-sm text-[#1f5f3a]">Listo: los datos volvieron al estado inicial.</p> : null}
      {!["listo", "reiniciando", "hecho"].includes(estado) ? <p className="text-center text-sm text-roja-texto">{estado}</p> : null}
    </div>
  );
}
