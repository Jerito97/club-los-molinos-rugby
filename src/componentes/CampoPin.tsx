"use client";

import { useRef } from "react";

/**
 * Campo de PIN de 6 dígitos: un input numérico (abre el teclado numérico en
 * el celular) con seis puntos que se completan a medida que se escribe.
 */
export function CampoPin({
  valor,
  onCambio,
  etiqueta,
  autoFocus = false,
  deshabilitado = false,
  id,
}: {
  valor: string;
  onCambio: (v: string) => void;
  etiqueta: string;
  autoFocus?: boolean;
  deshabilitado?: boolean;
  id: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-center text-sm text-crema/80">
        {etiqueta}
      </label>
      <div
        className="relative flex h-16 items-center justify-center gap-4 rounded-xl border border-white/20 bg-[#1e1c1a]"
        onClick={() => ref.current?.focus()}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full transition-colors ${i < valor.length ? "bg-crema" : "bg-white/25"}`}
          />
        ))}
        <input
          ref={ref}
          id={id}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={6}
          autoFocus={autoFocus}
          disabled={deshabilitado}
          value={valor}
          onChange={(e) => onCambio(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
        />
      </div>
    </div>
  );
}
