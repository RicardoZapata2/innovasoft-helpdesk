# Innovasoft Helpdesk

Sistema web de gestión de soporte técnico y puntos para Innovasoft.

Proyecto de Práctica Profesional Integral (PPI-T).

| Estudiante | Documento |
|---|---|
| Juan Ángel Otero Pérez | 1062433097 |
| Juan Alejandro Otero Pérez | 1062433098 |
| Ricardo Andrés Zapata Herrera | 1038868159 |

## Qué resuelve

Innovasoft presta soporte técnico bajo un modelo prepago: cada empresa cliente compra
un plan que le otorga una bolsa de puntos, y cada servicio recibido descuenta puntos de
esa bolsa. Hoy esa operación depende de canales dispersos y registros manuales, de modo
que no existe una fuente única que responda cuántos puntos compró un cliente, en qué se
consumieron y cuánto le queda.

La plataforma centraliza cuatro procesos:

1. **Gestión de tickets** — ciclo de vida completo, evidencias, registro de horas y reporte de cierre.
2. **Planes y puntos** — contratación, vigencia de bolsas, descuento automático y kardex de movimientos.
3. **Agendamiento** — calendario de visitas con control de disponibilidad.
4. **Fidelización** — puntos ganados por actividad, canjeables por beneficios.

## Tecnologías

Backend con NestJS y TypeScript sobre PostgreSQL mediante Prisma. Frontend con React,
Vite y Tailwind CSS. Pruebas con Jest.

## Puesta en marcha

Requiere Node.js 20 o superior y PostgreSQL 18.

```bash
# Base de datos
psql -U postgres -c "CREATE ROLE innovasoft_app WITH LOGIN PASSWORD 'innovasoft_dev_2026';"
psql -U postgres -c "CREATE DATABASE innovasoft_helpdesk OWNER innovasoft_app ENCODING 'UTF8';"

# Backend
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev
```

La API queda en `http://localhost:3000` y la aplicación en `http://localhost:5173`.

## Documentación

En `docs/`: el alcance comprometido (`COMPROMISOS.md`), las decisiones técnicas y su
justificación (`ARQUITECTURA.md`) y el estado del desarrollo (`ESTADO.md`).
