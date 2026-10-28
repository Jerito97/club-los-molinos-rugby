// Service worker del Club Los Molinos.
//
// Es el "servicio push" del diagrama de despliegue: el navegador lo ejecuta
// en segundo plano, separado de la página, y recibe las notificaciones que
// envía el servidor aun cuando la aplicación no está abierta.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Llega un aviso del servidor: se muestra la notificación.
self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { titulo: "Club Los Molinos", cuerpo: event.data ? event.data.text() : "" };
  }
  const titulo = datos.titulo || "Club Los Molinos";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.cuerpo || "",
      icon: "/iconos/icono-192.png",
      badge: "/iconos/badge-96.png",
      tag: datos.etiqueta,
      renotify: Boolean(datos.etiqueta),
      data: { url: datos.url || "/" },
    })
  );
});

// Al tocar la notificación se abre (o enfoca) el marcador del partido.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (v.url === url && "focus" in v) return v.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
