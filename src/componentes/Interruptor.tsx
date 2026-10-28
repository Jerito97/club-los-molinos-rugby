"use client";

/** Interruptor (switch) accesible. */
export function Interruptor({
  activo,
  onCambio,
  deshabilitado,
  etiqueta,
  chico = false,
}: {
  activo: boolean;
  onCambio: () => void;
  deshabilitado?: boolean;
  etiqueta: string;
  chico?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      disabled={deshabilitado}
      onClick={onCambio}
      className={`relative shrink-0 rounded-full transition-colors disabled:opacity-40 ${chico ? "h-7 w-12" : "h-8 w-14"} ${
        activo ? "bg-bordo" : "bg-negro/20"
      }`}
    >
      <span
        className={`absolute left-1 top-1 rounded-full bg-crema shadow transition-transform ${chico ? "h-5 w-5" : "h-6 w-6"} ${
          activo ? (chico ? "translate-x-5" : "translate-x-6") : "translate-x-0"
        }`}
      />
    </button>
  );
}
