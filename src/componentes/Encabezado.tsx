import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Escudo } from "./Escudo";

/**
 * Encabezado bordó de cada pantalla. Con `volver` muestra una flecha para
 * regresar en lugar del escudo.
 */
export function Encabezado({
  titulo,
  subtitulo,
  volver,
  accion,
}: {
  titulo: string;
  subtitulo?: string;
  volver?: string;
  accion?: React.ReactNode;
}) {
  return (
    <header className="encabezado sticky top-0 z-30 flex items-center gap-3 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] text-crema">
      {volver ? (
        <Link href={volver} aria-label="Volver" className="-ml-1 rounded-full p-1 hover:bg-white/10">
          <ChevronLeft size={26} />
        </Link>
      ) : (
        <Escudo tamano={44} className="shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-display truncate text-[26px] leading-none">{titulo}</h1>
        {subtitulo ? <p className="mt-1 truncate text-sm text-crema/75">{subtitulo}</p> : null}
      </div>
      {accion}
    </header>
  );
}
