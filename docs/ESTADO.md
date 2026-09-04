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

- PostgreSQL 18.6 corriendo en `localhost:5432`
- Base de datos `innovasoft_helpdesk`, propiedad del rol `innovasoft_app`
- Repositorio en `github.com/RicardoZapata2/innovasoft-helpdesk`
- Documentación base: `CLAUDE.md`, `COMPROMISOS.md`, `ARQUITECTURA.md`
- Backend NestJS generado en modo estricto
- Esquema de datos completo: 31 tablas cubriendo las cuatro funcionalidades
- Migración `esquema_inicial` aplicada y verificada contra la base
- Datos iniciales cargados: 53 permisos, 5 perfiles con 119 asignaciones,
  9 planes, 5 tarifas, 6 categorías, 7 estados de ticket con 11 transiciones,
  7 estados de cita, 2 modalidades, 3 reglas de fidelización, 4 recompensas
- Usuario administrador `admin@innovasoft.com` (contraseña de desarrollo `Admin123*`)

## Siguiente

- Módulo de autenticación: registro, verificación de correo, login, refresh con
  rotación, recuperación de contraseña
- Guards de permisos y de aislamiento por empresa
- Filtro global de errores en formato RFC 7807

## Notas de entorno

- Prisma quedó fijado en 7.10.0 exacto. La etiqueta `latest` de la CLI apunta a
  `8.0.0-rc.13`, un candidato de lanzamiento que además queda desalineado con el
  cliente estable. No actualizar sin revisar.
- Desde Prisma 7 la cadena de conexión vive en `prisma.config.ts` y el cliente
  usa el adaptador `@prisma/adapter-pg`.
- `prisma migrate dev` ya no genera el cliente: hay que correr `npm run db:generate`.
- El rol `innovasoft_app` necesita `CREATEDB` para la base sombra de las
  migraciones. Solo aplica en desarrollo.

## Decisiones pendientes de confirmar con Ricardo

Ninguna por ahora.
