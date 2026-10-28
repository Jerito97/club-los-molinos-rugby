import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { MotivoRechazo, Resultado } from "@/dominio/resultado";

/** Error con código HTTP: lo convierte en respuesta el envoltorio `api()`. */
export class ErrorHttp extends Error {
  constructor(
    public readonly status: number,
    mensaje: string
  ) {
    super(mensaje);
  }
}

const STATUS: Record<MotivoRechazo, number> = { permiso: 403, conflicto: 409, datos: 422 };

/** Devuelve el valor de un Resultado del dominio o lanza el ErrorHttp correspondiente. */
export function exigir<T>(r: Resultado<T>): T {
  if (!r.ok) throw new ErrorHttp(STATUS[r.motivo], r.mensaje);
  return r.valor;
}

type Manejador<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/**
 * Envoltorio de las API routes: convierte los errores en respuestas JSON
 * ({ error }) y rechaza los pedidos que modifican datos desde otro origen
 * (defensa adicional a la cookie SameSite contra CSRF).
 */
export function api<C>(manejador: Manejador<C>): Manejador<C> {
  return async (req, ctx) => {
    try {
      if (req.method !== "GET") {
        const origen = req.headers.get("origin");
        if (origen && new URL(origen).host !== req.headers.get("host")) {
          throw new ErrorHttp(403, "Origen no permitido.");
        }
      }
      return await manejador(req, ctx);
    } catch (e) {
      if (e instanceof ErrorHttp) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: "Ocurrió un error inesperado. Probá de nuevo." }, { status: 500 });
    }
  };
}

/** Lee el cuerpo JSON de un pedido; si no es JSON válido responde 400. */
export async function cuerpo<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ErrorHttp(400, "El pedido no tiene un formato válido.");
  }
}
