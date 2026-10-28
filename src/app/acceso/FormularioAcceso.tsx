"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Escudo } from "@/componentes/Escudo";
import { CampoPin } from "@/componentes/CampoPin";

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

/** Pantalla de acceso de colaboradores y dirigentes: solo el PIN, sin usuario ni correo. */
export function FormularioAcceso() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 6) {
      setError("El PIN tiene 6 dígitos.");
      return;
    }
    setEnviando(true);
    setError(null);
    setAviso(null);
    const res = await fetch("/api/acceso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const datos = await res.json();
    setEnviando(false);
    if (res.ok) {
      router.replace(datos.destino);
      router.refresh();
      return;
    }
    setPin("");
    setError(datos.error);
    if (datos.bloqueadoHasta) setAviso(`Podés volver a intentar a las ${hora(datos.bloqueadoHasta)}.`);
    else if (typeof datos.restantes === "number" && datos.restantes < 5)
      setAviso(`Te quedan ${datos.restantes} ${datos.restantes === 1 ? "intento" : "intentos"} antes del bloqueo.`);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#121110] px-8 py-16 text-crema">
      <Escudo tamano={120} />
      <h1 className="font-display mt-8 text-4xl">Acceso</h1>
      <p className="mt-2 text-crema/60">Colaboradores y dirigentes</p>

      <form onSubmit={enviar} className="mt-10 w-full space-y-5">
        <CampoPin id="pin" etiqueta="Ingresá tu PIN" valor={pin} onCambio={setPin} autoFocus />
        {error ? (
          <div role="alert" className="rounded-lg bg-roja-texto/20 px-4 py-3 text-center text-sm text-[#ffb4ab]">
            <p className="font-semibold">{error}</p>
            {aviso ? <p className="mt-1 text-[#ffd8d3]">{aviso}</p> : null}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={enviando || pin.length !== 6}
          className="font-display w-full rounded-xl bg-crema py-4 text-2xl text-negro disabled:opacity-50"
        >
          {enviando ? "Verificando…" : "Ingresar"}
        </button>
      </form>

      <Link href="/" className="mt-8 text-crema/70 underline underline-offset-4">
        Volver a la app
      </Link>
    </main>
  );
}
