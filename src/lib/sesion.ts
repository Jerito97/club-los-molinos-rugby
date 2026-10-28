import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Sesión de colaboradores y dirigentes.
//
// Se guarda en una cookie firmada (JWT HS256) marcada como HttpOnly, Secure
// y SameSite=Lax: no se puede leer desde JavaScript y solo viaja por
// conexiones cifradas. Vence a las cuatro horas, plazo que cubre la previa y
// el partido completo. El contenido es solo el id del usuario: el rol y el
// estado (activo, PIN provisorio) se leen de la base en cada pedido, así una
// baja tiene efecto inmediato.

export const COOKIE_SESION = "sesion";
export const HORAS_SESION = 4;

function secreto() {
  const valor = process.env.SESSION_SECRET;
  if (!valor || valor.length < 32) throw new Error("Falta SESSION_SECRET (mínimo 32 caracteres).");
  return new TextEncoder().encode(valor);
}

export async function crearSesion(id_usuario: number): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(id_usuario))
    .setIssuedAt()
    .setExpirationTime(`${HORAS_SESION}h`)
    .sign(secreto());
  const almacen = await cookies();
  almacen.set(COOKIE_SESION, token, {
    httpOnly: true,
    // En desarrollo (http://localhost) Safari no guarda cookies Secure.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: HORAS_SESION * 60 * 60,
  });
}

/** Devuelve el id de usuario de la sesión vigente, o null. */
export async function leerSesion(): Promise<number | null> {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secreto(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}

export async function borrarSesion(): Promise<void> {
  (await cookies()).delete(COOKIE_SESION);
}
