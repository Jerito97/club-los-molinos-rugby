"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** "Ver / reabrir": muestra la carga del partido jugado y permite reabrirla. */
export function BotonReabrir({ id_partido }: { id_partido: number }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reabrir() {
    const res = await fetch(`/api/partidos/${id_partido}/reabrir`, { method: "POST" });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    router.push(`/gestion/partidos/${id_partido}/carga`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="shrink-0 rounded-xl bg-bordo px-4 py-2.5 text-sm font-semibold text-crema"
      >
        Ver / reabrir
      </button>
      {abierto ? (
        <div className="absolute right-0 z-20 mt-2 w-56 space-y-2 rounded-xl bg-white p-3 text-sm shadow-lg">
          <Link href={`/partidos/${id_partido}`} className="block rounded-lg px-2 py-2 hover:bg-crema">
            Ver el partido
          </Link>
          <button onClick={reabrir} className="block w-full rounded-lg px-2 py-2 text-left text-bordo hover:bg-crema">
            Reabrir la carga
          </button>
          {error ? <p className="px-2 text-xs text-roja-texto">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
