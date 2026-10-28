-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('TRY', 'CONVERSION', 'PENAL', 'DROP', 'TARJETA_AMARILLA', 'TARJETA_ROJA', 'CAMBIO', 'INICIO_PARTIDO', 'ENTRETIEMPO', 'INICIO_SEGUNDO_TIEMPO', 'FINAL_PARTIDO');

-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('BORRADOR', 'VALIDADO', 'PUBLICADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "EstadoPartido" AS ENUM ('PROGRAMADO', 'EN_CURSO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "Condicion" AS ENUM ('LOCAL', 'VISITANTE');

-- CreateEnum
CREATE TYPE "Equipo" AS ENUM ('CLUB', 'RIVAL');

-- CreateTable
CREATE TABLE "rol" (
    "id_rol" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "pin_hash" TEXT,
    "id_rol" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "es_responsable_seguridad" BOOLEAN NOT NULL DEFAULT false,
    "pin_provisorio" BOOLEAN NOT NULL DEFAULT false,
    "id_dispositivo" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "pin_historial" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pin_historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jugador" (
    "id_jugador" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "nro_camiseta" INTEGER NOT NULL,

    CONSTRAINT "jugador_pkey" PRIMARY KEY ("id_jugador")
);

-- CreateTable
CREATE TABLE "rival" (
    "id_rival" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "posicion_tabla" INTEGER,

    CONSTRAINT "rival_pkey" PRIMARY KEY ("id_rival")
);

-- CreateTable
CREATE TABLE "partido" (
    "id_partido" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "torneo" TEXT NOT NULL,
    "id_rival" INTEGER NOT NULL,
    "estado" "EstadoPartido" NOT NULL DEFAULT 'PROGRAMADO',
    "id_usuario_cargador" INTEGER,
    "condicion" "Condicion" NOT NULL,
    "resultado" TEXT,
    "fecha_numero" INTEGER NOT NULL,
    "temporada" INTEGER NOT NULL,
    "iniciado_en" TIMESTAMP(3),

    CONSTRAINT "partido_pkey" PRIMARY KEY ("id_partido")
);

-- CreateTable
CREATE TABLE "titular_partido" (
    "id_partido" INTEGER NOT NULL,
    "id_jugador" INTEGER NOT NULL,

    CONSTRAINT "titular_partido_pkey" PRIMARY KEY ("id_partido","id_jugador")
);

-- CreateTable
CREATE TABLE "evento" (
    "id_evento" SERIAL NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "minuto" INTEGER NOT NULL,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'BORRADOR',
    "id_partido" INTEGER NOT NULL,
    "equipo" "Equipo" NOT NULL,
    "id_jugador" INTEGER,
    "id_jugador_entra" INTEGER,
    "id_usuario_carga" INTEGER NOT NULL,
    "id_usuario_valida" INTEGER,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validado_en" TIMESTAMP(3),

    CONSTRAINT "evento_pkey" PRIMARY KEY ("id_evento")
);

-- CreateTable
CREATE TABLE "registro_auditoria" (
    "id_registro" SERIAL NOT NULL,
    "id_evento" INTEGER,
    "id_usuario" INTEGER,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accion" TEXT NOT NULL,
    "valor_anterior" JSONB,
    "valor_nuevo" JSONB,
    "ip" TEXT,
    "id_dispositivo" TEXT,

    CONSTRAINT "registro_auditoria_pkey" PRIMARY KEY ("id_registro")
);

-- CreateTable
CREATE TABLE "preferencia_notificacion" (
    "id_preferencia" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "tipo_evento" "TipoEvento" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preferencia_notificacion_pkey" PRIMARY KEY ("id_preferencia")
);

-- CreateTable
CREATE TABLE "push_suscripcion" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacion_enviada" (
    "id" SERIAL NOT NULL,
    "id_evento" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacion_enviada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intento_login" (
    "id" SERIAL NOT NULL,
    "id_dispositivo" TEXT,
    "ip" TEXT NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitoso" BOOLEAN NOT NULL,

    CONSTRAINT "intento_login_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visita_marcador" (
    "id" SERIAL NOT NULL,
    "id_partido" INTEGER NOT NULL,
    "id_dispositivo" TEXT NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visita_marcador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posicion" (
    "id" SERIAL NOT NULL,
    "temporada" INTEGER NOT NULL,
    "torneo" TEXT NOT NULL,
    "puesto" INTEGER NOT NULL,
    "equipo" TEXT NOT NULL,
    "pj" INTEGER NOT NULL,
    "pg" INTEGER NOT NULL,
    "pe" INTEGER NOT NULL,
    "pp" INTEGER NOT NULL,
    "dif" INTEGER NOT NULL,
    "pts" INTEGER NOT NULL,

    CONSTRAINT "posicion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rol_nombre_key" ON "rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_id_dispositivo_key" ON "usuario"("id_dispositivo");

-- CreateIndex
CREATE INDEX "pin_historial_id_usuario_fecha_idx" ON "pin_historial"("id_usuario", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "rival_nombre_key" ON "rival"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "partido_torneo_temporada_fecha_numero_key" ON "partido"("torneo", "temporada", "fecha_numero");

-- CreateIndex
CREATE INDEX "evento_id_partido_estado_idx" ON "evento"("id_partido", "estado");

-- CreateIndex
CREATE INDEX "registro_auditoria_fecha_hora_idx" ON "registro_auditoria"("fecha_hora");

-- CreateIndex
CREATE INDEX "registro_auditoria_accion_fecha_hora_idx" ON "registro_auditoria"("accion", "fecha_hora");

-- CreateIndex
CREATE UNIQUE INDEX "preferencia_notificacion_id_usuario_tipo_evento_key" ON "preferencia_notificacion"("id_usuario", "tipo_evento");

-- CreateIndex
CREATE UNIQUE INDEX "push_suscripcion_endpoint_key" ON "push_suscripcion"("endpoint");

-- CreateIndex
CREATE INDEX "notificacion_enviada_id_evento_idx" ON "notificacion_enviada"("id_evento");

-- CreateIndex
CREATE INDEX "intento_login_id_dispositivo_fecha_hora_idx" ON "intento_login"("id_dispositivo", "fecha_hora");

-- CreateIndex
CREATE INDEX "intento_login_ip_fecha_hora_idx" ON "intento_login"("ip", "fecha_hora");

-- CreateIndex
CREATE INDEX "visita_marcador_id_partido_idx" ON "visita_marcador"("id_partido");

-- CreateIndex
CREATE UNIQUE INDEX "posicion_temporada_torneo_equipo_key" ON "posicion"("temporada", "torneo", "equipo");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "rol"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pin_historial" ADD CONSTRAINT "pin_historial_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partido" ADD CONSTRAINT "partido_id_rival_fkey" FOREIGN KEY ("id_rival") REFERENCES "rival"("id_rival") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partido" ADD CONSTRAINT "partido_id_usuario_cargador_fkey" FOREIGN KEY ("id_usuario_cargador") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titular_partido" ADD CONSTRAINT "titular_partido_id_partido_fkey" FOREIGN KEY ("id_partido") REFERENCES "partido"("id_partido") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titular_partido" ADD CONSTRAINT "titular_partido_id_jugador_fkey" FOREIGN KEY ("id_jugador") REFERENCES "jugador"("id_jugador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_id_partido_fkey" FOREIGN KEY ("id_partido") REFERENCES "partido"("id_partido") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_id_jugador_fkey" FOREIGN KEY ("id_jugador") REFERENCES "jugador"("id_jugador") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_id_jugador_entra_fkey" FOREIGN KEY ("id_jugador_entra") REFERENCES "jugador"("id_jugador") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_id_usuario_carga_fkey" FOREIGN KEY ("id_usuario_carga") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_id_usuario_valida_fkey" FOREIGN KEY ("id_usuario_valida") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_auditoria" ADD CONSTRAINT "registro_auditoria_id_evento_fkey" FOREIGN KEY ("id_evento") REFERENCES "evento"("id_evento") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_auditoria" ADD CONSTRAINT "registro_auditoria_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencia_notificacion" ADD CONSTRAINT "preferencia_notificacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_suscripcion" ADD CONSTRAINT "push_suscripcion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion_enviada" ADD CONSTRAINT "notificacion_enviada_id_evento_fkey" FOREIGN KEY ("id_evento") REFERENCES "evento"("id_evento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion_enviada" ADD CONSTRAINT "notificacion_enviada_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita_marcador" ADD CONSTRAINT "visita_marcador_id_partido_fkey" FOREIGN KEY ("id_partido") REFERENCES "partido"("id_partido") ON DELETE CASCADE ON UPDATE CASCADE;
