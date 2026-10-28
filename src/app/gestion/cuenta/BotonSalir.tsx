"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Cierra la sesión antes de su vencimiento. */
export function BotonSalir() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);
  async function salir() {
    setSaliendo(true);
    await fetch("/api/acceso/salir", { method: "POST" });
    router.replace("/");
    router.refresh();
  }
  return (
    <button
      onClick={salir}
      disabled={saliendo}
      className="w-full rounded-xl bg-bordo py-3 font-semibold text-crema disabled:opacity-60"
    >
      {saliendo ? "Cerrando sesión…" : "Cerrar sesión"}
    </button>
  );
}
