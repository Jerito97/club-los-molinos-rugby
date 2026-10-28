import { NextResponse, type NextRequest } from "next/server";

// Proxy de Next.js: se ejecuta antes de cada pedido.
// 1. Asigna la cookie `id_dispositivo` a los navegadores que todavía no la
//    tienen (identificador aleatorio, sin datos personales).
// 2. Redirige al acceso con PIN si se entra a /gestion sin sesión. Es solo un
//    atajo de navegación: los permisos se verifican en el servidor en cada
//    página y en cada API route.

const UN_ANIO = 60 * 60 * 24 * 365;

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  let respuesta: NextResponse;

  if (pathname.startsWith("/gestion") && !req.cookies.has("sesion")) {
    respuesta = NextResponse.redirect(new URL("/acceso", req.url));
  } else {
    respuesta = NextResponse.next();
  }

  if (!req.cookies.has("id_dispositivo")) {
    const id = crypto.randomUUID();
    // Disponible ya en este mismo pedido para las páginas y API routes, con
    // una marca de que el identificador es nuevo (el navegador no lo mandó).
    req.cookies.set("id_dispositivo", id);
    req.headers.set("x-dispositivo-nuevo", "1");
    if (!pathname.startsWith("/gestion") || req.cookies.has("sesion")) {
      respuesta = NextResponse.next({ request: { headers: req.headers } });
    }
    respuesta.cookies.set("id_dispositivo", id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: UN_ANIO,
    });
  }
  return respuesta;
}

export const config = {
  // Todo menos archivos estáticos y el service worker.
  matcher: ["/((?!_next/static|_next/image|iconos/|escudo.png|icon.png|sw.js|manifest.webmanifest).*)"],
};
