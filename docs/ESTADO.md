# Estado del proyecto

Se actualiza al cerrar cada sesión de trabajo. Leerlo primero al iniciar una nueva.

**Última actualización:** etapa 1 en curso

## Etapas

| # | Etapa | Estado |
|---|---|---|
| 1 | Cimientos: repo, base de datos, esquema, autenticación, permisos, sitio público | En curso |
| 2 | Motor de puntos (F2): planes, bolsas, consumo, kardex | Pendiente |
| 3 | Tickets (F1): ciclo de vida, adjuntos, actividades, cierre con descuento | Pendiente |
| 4 | Citas (F3): calendario, disponibilidad, consumo al realizarse | Pendiente |
| 5 | Fidelización (F4): acumulación, catálogo, canje | Pendiente |
| 6 | Cierre: PDF, filtros, exportación, manual de sustentación | Pendiente |

El motor de puntos va antes que los tickets porque el cierre del ticket depende de él.

## Hecho

- PostgreSQL 18.6 instalado y corriendo en `localhost:5432`
- Base de datos `innovasoft_helpdesk` creada, propiedad del rol `innovasoft_app`
- Repositorio conectado a `github.com/RicardoZapata2/innovasoft-helpdesk`
- Documentación base: `CLAUDE.md`, `COMPROMISOS.md`, `ARQUITECTURA.md`

## Siguiente

- Estructura de `backend/` con NestJS
- Esquema Prisma completo con las entidades de las cuatro funcionalidades
- Primera migración y datos iniciales (planes, tarifas, perfiles, permisos)

## Decisiones pendientes de confirmar con Ricardo

Ninguna por ahora.
