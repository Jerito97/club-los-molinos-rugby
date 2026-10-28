"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Interruptor } from "@/componentes/Interruptor";
import { GRUPOS_NOTIFICACION } from "@/dominio/notificaciones";
import type { TipoEvento } from "@/dominio/tipos";

type Estado = "cargando" | "no-soportado" | "ios-sin-instalar" | "denegado" | "apagado" | "encendido";

/** Clave pública VAPID en el formato que pide PushManager.subscribe(). */
function claveAplicacion(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalada = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * Configuración de notificaciones (RF 9): interruptor general (permiso del
 * navegador + suscripción push) y un interruptor por tipo de evento. Si el
 * permiso está denegado o falta instalar la app (iOS), explica cómo hacerlo.
 */
export function ConfiguracionNotificaciones() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [preferencias, setPreferencias] = useState<Partial<Record<TipoEvento, boolean>>>({});
  const [abierto, setAbierto] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectar = async () => {
      const prefs = await fetch("/api/notificaciones").then((r) => r.json()).catch(() => null);
      if (prefs?.preferencias) setPreferencias(prefs.preferencias);
      const soportado = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!soportado) return setEstado(esIOS() && !instalada() ? "ios-sin-instalar" : "no-soportado");
      if (Notification.permission === "denied") return setEstado("denegado");
      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.getSubscription();
      setEstado(suscripcion && Notification.permission === "granted" ? "encendido" : "apagado");
    };
    detectar();
  }, []);

  async function alternarGeneral() {
    setOcupado(true);
    setError(null);
    try {
      const registro = await navigator.serviceWorker.ready;
      if (estado === "encendido") {
        const s = await registro.pushManager.getSubscription();
        if (s) {
          await fetch("/api/notificaciones/suscripcion", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: s.endpoint }),
          });
          await s.unsubscribe();
        }
        setEstado("apagado");
        return;
      }
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "denegado" : "apagado");
        return;
      }
      const clave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!clave) throw new Error("Las notificaciones no están configuradas en el servidor.");
      const s = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveAplicacion(clave) });
      const res = await fetch("/api/notificaciones/suscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s.toJSON()),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const prefs = await fetch("/api/notificaciones").then((r) => r.json());
      setPreferencias(prefs.preferencias);
      setEstado("encendido");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron activar las notificaciones.");
    } finally {
      setOcupado(false);
    }
  }

  async function alternarGrupo(tipos: TipoEvento[], activo: boolean) {
    const cambio = Object.fromEntries(tipos.map((t) => [t, activo]));
    const anterior = preferencias;
    setPreferencias({ ...preferencias, ...cambio });
    const res = await fetch("/api/notificaciones", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferencias: cambio }),
    });
    if (!res.ok) {
      setPreferencias(anterior);
      setError((await res.json()).error);
    }
  }

  const encendido = estado === "encendido";

  return (
    <section className="rounded-2xl bg-[#fbf9f5] p-5 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-bordo">Notificaciones</h2>
          <p className="text-negro/60">Avisos del partido en vivo.</p>
        </div>
        <Interruptor
          etiqueta="Notificaciones"
          activo={encendido}
          deshabilitado={ocupado || !["apagado", "encendido"].includes(estado)}
          onCambio={alternarGeneral}
        />
      </div>

      {estado === "denegado" ? (
        <div className="mt-4 rounded-xl bg-amarilla-fondo/70 p-3 text-sm text-amarilla-texto">
          <p className="font-semibold">Las notificaciones están bloqueadas en este navegador.</p>
          <p className="mt-1">
            Para habilitarlas, abrí la configuración del sitio (el candado junto a la dirección, o Ajustes del navegador →
            Notificaciones) y permití las notificaciones de esta app. Después volvé a esta pantalla.
          </p>
        </div>
      ) : null}
      {estado === "ios-sin-instalar" ? (
        <div className="mt-4 rounded-xl bg-amarilla-fondo/70 p-3 text-sm text-amarilla-texto">
          <p className="font-semibold">En iPhone, primero agregá la app a la pantalla de inicio.</p>
          <p className="mt-1">
            Tocá el botón Compartir de Safari y elegí &quot;Agregar a pantalla de inicio&quot;. Abrí la app desde ese ícono y
            activá las notificaciones acá.
          </p>
        </div>
      ) : null}
      {estado === "no-soportado" ? (
        <p className="mt-4 rounded-xl bg-black/5 p-3 text-sm text-negro/65">
          Este navegador no admite notificaciones. El marcador en vivo se puede seguir igual desde la app.
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm font-semibold text-roja-texto">{error}</p> : null}

      <div className="mt-4 border-t border-black/10 pt-3">
        <button onClick={() => setAbierto((v) => !v)} className="flex w-full items-center justify-between py-1 text-bordo">
          <span className="font-medium">Qué me querés avisar</span>
          <ChevronDown size={20} className={`transition-transform ${abierto ? "rotate-180" : ""}`} />
        </button>
        {abierto ? (
          <ul className="mt-2 space-y-3">
            {GRUPOS_NOTIFICACION.map((g) => {
              const activo = g.tipos.every((t) => preferencias[t] !== false);
              return (
                <li key={g.clave} className="flex items-center justify-between gap-4">
                  <span className={`text-[17px] ${encendido ? "" : "text-negro/45"}`}>{g.etiqueta}</span>
                  <Interruptor
                    chico
                    etiqueta={g.etiqueta}
                    activo={encendido && activo}
                    deshabilitado={!encendido}
                    onCambio={() => alternarGrupo(g.tipos, !activo)}
                  />
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
