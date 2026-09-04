# Compromisos adquiridos

Checklist derivado literalmente de `Propuesta_PPI_Innovasoft.docx`, la propuesta
aprobada. **Este archivo es el criterio de aceptación del proyecto.** Un módulo se
considera terminado únicamente cuando todos sus ítems están marcados y verificados
en ejecución, no solo escritos.

Convención: `[ ]` pendiente · `[~]` en curso · `[x]` terminado y verificado

---

## F1 — Gestión integral de tickets de soporte

### Frontend
- [ ] Formulario de creación con categoría de servicio, descripción y prioridad
- [ ] Carga de evidencias (imágenes y archivos) en el ticket
- [ ] Bandeja del cliente con listado de sus tickets
- [ ] Filtros por estado, fecha, categoría y asesor
- [ ] Vista de detalle con la línea de tiempo del caso
- [ ] Panel del asesor con casos asignados organizados por estado
- [ ] Formulario de registro de actividades y horas trabajadas
- [ ] Cierre con selección del tipo de solución
- [ ] Exportación del historial y del reporte de cierre en PDF

### Backend
- [ ] Máquina de estados con los 7 estados: Abierto, Asignado, En atención, En espera del cliente, Resuelto, Cerrado, Reabierto
- [ ] Validación de transiciones permitidas según el perfil del usuario
- [ ] Asignación manual o automática de asesor
- [ ] Registro de actividades con horas trabajadas
- [ ] Cierre que invoca el motor de puntos **dentro de una única transacción**
- [ ] Carga de adjuntos con validación de tipo y tamaño
- [ ] Generación del PDF de cierre con: datos del cliente, código de ticket, historial de estados, solución aplicada, asesor responsable, detalle de horas y puntos consumidos
- [ ] Bitácora de auditoría de escritura única sobre cada cambio

### Base de datos
- [ ] Entidades: `empresa_cliente`, `usuario`, `asesor`, `ticket`, `categoria_servicio`, `estado_ticket`, `ticket_historial`, `ticket_actividad`, `adjunto`
- [ ] `ticket_historial` conserva estado anterior, estado nuevo, usuario ejecutor y marca de tiempo

---

## F2 — Gestión de planes y trazabilidad de puntos de servicio

### Modelo comercial
- [ ] Seis planes: Esencial (30 pts / 30 días), Profesional (100 / 30), Corporativo (250 / 30), Ilimitado (sin límite / 30 o 365), Recarga adicional (10, 25 o 50 / 30), Bono extraordinario (15 / 7 días)
- [ ] Tarifario de cinco servicios: soporte remoto básico (1 pt), soporte remoto extendido (2), visita en ciudad (5), visita fuera de ciudad (8), implementación programada (10)

### Frontend
- [ ] Página pública con presentación de la empresa, portafolio y comparación de planes, **sin autenticación**
- [ ] Flujo de contratación y renovación para el administrador de empresa cliente
- [ ] Panel de saldo con total disponible y desglose por bolsa con fecha de vencimiento
- [ ] Alerta visual cuando una bolsa está próxima a expirar
- [ ] Kardex de movimientos paginado
- [ ] Filtros por rango de fechas, tipo de movimiento y ticket asociado
- [ ] Exportación del kardex a PDF

### Backend
- [ ] Catálogo de planes y tarifas administrable
- [ ] Contratación que crea la suscripción y emite la bolsa con su vencimiento
- [ ] **Consumo por vencimiento más próximo** (no FIFO por fecha de compra)
- [ ] Consumo parcial multi-bolsa: un movimiento por cada bolsa afectada
- [ ] Saldo en descubierto permitido, marcado como pendiente y trasladado al siguiente periodo de facturación
- [ ] Transacción con bloqueo de filas (`SELECT FOR UPDATE`) contra doble consumo
- [ ] Proceso de cierre de periodo que expira bolsas vencidas y consolida el saldo pendiente

### Base de datos
- [ ] Entidades: `plan`, `tarifa_servicio`, `suscripcion`, `bolsa_puntos`, `movimiento_puntos`, `periodo_facturacion`
- [ ] Cada `movimiento_puntos` referencia el ticket o la cita que lo originó
- [ ] **El saldo se deriva de la suma de movimientos, nunca se almacena como dato suelto**

---

## F3 — Agendamiento de citas y visitas técnicas

### Frontend
- [ ] Calendario en vista mensual y semanal, filtrado según el perfil
- [ ] Selector de franjas disponibles calculadas por asesor
- [ ] Formulario con empresa, asesor, fecha, hora, modalidad, dirección o enlace
- [ ] Carga de evidencias en la cita
- [ ] Vinculación opcional a un ticket existente
- [ ] Reprogramación y cancelación con registro del motivo

### Backend
- [ ] Cálculo de franjas que cruza disponibilidad declarada con citas confirmadas
- [ ] Validación de no solapamiento por asesor
- [ ] Siete estados: Solicitada, Confirmada, Reprogramada, En curso, Realizada, Cancelada, No asistida
- [ ] Reglas de plazo mínimo para reprogramar o cancelar sin penalización
- [ ] Al marcarse Realizada, consume puntos según el tarifario usando el motor de F2

### Base de datos
- [ ] Entidades: `cita`, `disponibilidad_asesor`, `modalidad`, `estado_cita`
- [ ] La cita realizada genera un `movimiento_puntos` (1:1)

---

## F4 — Programa de fidelización y canje de recompensas

> Los puntos de fidelidad son una **moneda distinta** de los puntos de servicio: se
> ganan (no se compran) y se canjean (no se consumen en la prestación). Nunca
> comparten saldo.

### Reglas
- [ ] Acumulación: ticket con descripción y evidencia completas (+5), encuesta de satisfacción respondida al cierre (+10), renovación anticipada del plan (+50)
- [ ] Recompensas: 5 % de descuento en renovación (100), visita presencial sin consumo de puntos de servicio (250), 10 % de descuento (400), recarga de 10 puntos de servicio con 30 días de vigencia (500)

### Frontend
- [ ] Panel con saldo de puntos de fidelidad y detalle de cómo se obtuvieron
- [ ] Catálogo de recompensas con su costo
- [ ] Flujo de canje con confirmación previa
- [ ] Historial de canjes realizados
- [ ] En el historial de consumos, marca explícita de los servicios obtenidos por recompensa

### Backend
- [ ] Motor de reglas que evalúa eventos y emite puntos registrando su origen
- [ ] Catálogo administrable por Innovasoft con costo, vigencia y disponibilidad
- [ ] Canje que valida saldo, descuenta, emite el beneficio y deja trazabilidad del vínculo

### Base de datos
- [ ] Entidades: `regla_fidelizacion`, `movimiento_fidelidad`, `recompensa`, `canje`
- [ ] La recompensa que entrega puntos genera una `bolsa_puntos` marcada con origen promocional

---

## Componentes transversales

- [ ] Registro de empresas y usuarios
- [ ] Verificación de correo electrónico
- [ ] Inicio y cierre de sesión
- [ ] Recuperación y cambio de contraseña
- [ ] Hash de credenciales con algoritmo de derivación de clave con sal (Argon2id)
- [ ] Perfiles con permisos otorgados por módulo y por acción
- [ ] **Interfaz gráfica** para conceder o revocar permisos, individualmente o por módulo completo, sin tocar código
- [ ] Aislamiento por empresa: toda consulta de negocio restringida a la empresa del usuario autenticado
- [ ] Auditoría de operaciones sensibles con usuario, fecha y dato afectado
- [ ] Sitio público institucional como punto de entrada al registro

### Perfiles iniciales
- [ ] Administrador Innovasoft — ámbito global
- [ ] Coordinador de soporte — operación global
- [ ] Asesor — sus asignaciones
- [ ] Administrador de empresa cliente — su empresa
- [ ] Usuario de empresa cliente — sus propios registros
- [ ] El sistema permite crear perfiles adicionales sin intervenir el código

---

## Pruebas comprometidas

Casos límite que deben tener prueba automatizada:

- [ ] Consumo con saldo insuficiente (debe permitir descubierto, no reventar)
- [ ] Consumo contra una bolsa vencida (debe ignorarla)
- [ ] Consumo que atraviesa varias bolsas (un movimiento por bolsa)
- [ ] Dos cierres simultáneos sobre la misma bolsa (no debe haber doble gasto)
- [ ] Cita en horario ya ocupado por el mismo asesor (debe rechazarse)
- [ ] Acceso a datos de otra empresa (debe rechazarse)
