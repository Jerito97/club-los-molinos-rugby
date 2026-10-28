import Link from "next/link";
import { Escudo } from "@/componentes/Escudo";

export default function NoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-20 text-center">
      <Escudo tamano={90} />
      <h1 className="font-display text-4xl text-bordo">No encontramos esa página</h1>
      <p className="text-negro/60">Puede que el partido o el jugador ya no exista.</p>
      <Link href="/" className="rounded-xl bg-bordo px-6 py-3 font-semibold text-crema">
        Volver al inicio
      </Link>
    </main>
  );
}
