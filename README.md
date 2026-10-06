# Innovasoft Helpdesk

Sistema web de gestión de soporte técnico y puntos para Innovasoft.

Proyecto de Práctica Profesional Integral (PPI-T) — Tecnología en Sistematización de
Datos, Politécnico Colombiano Jaime Isaza Cadavid.

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

| Capa | Tecnología |
|---|---|
| Backend | NestJS 12 + TypeScript |
| ORM | Prisma 7 con el adaptador `pg` |
| Base de datos | PostgreSQL 18 |
| Frontend | React 19 + Vite 7 + TypeScript |
| Estilos | Tailwind CSS 4 |
| Datos en cliente | TanStack Query |
| Seguridad | JWT con refresh rotativo, Argon2id |
| Reportes | PDFKit |
| Pruebas | Vitest + Supertest |

## Puesta en marcha

Requiere Node.js 22 o superior y PostgreSQL 18.

```bash
# Base de datos (una sola vez)
psql -U postgres -c "CREATE ROLE innovasoft_app WITH LOGIN PASSWORD 'innovasoft_dev_2026' CREATEDB;"
psql -U postgres -c "CREATE DATABASE innovasoft_helpdesk OWNER innovasoft_app ENCODING 'UTF8';"

# Backend
cd backend
npm install
cp .env.example .env          # completar JWT_ACCESS_SECRET y JWT_REFRESH_SECRET
npx prisma migrate deploy
npm run db:generate
npm run db:seed               # permisos, perfiles, planes, tarifas, estados
npm run db:demo               # usuarios, empresas, tickets y citas de ejemplo
npm run start:dev

# Frontend (otra terminal)
cd frontend
npm install
npm run dev
```

La aplicación queda en `http://localhost:5173`, la API en `http://localhost:3000/api`
y la documentación interactiva de la API en `http://localhost:3000/api/docs`.

## Usuarios de demostración

| Perfil | Correo | Contraseña |
|---|---|---|
| Administrador Innovasoft | admin@innovasoft.com | Admin123* |
| Coordinador de soporte | coordinador@innovasoft.com | Innovasoft2026 |
| Asesor | asesor.redes@innovasoft.com | Innovasoft2026 |
| Asesor | asesor.software@innovasoft.com | Innovasoft2026 |
| Administrador de empresa cliente | gerencia@andina.com | Innovasoft2026 |
| Usuario de empresa cliente | sistemas@andina.com | Innovasoft2026 |
| Administrador de empresa cliente | gerencia@delnorte.com | Innovasoft2026 |

## Pruebas

```bash
cd backend
npm run test       # reglas de negocio (motor de puntos, estados, agenda, canjes)
npm run test:e2e   # integración contra la base con los datos de demostración
```

## Despliegue

`render.yaml` describe el despliegue en Render: una base PostgreSQL y un servicio web
que compila el frontend y lo entrega desde la misma API. En Render se crea un
*Blueprint* apuntando a este repositorio y el resto es automático.

## Documentación

En `docs/`: el alcance comprometido (`COMPROMISOS.md`), las decisiones técnicas y su
justificación (`ARQUITECTURA.md`) y el estado del desarrollo (`ESTADO.md`).
