# Notas para actualizar el documento

Diferencias entre lo que hace el sistema y lo que dice el TFG (V13), para corregir el documento.

## 1. Figuras que hay que reemplazar

- **Figuras 16 y 17**: las capturas actuales muestran elementos que el sistema no tiene. Reemplazarlas por
  las de `docs/capturas/`:
  - "Deshacer último", "Cortar transmisión en vivo" y "Reiniciar partido (borra todo…)" en la carga. La
    carga ahora tiene los controles del partido (inicio, entretiempo, inicio del 2do tiempo, final) y la lista
    "Mis eventos" con su estado.
  - "Eliminar" en la lista de partidos.
  - Navegación "Primera · Partidos · Club · Categorías · Más" y la tarjeta "Otros deportes". Ahora es
    "Inicio · Partidos · Estadísticas · Más".
  - "Acceso administrador" con PIN de 4 dígitos. Ahora es "Acceso" con PIN de 6 dígitos.
  - En la validación, una conversión del rival aparece con un jugador ("Juan Pérez"). Los eventos del rival
    no llevan jugador.
- **Sección Seguridad**: cita la URL `los-molinos-rugby.vercel.app`. Reemplazarla por la URL del despliegue.

## 2. Cambios en el modelo de datos (DER, Figura 15)

Tablas del DER sin cambios de nombre. Campos agregados:

- `usuario`: `activo` (baja lógica), `es_responsable_seguridad`, `pin_provisorio`, `creado_en`,
  `id_dispositivo` (solo espectadores: asocia el usuario Espectador al dispositivo). `pin_hash` es nulo para
  los espectadores.
- `partido`: `estado`, `id_usuario_cargador` (FK), `condicion` (local/visitante), `resultado`,
  `fecha_numero`, `temporada`, `iniciado_en`.
- `evento`: `equipo` (club/rival), `id_jugador_entra` (cambios), `id_usuario_valida` (FK), `creado_en`,
  `validado_en`, `eliminado_en` (eliminación lógica, ver 3.3). `id_jugador` es nulo en los eventos del rival
  y en los de control.
- `registro_auditoria`: `accion`, `valor_anterior` y `valor_nuevo` (JSON), `ip`, `id_dispositivo`.
  `id_evento` es nulo en las acciones que no son sobre un evento, e `id_usuario` es nulo en los ingresos
  fallidos.
- `preferencia_notificacion`: `fecha_hora` (está en el diagrama de clases, no en el DER).

Tablas agregadas: `pin_historial`, `titular_partido` (titulares de cada partido, para minutos y partidos
jugados), `push_suscripcion`, `intento_login`, `posicion` (tabla de posiciones completa),
`notificacion_enviada` (alcance) y `visita_marcador` (uso de la plataforma, con el dispositivo como hash).

Enumeraciones: `TipoEvento` suma los eventos de control `INICIO_PARTIDO`, `ENTRETIEMPO`,
`INICIO_SEGUNDO_TIEMPO` y `FINAL_PARTIDO`. `EstadoEvento` no cambia.

## 3. Decisiones de funcionamiento que no están en el documento

1. **Eventos de control sin validación.** Inicio, entretiempo, inicio del 2do tiempo y final se publican al
   cargarlos (con auditoría y notificación), para que el reloj no dependa de un dirigente. Solo los eventos
   deportivos del RF 2 pasan por borrador y validación.
2. **Titulares.** Antes de "Iniciar vivo", el colaborador marca los 15 titulares. Con eso y los cambios se
   calculan los minutos y los partidos jugados. Es la pestaña "Formación" del marcador. La tarjeta amarilla
   no descuenta minutos; la roja sí.
3. **Eliminación lógica.** "Eliminar" un borrador lo marca con `eliminado_en` en lugar de borrar la fila,
   para no alterar sus registros de auditoría (que son de solo inserción).
4. **Reabrir / cerrar la carga.** "Ver / reabrir" vuelve un partido jugado a "en curso" para completar o
   corregir eventos (por ejemplo, lo anotado en papel sin señal, riesgo R4). Pueden reabrir el cargador o un
   dirigente, que queda como cargador. Después se cierra con "Cerrar la carga".
5. **Validar después del final.** Un dirigente puede validar borradores pendientes aunque el partido ya haya
   terminado.
6. **Corrección por parte del cargador vigente.** Solo corrige el autor del evento y solo mientras es el
   cargador asignado. Si se reasigna la carga, sus borradores pendientes los sigue revisando un dirigente.
7. **Auditoría ampliada.** Además de lo que muestran los diagramas de secuencia, se registran los ingresos
   correctos, el cierre de sesión, el inicio de la carga, la asignación y reasignación del cargador, los
   titulares, la finalización, la reapertura, el cambio y el blanqueo de PIN, las altas y bajas de usuarios y
   cada actualización desde la URBA (incluidas las fallidas, para el riesgo R3). Nunca se guarda el PIN.
8. **Bloqueo por dispositivo.** El dispositivo se identifica por una cookie aleatoria. La IP se usa como
   respaldo solo cuando el pedido llega sin esa cookie, para no bloquear a todos los celulares que comparten
   la IP de una cancha. Los bloqueos repetidos en el día (2 o más) muestran un aviso al responsable de
   seguridad, en "Usuarios" y en "Partidos".
9. **"Bloquear usuarios" (Tabla 13)** se implementa como baja lógica y reactivación (con PIN provisorio
   nuevo). El bloqueo temporal es el automático por intentos fallidos.
10. **Cambio de PIN voluntario.** Fuera del primer ingreso pide el PIN actual. La renovación al comienzo de
    cada temporada es un procedimiento: el sistema no la fuerza.
11. **bcrypt con costo 10** (el mínimo de la política), porque el ingreso compara el PIN contra los hashes de
    todos los usuarios activos.
12. **Notificaciones.** Colaboradores y dirigentes con sesión configuran sus avisos con su propio usuario. El
    interruptor "Tries (con o sin conversión)" agrupa TRY y CONVERSION, y "Tarjetas" agrupa amarilla y roja.
    Se agregaron "Tarjetas" y "Cambios" a la lista de la Figura 17.
13. **Marcador en vivo:** se refresca cada 5 segundos (polling). Desde la validación, el evento se ve en
    5 segundos o menos (RNF 5).
14. **Partidos sin carga en la app.** Los partidos anteriores a la puesta en marcha solo tienen el resultado
    oficial de la URBA. Se muestran en Resultados, pero no entran en las estadísticas, que salen solo de
    eventos publicados (RF 10).
15. **Iniciar vivo** se permite en cualquier partido programado, sin controlar la fecha.

## 4. URBA (RF 11)

- En la demo, la fuente es un **mock con la misma interfaz** (`FuenteURBA` → `FuenteURBAMock`, datos de
  ejemplo en `data/urba/`). `FuenteURBAScraper` queda preparada pero desactivada (`URBA_FUENTE=scraper`).
- El "scraping" consume la API JSON pública que usa el propio sitio de fixture de la URBA, en lugar de
  interpretar el HTML. Necesita la variable extra `URBA_ID_TORNEO`.
- El job corre a diario (Vercel Cron, 9:00 UTC). El resultado oficial no pisa el de un partido cargado en vivo.

## 5. Métricas (objetivo específico 5)

- "Tiempo de publicación" se mide desde la **carga** del evento hasta su publicación, no desde que ocurre la
  jugada (el sistema no conoce ese momento). Incluye el tiempo humano de validación.
- La comparación con Instagram (tiempo y alcance) no se automatiza: el panel da las cifras del sistema para
  compararlas a mano.
- "Uso de la plataforma" se mide con visitas anónimas al marcador (hash del dispositivo): dispositivos
  distintos y sesiones por partido.

## 6. Solo para la demo

- Datos ficticios: plantel con nombres inventados, usuarios demo y PIN no provisorios, 8 partidos cargados,
  espectadores, notificaciones y visitas simuladas (con tiempos verosímiles), fixture y posiciones de ejemplo.
- **"Reiniciar demo"** (dirigentes) borra todo, incluida la auditoría, y vuelve a cargar los datos
  iniciales. Contradice la auditoría de solo inserción: hay que quitarlo en producción.

## 7. Respaldo

- `.github/workflows/backup.yml` implementa la copia diaria de la Tabla 14 (pg_dump cifrado con AES-256,
  artefacto de 30 días). Para que cumpla la política, el repositorio tiene que ser **privado** (el documento
  lo dice así).

## 8. Mejoras propuestas (no implementadas)

- Notificación en tiempo real con Server-Sent Events en lugar de polling.
- Carga sin conexión (cola local en el service worker) para el riesgo R4, en lugar del papel.
- Aviso automático al desarrollador cuando falla el job de la URBA (hoy queda en la auditoría y en los logs).
- Forzar la renovación de PIN al comienzo de cada temporada.
