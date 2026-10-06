# Compromisos adquiridos

Checklist derivado literalmente de `Propuesta_PPI_Innovasoft.docx`, la propuesta
aprobada. **Este archivo es el criterio de aceptación del proyecto.** Un módulo se
considera terminado únicamente cuando todos sus ítems están marcados y verificados
en ejecución, no solo escritos.

Convención: `[ ]` pendiente · `[~]` en curso · `[x]` terminado y verificado

---

## F1 — Gestión integral de tickets de soporte

### Frontend
- [x] Formulario de creación con categoría de servicio, descripción y prioridad
- [x] Carga de evidencias (imágenes y archivos) en el ticket
- [x] Bandeja del cliente con listado de sus tickets
- [x] Filtros por estado, fecha, categoría y asesor
- [x] Vista de detalle con la línea de tiempo del caso
- [x] Panel del asesor con casos asignados organizados por estado
- [x] Formulario de registro de actividades y horas trabajadas
- [x] Cierre con selección del tipo de solución
- [x] Exportación del historial y del reporte de cierre en PDF

### Backend
- [x] Máquina de estados con los 7 estados: Abierto, Asignado, En atención, En espera del cliente, Resuelto, Cerrado, Reabierto
- [x] Validación de transiciones permitidas según el perfil del usuario
- [x] Asignación manual o automática de asesor
- [x] Registro de actividades con horas trabajadas
- [x] Cierre que invoca el motor de puntos **dentro de una única transacción**
- [x] Carga de adjuntos con validación de tipo y tamaño
- [x] Generación del PDF de cierre con: datos del cliente, código de ticket, historial de estados, solución aplicada, asesor responsable, detalle de horas y puntos consumidos
- [x] Bitácora de auditoría de escritura única sobre cada cambio

### Base de datos
- [x] Entidades: `empresa_cliente`, `usuario`, `asesor`, `ticket`, `categoria_servicio`, `estado_ticket`, `ticket_historial`, `ticket_actividad`, `adjunto`
- [x] `ticket_historial` conserva estado anterior, estado nuevo, usuario ejecutor y marca de tiempo

---

## F2 — Gestión de planes y trazabilidad de puntos de servicio

### Modelo comercial
- [x] Seis planes: Esencial (30 pts / 30 días), Profesional (100 / 30), Corporativo (250 / 30), Ilimitado (sin límite / 30 o 365), Recarga adicional (10, 25 o 50 / 30), Bono extraordinario (15 / 7 días)
- [x] Tarifario de cinco servicios: soporte remoto básico (1 pt), soporte remoto extendido (2), visita en ciudad (5), visita fuera de ciudad (8), implementación programada (10)

### Frontend
- [x] Página pública con presentación de la empresa, portafolio y comparación de planes, **sin autenticación**
- [x] Flujo de contratación y renovación para el administrador de empresa cliente
- [x] Panel de saldo con total disponible y desglose por bolsa con fecha de vencimiento
- [x] Alerta visual cuando una bolsa está próxima a expirar
- [x] Kardex de movimientos paginado
- [~] Filtros por rango de fechas, tipo de movimiento y ticket asociado
- [x] Exportación del kardex a PDF

### Backend
- [~] Catálogo de planes y tarifas administrable
- [x] Contratación que crea la suscripción y emite la bolsa con su vencimiento
- [x] **Consumo por vencimiento más próximo** (no FIFO por fecha de compra)
- [x] Consumo parcial multi-bolsa: un movimiento por cada bolsa afectada
- [~] Saldo en descubierto permitido, marcado como pendiente y trasladado al siguiente periodo de facturación
- [x] Transacción con bloqueo de filas (`SELECT FOR UPDATE`) contra doble consumo
- [~] Proceso de cierre de periodo que expira bolsas vencidas y consolida el saldo pendiente

### Base de datos
- [x] Entidades: `plan`, `tarifa_servicio`, `suscripcion`, `bolsa_puntos`, `movimiento_puntos`, `periodo_facturacion`
- [x] Cada `movimiento_puntos` referencia el ticket o la cita que lo originó
- [x] **El saldo se deriva de la suma de movimientos, nunca se almacena como dato suelto**

---

## F3 — Agendamiento de citas y visitas técnicas

### Frontend
- [~] Calendario en vista mensual y semanal, filtrado según el perfil
- [x] Selector de franjas disponibles calculadas por asesor
- [x] Formulario con empresa, asesor, fecha, hora, modalidad, dirección o enlace
- [~] Carga de evidencias en la cita
- [~] Vinculación opcional a un ticket existente
- [~] Reprogramación y cancelación con registro del motivo

### Backend
- [x] Cálculo de franjas que cruza disponibilidad declarada con citas confirmadas
- [x] Validación de no solapamiento por asesor
- [x] Siete estados: Solicitada, Confirmada, Reprogramada, En curso, Realizada, Cancelada, No asistida
- [x] Reglas de plazo mínimo para reprogramar o cancelar sin penalización
- [x] Al marcarse Realizada, consume puntos según el tarifario usando el motor de F2

### Base de datos
- [x] Entidades: `cita`, `disponibilidad_asesor`, `modalidad`, `estado_cita`
- [x] La cita realizada genera un `movimiento_puntos` (1:1)

---

## F4 — Programa de fidelización y canje de recompensas

> Los puntos de fidelidad son una **moneda distinta** de los puntos de servicio: se
> ganan (no se compran) y se canjean (no se consumen en la prestación). Nunca
> comparten saldo.

### Reglas
- [x] Acumulación: ticket con descripción y evidencia completas (+5), encuesta de satisfacción respondida al cierre (+10), renovación anticipada del plan (+50)
- [x] Recompensas: 5 % de descuento en renovación (100), visita presencial sin consumo de puntos de servicio (250), 10 % de descuento (400), recarga de 10 puntos de servicio con 30 días de vigencia (500)

### Frontend
- [x] Panel con saldo de puntos de fidelidad y detalle de cómo se obtuvieron
- [x] Catálogo de recompensas con su costo
- [x] Flujo de canje con confirmación previa
- [x] Historial de canjes realizados
- [x] En el historial de consumos, marca explícita de los servicios obtenidos por recompensa

### Backend
- [x] Motor de reglas que evalúa eventos y emite puntos registrando su origen
- [~] Catálogo administrable por Innovasoft con costo, vigencia y disponibilidad
- [x] Canje que valida saldo, descuenta, emite el beneficio y deja trazabilidad del vínculo

### Base de datos
- [x] Entidades: `regla_fidelizacion`, `movimiento_fidelidad`, `recompensa`, `canje`
- [x] La recompensa que entrega puntos genera una `bolsa_puntos` marcada con origen promocional

---

## Componentes transversales

- [x] Registro de empresas y usuarios
- [x] Verificación de correo electrónico
- [x] Inicio y cierre de sesión
- [x] Recuperación y cambio de contraseña
- [x] Hash de credenciales con algoritmo de derivación de clave con sal (Argon2id)
- [x] Perfiles con permisos otorgados por módulo y por acción
- [x] **Interfaz gráfica** para conceder o revocar permisos, individualmente o por módulo completo, sin tocar código
- [x] Aislamiento por empresa: toda consulta de negocio restringida a la empresa del usuario autenticado
- [x] Auditoría de operaciones sensibles con usuario, fecha y dato afectado
- [x] Sitio público institucional como punto de entrada al registro

### Perfiles iniciales
- [x] Administrador Innovasoft — ámbito global
- [x] Coordinador de soporte — operación global
- [x] Asesor — sus asignaciones
- [x] Administrador de empresa cliente — su empresa
- [x] Usuario de empresa cliente — sus propios registros
- [x] El sistema permite crear perfiles adicionales sin intervenir el código

---

## Pruebas comprometidas

Casos límite que deben tener prueba automatizada:

- [x] Consumo con saldo insuficiente (debe permitir descubierto, no reventar)
- [x] Consumo contra una bolsa vencida (debe ignorarla)
- [x] Consumo que atraviesa varias bolsas (un movimiento por bolsa)
- [~] Dos cierres simultáneos sobre la misma bolsa (no debe haber doble gasto)
- [x] Cita en horario ya ocupado por el mismo asesor (debe rechazarse)
- [x] Acceso a datos de otra empresa (debe rechazarse)
