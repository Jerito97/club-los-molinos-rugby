// Pedidos a la API desde los componentes cliente, con el formato de
// respuesta común: { mensaje } si salió bien o { error } si no.

export async function llamar(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const datos = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, mensaje: (res.ok ? datos.mensaje : datos.error) as string | undefined };
}
