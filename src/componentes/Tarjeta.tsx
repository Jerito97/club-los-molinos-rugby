import type { ReactNode } from "react";

/** Contenedor blanco redondeado, base de casi todas las pantallas. */
export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-[#fbf9f5] shadow-sm shadow-black/5 ${className}`}>{children}</div>;
}

/** Título de sección: mayúsculas condensadas en bordó, con una acción opcional a la derecha. */
export function TituloSeccion({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="font-display text-2xl leading-none text-bordo">{children}</h2>
      {accion}
    </div>
  );
}

/** Mensaje para cuando no hay datos que mostrar. */
export function Vacio({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-white/60 px-4 py-6 text-center text-sm text-negro/60">{children}</p>;
}
