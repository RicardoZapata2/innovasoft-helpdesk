# Estado del proyecto

Se actualiza al cerrar cada sesión de trabajo. Leerlo primero al iniciar una nueva.

**Última actualización:** 6 de octubre de 2026 — primera socialización

## Etapas

| # | Etapa | Estado |
|---|---|---|
| 1 | Cimientos: repo, base de datos, esquema, autenticación, permisos, sitio público | Terminada |
| 2 | Motor de puntos (F2): planes, bolsas, consumo, kardex | Terminada (falta cierre de periodo) |
| 3 | Tickets (F1): ciclo de vida, adjuntos, actividades, cierre con descuento | Terminada |
| 4 | Citas (F3): calendario, disponibilidad, consumo al realizarse | Avanzada (falta vista de calendario y evidencias) |
| 5 | Fidelización (F4): acumulación, catálogo, canje | Avanzada (falta administración del catálogo) |
| 6 | Cierre: PDF, filtros, exportación, manual de sustentación | En curso |

Funcionalidades presentadas en la primera socialización: **F1 Tickets** y los
**reportes de puntos y calificación de clientes** (kardex con PDF, encuesta de
satisfacción, panel de calificación y programa de fidelización).

## Hecho

- Registro público de empresas con verificación de correo, login, refresh con
  rotación y detección de reutilización, logout, recuperación y cambio de contraseña
- Perfiles y permisos administrables desde la interfaz; aislamiento por empresa
- Sitio público con planes, tarifario y recompensas
- Motor de puntos: consumo por vencimiento más próximo, multi-bolsa, descubierto con
  tope, bloqueo `SELECT ... FOR UPDATE`; saldo derivado de movimientos
- Kardex paginado con filtros y exportación a PDF; marca de beneficios en el origen
- Tickets: creación con evidencias, bandeja con pestañas por estado y filtros,
  asignación manual o automática por menor carga, actividades y horas, resolución
  con tipo de solución, cierre que descuenta puntos en la misma transacción,
  reapertura sin doble cobro, línea de tiempo, reporte de cierre en PDF
- Encuesta de satisfacción (1 a 5) al resolver; panel de calificación de clientes
- Fidelización: +5 por ticket con evidencia, +10 por encuesta, +50 por renovación
  anticipada; canje con confirmación; descuento aplicado al renovar; recarga
  promocional como bolsa de origen `PROMOCION`
- Citas: franjas libres por asesor, no solapamiento, estados, consumo al realizarse
- Despliegue en Render (`render.yaml`): un servicio web entrega API y frontend
- 79 pruebas unitarias y 5 de integración

## Siguiente

- Cierre de periodo de facturación (expirar bolsas y consolidar descubierto)
- Vista de calendario mensual y semanal en citas; evidencias en la cita
- Administración del catálogo de recompensas y reglas desde la interfaz
- Visor de la bitácora de auditoría
- Filtro por ticket en la pantalla del kardex (el backend ya lo soporta)
- Prueba automatizada de dos cierres simultáneos sobre la misma bolsa

## Notas de entorno

- Prisma quedó fijado en 7.10.0 exacto. No actualizar sin revisar.
- Desde Prisma 7 la cadena de conexión vive en `prisma.config.ts` y el cliente
  usa el adaptador `@prisma/adapter-pg`.
- `prisma migrate dev` ya no genera el cliente: hay que correr `npm run db:generate`.
- El rol `innovasoft_app` necesita `CREATEDB` para la base sombra de las
  migraciones. Solo aplica en desarrollo.
- En Render el disco es efímero: los adjuntos subidos se pierden al reiniciar el
  servicio. Para producción real se usaría un almacenamiento de objetos.
