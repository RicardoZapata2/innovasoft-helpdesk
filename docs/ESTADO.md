# Estado del proyecto

Se actualiza al cerrar cada sesión de trabajo. Leerlo primero al iniciar una nueva.

**Última actualización:** 27 de octubre de 2026 — preparación de la segunda socialización (los cuatro módulos)

## Etapas

| # | Etapa | Estado |
|---|---|---|
| 1 | Cimientos: repo, base de datos, esquema, autenticación, permisos, sitio público | Terminada |
| 2 | Motor de puntos (F2): planes, bolsas, consumo, kardex, cierre de periodo | Terminada |
| 3 | Tickets (F1): ciclo de vida, adjuntos, actividades, cierre con descuento | Terminada |
| 4 | Citas (F3): calendario, disponibilidad, evidencias, consumo al realizarse | Terminada |
| 5 | Fidelización (F4): acumulación, catálogo administrable, canje | Terminada |
| 6 | Cierre: PDF, filtros, exportación, auditoría, manual de sustentación | Terminada |

Todos los ítems de `COMPROMISOS.md` están marcados y verificados en ejecución.

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
- Citas: calendario mensual, semanal y lista; franjas libres por asesor, no
  solapamiento, siete estados con confirmación previa, reprogramación con motivo
  (marca si fue fuera del plazo mínimo), cancelación con motivo, evidencias,
  vínculo opcional a un ticket, historial de cambios y consumo al realizarse
- La recompensa "visita sin consumo" se elige al agendar una visita presencial;
  la cita realizada no descuenta puntos y cancelarla devuelve el beneficio
- Cierre de periodo de facturación: expira el saldo de bolsas vencidas, cobra el
  descubierto de las bolsas vigentes y traslada lo que no alcanza
- Catálogo comercial administrable (planes, tarifas, recompensas, reglas) con
  registro en la bitácora; el seed ya no sobrescribe esos cambios
- Visor de la bitácora de auditoría con filtros y datos antes/después
- Kardex filtrable por ticket; los consumos de citas enlazan a la cita
- Despliegue en Render (`render.yaml`): un servicio web entrega API y frontend
- 85 pruebas unitarias y 6 de integración (incluye dos consumos simultáneos
  sobre la misma bolsa)

## Siguiente

- Notificaciones por correo real (hoy el enlace y la contraseña temporal se
  muestran en pantalla o en la consola del backend)
- Almacenamiento de adjuntos en un servicio de objetos para producción
- Cierre de periodo automático programado (hoy lo ejecuta Innovasoft desde Consumos)

## Notas de entorno

- Prisma quedó fijado en 7.10.0 exacto. No actualizar sin revisar.
- Desde Prisma 7 la cadena de conexión vive en `prisma.config.ts` y el cliente
  usa el adaptador `@prisma/adapter-pg`.
- `prisma migrate dev` ya no genera el cliente: hay que correr `npm run db:generate`.
- El rol `innovasoft_app` necesita `CREATEDB` para la base sombra de las
  migraciones. Solo aplica en desarrollo.
- En Render el disco es efímero: los adjuntos subidos se pierden al reiniciar el
  servicio. Para producción real se usaría un almacenamiento de objetos.
