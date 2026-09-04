-- CreateEnum
CREATE TYPE "AmbitoPerfil" AS ENUM ('INNOVASOFT', 'EMPRESA');

-- CreateEnum
CREATE TYPE "TipoToken" AS ENUM ('VERIFICACION_EMAIL', 'RECUPERACION_PASSWORD');

-- CreateEnum
CREATE TYPE "TipoPlan" AS ENUM ('SUSCRIPCION', 'RECARGA', 'BONO');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('ACTIVA', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "OrigenBolsa" AS ENUM ('PLAN', 'RECARGA', 'BONO', 'PROMOCION');

-- CreateEnum
CREATE TYPE "TipoMovimientoPuntos" AS ENUM ('EMISION', 'CONSUMO', 'EXPIRACION', 'DESCUBIERTO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "EstadoPeriodo" AS ENUM ('ABIERTO', 'CERRADO');

-- CreateEnum
CREATE TYPE "PrioridadTicket" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "EventoFidelizacion" AS ENUM ('TICKET_CON_EVIDENCIA', 'ENCUESTA_RESPONDIDA', 'RENOVACION_ANTICIPADA');

-- CreateEnum
CREATE TYPE "TipoRecompensa" AS ENUM ('DESCUENTO_RENOVACION', 'SERVICIO_SIN_CONSUMO', 'RECARGA_PUNTOS');

-- CreateEnum
CREATE TYPE "TipoMovimientoFidelidad" AS ENUM ('ACUMULACION', 'CANJE', 'EXPIRACION');

-- CreateEnum
CREATE TYPE "EstadoCanje" AS ENUM ('EMITIDO', 'APLICADO', 'VENCIDO');

-- CreateTable
CREATE TABLE "empresa_cliente" (
    "id" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "razon_social" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresa_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "ambito" "AmbitoPerfil" NOT NULL,
    "es_sistema" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permiso" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil_permiso" (
    "perfil_id" TEXT NOT NULL,
    "permiso_id" TEXT NOT NULL,

    CONSTRAINT "perfil_permiso_pkey" PRIMARY KEY ("perfil_id","permiso_id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT,
    "perfil_id" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "email_verificado" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asesor" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "especialidad" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "asesor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_usuario" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "tipo" "TipoToken" NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "usado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesion_refresh" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "revocado_en" TIMESTAMP(3),
    "reemplazado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesion_refresh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_auditoria" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" "TipoPlan" NOT NULL,
    "puntos_incluidos" INTEGER,
    "es_ilimitado" BOOLEAN NOT NULL DEFAULT false,
    "dias_vigencia" INTEGER NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifa_servicio" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "puntos" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tarifa_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripcion" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "inicio_en" TIMESTAMP(3) NOT NULL,
    "fin_en" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'ACTIVA',
    "precio_pagado" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bolsa_puntos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "suscripcion_id" TEXT,
    "origen" "OrigenBolsa" NOT NULL,
    "puntos_iniciales" INTEGER NOT NULL,
    "es_ilimitada" BOOLEAN NOT NULL DEFAULT false,
    "emitida_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vence_en" TIMESTAMP(3) NOT NULL,
    "anulada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bolsa_puntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_puntos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "bolsa_id" TEXT,
    "tipo" "TipoMovimientoPuntos" NOT NULL,
    "puntos" INTEGER NOT NULL,
    "ticket_id" TEXT,
    "cita_id" TEXT,
    "periodo_id" TEXT,
    "descripcion" TEXT NOT NULL,
    "registrado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_puntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodo_facturacion" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "inicio_en" TIMESTAMP(3) NOT NULL,
    "fin_en" TIMESTAMP(3) NOT NULL,
    "saldo_pendiente" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoPeriodo" NOT NULL DEFAULT 'ABIERTO',
    "cerrado_en" TIMESTAMP(3),

    CONSTRAINT "periodo_facturacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria_servicio" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categoria_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estado_ticket" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "es_final" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "estado_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transicion_ticket" (
    "id" TEXT NOT NULL,
    "desde_estado_id" TEXT NOT NULL,
    "hasta_estado_id" TEXT NOT NULL,
    "permiso_requerido" TEXT NOT NULL,

    CONSTRAINT "transicion_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "solicitante_id" TEXT NOT NULL,
    "asesor_id" TEXT,
    "categoria_id" TEXT NOT NULL,
    "estado_id" TEXT NOT NULL,
    "prioridad" "PrioridadTicket" NOT NULL DEFAULT 'MEDIA',
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tarifa_aplicada_id" TEXT,
    "tipo_solucion" TEXT,
    "descripcion_solucion" TEXT,
    "abierto_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelto_en" TIMESTAMP(3),
    "cerrado_en" TIMESTAMP(3),

    CONSTRAINT "ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_historial" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "estado_anterior_id" TEXT,
    "estado_nuevo_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "comentario" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_actividad" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "asesor_id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "horas" DECIMAL(5,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encuesta_ticket" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "calificacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "respondida_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encuesta_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjunto" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "cita_id" TEXT,
    "nombre_archivo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "tipo_mime" TEXT NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "subido_por_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjunto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modalidad" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tarifa_por_defecto_id" TEXT,

    CONSTRAINT "modalidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estado_cita" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "es_final" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "estado_cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cita" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "asesor_id" TEXT NOT NULL,
    "solicitante_id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "modalidad_id" TEXT NOT NULL,
    "estado_id" TEXT NOT NULL,
    "inicio_en" TIMESTAMP(3) NOT NULL,
    "fin_en" TIMESTAMP(3) NOT NULL,
    "direccion" TEXT,
    "enlace" TEXT,
    "motivo_cancelacion" TEXT,
    "tarifa_aplicada_id" TEXT,
    "cubierta_por_canje_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilidad_asesor" (
    "id" TEXT NOT NULL,
    "asesor_id" TEXT NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "hora_inicio" TEXT NOT NULL,
    "hora_fin" TEXT NOT NULL,
    "vigente_desde" TIMESTAMP(3),
    "vigente_hasta" TIMESTAMP(3),

    CONSTRAINT "disponibilidad_asesor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regla_fidelizacion" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "evento" "EventoFidelizacion" NOT NULL,
    "puntos" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "regla_fidelizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recompensa" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "costo_puntos" INTEGER NOT NULL,
    "tipo" "TipoRecompensa" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dias_vigencia_beneficio" INTEGER,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recompensa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_fidelidad" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo" "TipoMovimientoFidelidad" NOT NULL,
    "puntos" INTEGER NOT NULL,
    "regla_id" TEXT,
    "ticket_id" TEXT,
    "suscripcion_id" TEXT,
    "canje_id" TEXT,
    "descripcion" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_fidelidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canje" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "recompensa_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "estado" "EstadoCanje" NOT NULL DEFAULT 'EMITIDO',
    "bolsa_generada_id" TEXT,
    "aplicado_en_suscripcion_id" TEXT,
    "vence_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresa_cliente_nit_key" ON "empresa_cliente"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "perfil_nombre_key" ON "perfil"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "permiso_clave_key" ON "permiso"("clave");

-- CreateIndex
CREATE INDEX "permiso_modulo_idx" ON "permiso"("modulo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_empresa_id_idx" ON "usuario"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "asesor_usuario_id_key" ON "asesor"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "token_usuario_token_hash_key" ON "token_usuario"("token_hash");

-- CreateIndex
CREATE INDEX "token_usuario_usuario_id_tipo_idx" ON "token_usuario"("usuario_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "sesion_refresh_token_hash_key" ON "sesion_refresh"("token_hash");

-- CreateIndex
CREATE INDEX "sesion_refresh_usuario_id_idx" ON "sesion_refresh"("usuario_id");

-- CreateIndex
CREATE INDEX "registro_auditoria_entidad_entidad_id_idx" ON "registro_auditoria"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "registro_auditoria_created_at_idx" ON "registro_auditoria"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "plan_clave_key" ON "plan"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "tarifa_servicio_clave_key" ON "tarifa_servicio"("clave");

-- CreateIndex
CREATE INDEX "suscripcion_empresa_id_estado_idx" ON "suscripcion"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX "bolsa_puntos_empresa_id_vence_en_idx" ON "bolsa_puntos"("empresa_id", "vence_en");

-- CreateIndex
CREATE INDEX "movimiento_puntos_empresa_id_created_at_idx" ON "movimiento_puntos"("empresa_id", "created_at");

-- CreateIndex
CREATE INDEX "movimiento_puntos_bolsa_id_idx" ON "movimiento_puntos"("bolsa_id");

-- CreateIndex
CREATE UNIQUE INDEX "periodo_facturacion_empresa_id_inicio_en_key" ON "periodo_facturacion"("empresa_id", "inicio_en");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_servicio_clave_key" ON "categoria_servicio"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "estado_ticket_clave_key" ON "estado_ticket"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "transicion_ticket_desde_estado_id_hasta_estado_id_key" ON "transicion_ticket"("desde_estado_id", "hasta_estado_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_codigo_key" ON "ticket"("codigo");

-- CreateIndex
CREATE INDEX "ticket_empresa_id_estado_id_idx" ON "ticket"("empresa_id", "estado_id");

-- CreateIndex
CREATE INDEX "ticket_asesor_id_idx" ON "ticket"("asesor_id");

-- CreateIndex
CREATE INDEX "ticket_historial_ticket_id_created_at_idx" ON "ticket_historial"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "ticket_actividad_ticket_id_idx" ON "ticket_actividad"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "encuesta_ticket_ticket_id_key" ON "encuesta_ticket"("ticket_id");

-- CreateIndex
CREATE INDEX "adjunto_ticket_id_idx" ON "adjunto"("ticket_id");

-- CreateIndex
CREATE INDEX "adjunto_cita_id_idx" ON "adjunto"("cita_id");

-- CreateIndex
CREATE UNIQUE INDEX "modalidad_clave_key" ON "modalidad"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "estado_cita_clave_key" ON "estado_cita"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "cita_codigo_key" ON "cita"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "cita_cubierta_por_canje_id_key" ON "cita"("cubierta_por_canje_id");

-- CreateIndex
CREATE INDEX "cita_asesor_id_inicio_en_idx" ON "cita"("asesor_id", "inicio_en");

-- CreateIndex
CREATE INDEX "cita_empresa_id_inicio_en_idx" ON "cita"("empresa_id", "inicio_en");

-- CreateIndex
CREATE INDEX "disponibilidad_asesor_asesor_id_dia_semana_idx" ON "disponibilidad_asesor"("asesor_id", "dia_semana");

-- CreateIndex
CREATE UNIQUE INDEX "regla_fidelizacion_clave_key" ON "regla_fidelizacion"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "recompensa_clave_key" ON "recompensa"("clave");

-- CreateIndex
CREATE INDEX "movimiento_fidelidad_empresa_id_created_at_idx" ON "movimiento_fidelidad"("empresa_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "canje_bolsa_generada_id_key" ON "canje"("bolsa_generada_id");

-- CreateIndex
CREATE INDEX "canje_empresa_id_estado_idx" ON "canje"("empresa_id", "estado");

-- AddForeignKey
ALTER TABLE "perfil_permiso" ADD CONSTRAINT "perfil_permiso_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_permiso" ADD CONSTRAINT "perfil_permiso_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permiso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa_cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asesor" ADD CONSTRAINT "asesor_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usuario" ADD CONSTRAINT "token_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion_refresh" ADD CONSTRAINT "sesion_refresh_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_auditoria" ADD CONSTRAINT "registro_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripcion" ADD CONSTRAINT "suscripcion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa_cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripcion" ADD CONSTRAINT "suscripcion_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bolsa_puntos" ADD CONSTRAINT "bolsa_puntos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa_cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bolsa_puntos" ADD CONSTRAINT "bolsa_puntos_suscripcion_id_fkey" FOREIGN KEY ("suscripcion_id") REFERENCES "suscripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_puntos" ADD CONSTRAINT "movimiento_puntos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa_cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_puntos" ADD CONSTRAINT "movimiento_puntos_bolsa_id_fkey" FOREIGN KEY ("bolsa_id") REFERENCES "bolsa_puntos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_puntos" ADD CONSTRAINT "movimiento_puntos_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_puntos" ADD CONSTRAINT "movimiento_puntos_cita_id_fkey" FOREIGN KEY ("cita_id") REFERENCES "cita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_puntos" ADD CONSTRAINT "movimiento_puntos_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodo_facturacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_puntos" ADD CONSTRAINT "movimiento_puntos_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodo_facturacion" ADD CONSTRAINT "periodo_facturacion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa_cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transicion_ticket" ADD CONSTRAINT "transicion_ticket_desde_estado_id_fkey" FOREIGN KEY ("desde_estado_id") REFERENCES "estado_ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transicion_ticket" ADD CONSTRAINT "transicion_ticket_hasta_estado_id_fkey" FOREIGN KEY ("hasta_estado_id") REFERENCES "estado_ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa_cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "asesor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "estado_ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_tarifa_aplicada_id_fkey" FOREIGN KEY ("tarifa_aplicada_id") REFERENCES "tarifa_servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_historial" ADD CONSTRAINT "ticket_historial_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_historial" ADD CONSTRAINT "ticket_historial_estado_anterior_id_fkey" FOREIGN KEY ("estado_anterior_id") REFERENCES "estado_ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_historial" ADD CONSTRAINT "ticket_historial_estado_nuevo_id_fkey" FOREIGN KEY ("estado_nuevo_id") REFERENCES "estado_ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_historial" ADD CONSTRAINT "ticket_historial_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_actividad" ADD CONSTRAINT "ticket_actividad_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_actividad" ADD CONSTRAINT "ticket_actividad_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "asesor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encuesta_ticket" ADD CONSTRAINT "encuesta_ticket_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjunto" ADD CONSTRAINT "adjunto_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjunto" ADD CONSTRAINT "adjunto_cita_id_fkey" FOREIGN KEY ("cita_id") REFERENCES "cita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjunto" ADD CONSTRAINT "adjunto_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modalidad" ADD CONSTRAINT "modalidad_tarifa_por_defecto_id_fkey" FOREIGN KEY ("tarifa_por_defecto_id") REFERENCES "tarifa_servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita" ADD CONSTRAINT "cita_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa_cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita" ADD CONSTRAINT "cita_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "asesor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita" ADD CONSTRAINT "cita_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita" ADD CONSTRAINT "cita_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita" ADD CONSTRAINT "cita_modalidad_id_fkey" FOREIGN KEY ("modalidad_id") REFERENCES "modalidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita" ADD CONSTRAINT "cita_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "estado_cita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita" ADD CONSTRAINT "cita_tarifa_aplicada_id_fkey" FOREIGN KEY ("tarifa_aplicada_id") REFERENCES "tarifa_servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita" ADD CONSTRAINT "cita_cubierta_por_canje_id_fkey" FOREIGN KEY ("cubierta_por_canje_id") REFERENCES "canje"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilidad_asesor" ADD CONSTRAINT "disponibilidad_asesor_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "asesor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_fidelidad" ADD CONSTRAINT "movimiento_fidelidad_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa_cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_fidelidad" ADD CONSTRAINT "movimiento_fidelidad_regla_id_fkey" FOREIGN KEY ("regla_id") REFERENCES "regla_fidelizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_fidelidad" ADD CONSTRAINT "movimiento_fidelidad_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_fidelidad" ADD CONSTRAINT "movimiento_fidelidad_suscripcion_id_fkey" FOREIGN KEY ("suscripcion_id") REFERENCES "suscripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_fidelidad" ADD CONSTRAINT "movimiento_fidelidad_canje_id_fkey" FOREIGN KEY ("canje_id") REFERENCES "canje"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canje" ADD CONSTRAINT "canje_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa_cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canje" ADD CONSTRAINT "canje_recompensa_id_fkey" FOREIGN KEY ("recompensa_id") REFERENCES "recompensa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canje" ADD CONSTRAINT "canje_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canje" ADD CONSTRAINT "canje_bolsa_generada_id_fkey" FOREIGN KEY ("bolsa_generada_id") REFERENCES "bolsa_puntos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canje" ADD CONSTRAINT "canje_aplicado_en_suscripcion_id_fkey" FOREIGN KEY ("aplicado_en_suscripcion_id") REFERENCES "suscripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
