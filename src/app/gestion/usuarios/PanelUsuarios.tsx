"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tarjeta, TituloSeccion } from "@/componentes/Tarjeta";
import { llamar } from "@/lib/cliente";
import { ROL } from "@/dominio/tipos";

type Usuario = { id_usuario: number; nombre: string; rol: string; activo: boolean; pin_provisorio: boolean; responsable: boolean };

const ROL_VISIBLE: Record<string, string> = { [ROL.CARGADOR]: "Colaborador", [ROL.VALIDADOR]: "Dirigente" };

/** Alta, baja lógica, reactivación y blanqueo de PIN. El PIN provisorio se muestra una sola vez. */
export function PanelUsuarios({ usuarios, id_actual }: { usuarios: Usuario[]; id_actual: number }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<string>(ROL.CARGADOR);
  const [pin, setPin] = useState<{ nombre: string; pin: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function ejecutar(url: string, body?: unknown) {
    setOcupado(true);
    setError(null);
    setPin(null);
    const res = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const datos = await res.json();
    setOcupado(false);
    if (!res.ok) {
      setError(datos.error);
      return false;
    }
    if (datos.pin) setPin({ nombre: datos.nombre, pin: datos.pin });
    router.refresh();
    return true;
  }

  async function baja(u: Usuario) {
    if (!confirm(`¿Dar de baja a ${u.nombre}? No va a poder ingresar, pero se conservan sus registros.`)) return;
    setOcupado(true);
    const r = await llamar(`/api/usuarios/${u.id_usuario}/baja`, "POST");
    setOcupado(false);
    if (!r.ok) setError(r.mensaje ?? null);
    router.refresh();
  }

  return (
    <>
      {pin ? (
        <div role="status" className="rounded-2xl border border-[#1f5f3a]/40 bg-[#d8eedf] p-4 text-[#1f5f3a]">
          <p className="text-sm">PIN provisorio de {pin.nombre}:</p>
          <p className="font-display text-5xl tracking-[0.2em]">{pin.pin}</p>
          <p className="mt-1 text-sm">
            Entregalo en forma personal. Se muestra solo esta vez y en el primer ingreso se pide cambiarlo.
          </p>
        </div>
      ) : null}
      {error ? <p className="rounded-xl bg-roja-fondo px-4 py-3 text-sm font-semibold text-roja-texto">{error}</p> : null}

      <section>
        <TituloSeccion>Alta de usuario</TituloSeccion>
        <Tarjeta className="space-y-3 p-4">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre y apellido"
            className="w-full rounded-xl border border-black/15 bg-white px-3 py-3"
          />
          <select value={rol} onChange={(e) => setRol(e.target.value)} className="w-full rounded-xl border border-black/15 bg-white px-3 py-3">
            <option value={ROL.CARGADOR}>Colaborador (carga eventos)</option>
            <option value={ROL.VALIDADOR}>Dirigente (valida eventos)</option>
          </select>
          <button
            disabled={ocupado || nombre.trim().length < 3}
            onClick={() => ejecutar("/api/usuarios", { nombre, rol }).then((ok) => ok && setNombre(""))}
            className="w-full rounded-xl bg-bordo py-3 font-semibold text-crema disabled:opacity-50"
          >
            Crear y generar PIN provisorio
          </button>
        </Tarjeta>
      </section>

      <section>
        <TituloSeccion>Usuarios habilitados</TituloSeccion>
        <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-[#fbf9f5] shadow-sm">
          {usuarios.map((u) => (
            <li key={u.id_usuario} className={`px-4 py-3 ${u.activo ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {u.nombre}
                    {u.id_usuario === id_actual ? " (vos)" : ""}
                  </p>
                  <p className="text-sm text-negro/55">
                    {ROL_VISIBLE[u.rol]}
                    {u.responsable ? " · Responsable de seguridad" : ""}
                    {!u.activo ? " · Dado de baja" : u.pin_provisorio ? " · PIN provisorio" : ""}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                {u.activo ? (
                  <>
                    <button
                      disabled={ocupado}
                      onClick={() => {
                        if (confirm(`¿Blanquear el PIN de ${u.nombre}? Se genera un PIN provisorio nuevo.`)) {
                          ejecutar(`/api/usuarios/${u.id_usuario}/blanqueo`);
                        }
                      }}
                      className="rounded-lg border border-bordo/30 px-3 py-1.5 text-sm font-semibold text-bordo"
                    >
                      Blanquear PIN
                    </button>
                    {u.id_usuario !== id_actual ? (
                      <button
                        disabled={ocupado}
                        onClick={() => baja(u)}
                        className="rounded-lg border border-roja-borde px-3 py-1.5 text-sm font-semibold text-roja-texto"
                      >
                        Dar de baja
                      </button>
                    ) : null}
                  </>
                ) : (
                  <button
                    disabled={ocupado}
                    onClick={() => ejecutar(`/api/usuarios/${u.id_usuario}/reactivar`)}
                    className="rounded-lg border border-bordo/30 px-3 py-1.5 text-sm font-semibold text-bordo"
                  >
                    Reactivar con PIN nuevo
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
