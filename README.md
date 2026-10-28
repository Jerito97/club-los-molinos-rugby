# Club Los Molinos — Gestión y validación de eventos deportivos en tiempo real

Aplicación web del **Club Los Molinos** (rugby, Primera C de la URBA). Un colaborador carga en la cancha los
eventos del partido en estado **borrador**; un dirigente los **valida o rechaza**; recién al validarse se
**publican** en el marcador en vivo y generan **notificaciones push** según las preferencias de cada usuario.
Cada carga, corrección y aprobación queda en un **registro de auditoría**, y con los eventos publicados se
calculan **estadísticas por jugador, por rival y por temporada** y **métricas de desempeño** del sistema.

**Demo:** `https://__________.vercel.app` _(completar con la URL del despliegue)_

---

## Índice

1. [Procesos que cubre](#1-procesos-que-cubre)
2. [Usuarios de prueba](#2-usuarios-de-prueba)
3. [Recorrido guiado](#3-recorrido-guiado)
4. [Puesta en marcha local](#4-puesta-en-marcha-local)
5. [Despliegue en Vercel + Neon](#5-despliegue-en-vercel--neon)
6. [Estructura del proyecto y stack](#6-estructura-del-proyecto-y-stack)
7. [Seguridad y respaldo](#7-seguridad-y-respaldo)
8. [Comandos](#8-comandos)

---

## 1. Procesos que cubre

| Caso de uso | Requerimientos | Dónde se ve |
|---|---|---|
| Autenticarse con PIN | RF 1 | Más → Ingresar (`/acceso`) |
| Seleccionar partido en curso | RF 2 | Gestión → Partidos → Iniciar vivo |
| Cargar evento deportivo | RF 2, RF 3 | Carga en vivo |
| Corregir evento en borrador | RF 2, RF 8 | Carga en vivo → Mis eventos |
| Validar evento cargado | RF 4, RF 5 | Eventos pendientes de validación |
| Publicar evento y notificar | RF 6, RF 7 | Automático al validar |
| Configurar notificaciones | RF 9 | Más → Notificaciones |
| Consultar estadísticas | RF 10, RF 13 | Estadísticas (jugadores, rivales, temporada) |
| Ver marcador en vivo | RF 12 | Inicio / Partidos → partido |
| Auditoría | RF 8 | Gestión → Auditoría |
| Fixture, posiciones y rivales de la URBA | RF 11 | Inicio, Partidos (job diario) |
| Métricas del proyecto | RF 13 | Gestión → Métricas |

Perfiles (Tabla 13): el **espectador** no se identifica; el **colaborador** (rol Cargador) carga y corrige
sus eventos; el **dirigente** (rol Validador) además valida o rechaza —salvo lo que cargó él mismo—,
consulta la auditoría y las métricas y puede reasignar la carga. El dirigente designado como **responsable de
seguridad** da de alta y de baja usuarios y blanquea PIN.

## 2. Usuarios de prueba

El ingreso es **solo con el PIN** (sin usuario ni correo): el sistema identifica a la persona a partir de él.

| Usuario | Rol | PIN |
|---|---|---|
| Colaborador Demo | Colaborador (Cargador) | `258036` |
| Dirigente Demo 1 | Dirigente (Validador) y responsable de seguridad | `731904` |
| Dirigente Demo 2 | Dirigente (Validador) | `649217` |

Ninguno de estos PIN es provisorio, así que se entra directamente. Los usuarios nuevos que se crean desde el
panel de usuarios reciben un PIN provisorio y deben cambiarlo en el primer ingreso.

Datos cargados: plantel ficticio de 35 jugadores, fixture de la temporada 2026 (Primera C - Superior), tabla
de posiciones, **8 partidos ya jugados y cargados con la app** (con eventos publicados, auditoría,
notificaciones y visitas), partidos anteriores con el resultado oficial de la URBA y **un partido listo para
iniciar en vivo** (Los Molinos vs San Miguel, fecha 24).

## 3. Recorrido guiado

Conviene usar dos navegadores o una ventana normal y otra privada, para tener dos sesiones a la vez.

1. **Espectador.** Abrir la app: Inicio muestra el último resultado, el próximo partido y las posiciones. Ir a
   **Más → Notificaciones** y activar el interruptor (el navegador pide permiso). En iPhone, primero
   *Compartir → Agregar a pantalla de inicio* y abrir la app desde el ícono.
2. **Colaborador inicia el partido.** *Más → Ingresar* con `258036`. En **Partidos**, tocar *Iniciar vivo* en
   *Los Molinos vs San Miguel*, revisar los 15 titulares y confirmar. Desde ese momento es el **único
   cargador** del partido.
3. **Cargar eventos.** Tocar *Inicio del partido*. Cargar un *Try y Conversión* de Los Molinos (elegir autor y
   pateador; el minuto viene sugerido por el reloj), un *Penal* del rival y un *Cambio*. Cada evento queda
   como **Pendiente de validación** (gris) y el marcador público **no cambia**.
4. **Dirigente valida.** En la otra ventana, ingresar con `649217` (Dirigente Demo 2) → *Partidos* →
   *Validar*. Aprobar el try y la conversión y **rechazar** el penal. La lista se actualiza sola.
   - Para ver la regla de separación de roles: con `731904` (Dirigente Demo 1), en un partido en vivo,
     *Reasignar la carga* a sí mismo, cargar un evento y abrir la validación: el botón *Aprobar* aparece
     deshabilitado con el aviso *No podés validar un evento que cargaste vos*.
   - Si un colaborador llama directamente a `POST /api/eventos/:id/validar`, el servidor responde **403**.
5. **Marcador y notificación.** En la ventana del espectador, el marcador en vivo (`/partidos/<id>`) muestra el
   try y la conversión en menos de 5 segundos, con el parcial a la derecha. Si las notificaciones están
   activas, llega el aviso push.
6. **Corregir un rechazado.** En la ventana del colaborador, el penal figura **Rechazado** (rojo): tocar
   *Corregir*, cambiar el minuto y guardar. Vuelve a *Pendiente de validación*. Un evento ya publicado no se
   puede modificar.
7. **Auditoría, estadísticas y métricas.** Como Dirigente: **Auditoría** (filtrar por partido, usuario o
   acción: alta, rechazo, corrección, validación, publicación, ingresos…), **Métricas** (tiempo de carga a
   publicación, correcciones, rechazos, alcance de notificaciones, uso). Como espectador: **Estadísticas**
   (historia de jugadores, por rival y por temporada).
8. **Usuarios (responsable de seguridad).** Con `731904` → *Usuarios*: crear un usuario (se muestra su PIN
   provisorio), ingresar con él y comprobar que pide cambiarlo; blanquear un PIN o dar de baja. Con 5 PIN
   incorrectos seguidos el dispositivo queda bloqueado 15 minutos.
9. **Reiniciar demo.** Como Dirigente → *Cuenta* → **Reiniciar demo**: la base vuelve al estado inicial para
   repetir el recorrido.

## 4. Puesta en marcha local

**Requisitos:** Node.js 20 o superior y una base PostgreSQL 15 o superior (local o una base gratuita de Neon).

```bash
npm install
```

```bash
cp .env.example .env
```

Completar `.env`:

- `DATABASE_URL`: por ejemplo `postgresql://usuario:clave@localhost:5432/molinos`. `DATABASE_URL_UNPOOLED` puede
  quedar vacía en local.
- `SESSION_SECRET`: 32 caracteres aleatorios o más (`openssl rand -hex 32`).
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`: generarlas con `npm run vapid:generate`.
  `VAPID_SUBJECT`: `mailto:` con un correo de contacto.
- `CRON_SECRET`: cualquier texto aleatorio. `URBA_FUENTE=mock`.

Crear las tablas y cargar los datos iniciales:

```bash
npx prisma migrate deploy
```

```bash
npm run db:seed
```

Levantar la aplicación en `http://localhost:3000`:

```bash
npm run dev
```

Las notificaciones push requieren HTTPS o `localhost` y un navegador con permiso otorgado.

## 5. Despliegue en Vercel + Neon

1. **Importar el repositorio.** En [vercel.com](https://vercel.com) → *Add New… → Project* → importar este
   repositorio de GitHub. El framework se detecta solo (Next.js). Todavía no deployar.
2. **Agregar la base de datos.** En el proyecto → *Storage* → *Create Database* → **Neon** (Marketplace) →
   crear la base (región cercana, por ejemplo `sa-east-1` o `us-east-1`) y conectarla al proyecto para
   todos los entornos. La integración carga `DATABASE_URL` y `DATABASE_URL_UNPOOLED`.
3. **Variables de entorno** (*Settings → Environment Variables*):

   | Variable | Valor |
   |---|---|
   | `SESSION_SECRET` | resultado de `openssl rand -hex 32` |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | clave pública de `npm run vapid:generate` |
   | `VAPID_PRIVATE_KEY` | clave privada de `npm run vapid:generate` |
   | `VAPID_SUBJECT` | `mailto:` + correo de contacto |
   | `CRON_SECRET` | texto aleatorio (Vercel lo envía al job programado) |
   | `URBA_FUENTE` | `mock` |

4. **Deployar** (*Deployments → Deploy*). El script `build` ejecuta `prisma migrate deploy` antes de
   `next build`, así que las tablas se crean en Neon en el primer despliegue.
5. **Cargar los datos iniciales, una sola vez.** Desde la computadora, con la cadena de conexión de Neon
   (*Storage → la base → .env.local*, valor de `DATABASE_URL`):

   ```bash
   DATABASE_URL="postgresql://…neon.tech/…?sslmode=require" npm run db:seed
   ```

   Después se puede volver a este estado desde la app con **Reiniciar demo**.
6. **Job programado.** `vercel.json` registra `/api/cron/urba` todos los días a las 9:00 UTC; Vercel Cron lo
   ejecuta con el header `Authorization: Bearer <CRON_SECRET>`. Se puede probar a mano:

   ```bash
   curl -H "Authorization: Bearer <CRON_SECRET>" https://<dominio>/api/cron/urba
   ```

7. **Copia de seguridad diaria (opcional).** En GitHub → *Settings → Secrets and variables → Actions*,
   crear `BACKUP_DATABASE_URL` (conexión directa de Neon, `DATABASE_URL_UNPOOLED`) y `BACKUP_PASSPHRASE`. El
   workflow `.github/workflows/backup.yml` corre todos los días a las 3:00 (hora argentina).

## 6. Estructura del proyecto y stack

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript · Tailwind CSS 4 · PostgreSQL en Neon · Prisma 7
(migraciones versionadas y seed) · bcrypt (`bcryptjs`) · Web Push (`web-push` + service worker propio) ·
Vercel y Vercel Cron · Vitest · PWA (manifest e íconos).

```
prisma/
  schema.prisma          Modelo de datos (tablas y columnas del DER)
  migrations/            Migraciones versionadas
  seed.ts                Carga inicial (npm run db:seed)
data/urba/               Fixture, posiciones y rivales de ejemplo (fuente "mock")
public/sw.js             Service worker: recibe las notificaciones push
src/
  dominio/               Reglas de negocio puras, sin base de datos (probadas con Vitest)
    evento.ts            Evento.registrar / corregir / eliminar / validar / rechazar / publicar
    partido.ts           Partido.iniciar / asignarCargador / finalizar / consultarMarcador / reloj
    estadisticas.ts      Jugador.historialEstadistico, estadísticas por rival y por temporada
    notificaciones.ts    PreferenciaNotificacion.obtenerSuscriptos y textos de los avisos
    auditoria.ts         RegistroAuditoria.registrar y acciones auditadas
    pin.ts, bloqueo.ts   Reglas del PIN y bloqueo por dispositivo
    permisos.ts          Perfiles y permisos (Tabla 13)
    metricas.ts          Métricas del proyecto
  servicios/             Casos de uso: cargan datos, aplican el dominio y guardan en transacción
    urba/                Interfaz FuenteURBA, FuenteURBAMock, FuenteURBAScraper y actualizarDesdeURBA
    demo/                Datos iniciales
  lib/                   Prisma, sesión (cookie firmada), dispositivo, push, formato
  componentes/           Componentes visuales compartidos
  app/
    (publico)/           Inicio, Partidos, marcador en vivo, Estadísticas, Más
    acceso/              Ingreso con PIN y cambio de PIN
    gestion/             Partidos, carga en vivo, validación, auditoría, métricas, usuarios, cuenta
    api/                 API routes (todas verifican permisos en el servidor)
tests/                   Tests de las reglas de negocio
scripts/entrega.mjs      Genera entrega/codigo-fuente.zip
```

Las reglas de negocio están en `src/dominio/` con los nombres del diagrama de clases. Cada operación
devuelve los cambios a guardar y los registros de auditoría correspondientes, y el servicio los persiste en
una sola transacción. La notificación push se dispara después del commit.

**Fuente de la URBA.** `actualizarDesdeURBA()` trabaja contra la interfaz `FuenteURBA`. Con
`URBA_FUENTE=mock` (por defecto) lee los archivos de `data/urba/`; con `URBA_FUENTE=scraper` consulta los
datos publicados por la URBA (requiere además `URBA_ID_TORNEO`, el identificador del torneo).

## 7. Seguridad y respaldo

- PIN de 6 dígitos, único entre usuarios activos, sin secuencias ni repetidos y distinto de los 3 últimos;
  se guarda solo como hash bcrypt (costo 10, con sal).
- PIN provisorio al crear un usuario o blanquearlo, con cambio obligatorio en el primer ingreso.
- 5 intentos fallidos seguidos bloquean el dispositivo 15 minutos (cookie `id_dispositivo`, con la IP como
  respaldo); cada intento queda en la auditoría y los bloqueos repetidos en el día se avisan al responsable
  de seguridad.
- Sesión en cookie firmada `HttpOnly`, `Secure`, `SameSite=Lax`, que vence a las 4 horas.
- Permisos verificados en el servidor en cada página y API route (401/403), además de ocultar botones.
- Las API routes que modifican datos rechazan pedidos de otro origen.
- Credenciales y claves solo en variables de entorno (`.env.example` no tiene valores reales).
- La auditoría es de solo inserción: la aplicación nunca actualiza ni borra registros.
- Copia diaria cifrada de la base con GitHub Actions (`.github/workflows/backup.yml`), retenida 30 días.

## 8. Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Aplica las migraciones y compila para producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run test` | Tests de las reglas de negocio (Vitest) |
| `npm run db:migrate` | Crea una migración nueva en desarrollo |
| `npm run db:seed` | Borra los datos y carga el estado inicial |
| `npm run db:reset` | Recrea la base desde las migraciones y carga el estado inicial |
| `npm run vapid:generate` | Genera un par de claves VAPID |
| `npm run entrega` | Genera `entrega/codigo-fuente.zip` (sin `docs/`, `.env` ni `node_modules`) |
