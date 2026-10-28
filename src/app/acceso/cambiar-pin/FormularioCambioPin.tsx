"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Escudo } from "@/componentes/Escudo";
import { CampoPin } from "@/componentes/CampoPin";

/**
 * Cambio de PIN. Si el PIN es provisorio (primer ingreso o blanqueo) el
 * cambio es obligatorio; si no, se pide además el PIN actual.
 */
export function FormularioCambioPin({ nombre, provisorio }: { nombre: string; provisorio: boolean }) {
  const router = useRouter();
  const [actual, setActual] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [repetido, setRepetido] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (nuevo !== repetido) {
      setError("Los dos PIN nuevos no coinciden.");
      return;
    }
    setEnviando(true);
    const res = await fetch("/api/acceso/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actual: provisorio ? undefined : actual, nuevo }),
    });
    const datos = await res.json();
    setEnviando(false);
    if (!res.ok) {
      setError(datos.error);
      return;
    }
    router.replace(datos.destino);
    router.refresh();
  }

  const completo = nuevo.length === 6 && repetido.length === 6 && (provisorio || actual.length === 6);

  return (
    <main className="flex flex-1 flex-col items-center bg-[#121110] px-8 py-14 text-crema">
      <Escudo tamano={80} />
      <h1 className="font-display mt-6 text-3xl">{provisorio ? "Elegí tu PIN" : "Cambiar PIN"}</h1>
      <p className="mt-2 text-center text-sm text-crema/70">
        {provisorio
          ? `Hola, ${nombre}. Tu PIN es provisorio: reemplazalo por uno propio para continuar.`
          : nombre}
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-crema/60">
        <li>6 dígitos, sin secuencias (123456, 654321) ni dígitos repetidos (111111).</li>
        <li>No puede ser igual a ninguno de tus 3 últimos PIN.</li>
      </ul>

      <form onSubmit={enviar} className="mt-8 w-full space-y-5">
        {provisorio ? null : <CampoPin id="actual" etiqueta="PIN actual" valor={actual} onCambio={setActual} autoFocus />}
        <CampoPin id="nuevo" etiqueta="PIN nuevo" valor={nuevo} onCambio={setNuevo} autoFocus={provisorio} />
        <CampoPin id="repetido" etiqueta="Repetí el PIN nuevo" valor={repetido} onCambio={setRepetido} />
        {error ? (
          <p role="alert" className="rounded-lg bg-roja-texto/20 px-4 py-3 text-center text-sm font-semibold text-[#ffb4ab]">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={enviando || !completo}
          className="font-display w-full rounded-xl bg-crema py-4 text-2xl text-negro disabled:opacity-50"
        >
          {enviando ? "Guardando…" : "Guardar PIN"}
        </button>
      </form>
      {provisorio ? null : (
        <Link href="/gestion" className="mt-8 text-crema/70 underline underline-offset-4">
          Cancelar
        </Link>
      )}
    </main>
  );
}
