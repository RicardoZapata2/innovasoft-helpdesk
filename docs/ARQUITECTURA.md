# Arquitectura y decisiones técnicas

Este documento explica **qué se eligió, por qué, y qué se descartó**. Está escrito
para poder sustentarlo oralmente: cada decisión tiene su razón y su alternativa
rechazada.

## Visión general

La aplicación se divide en dos proyectos independientes que se comunican por HTTP:

```
frontend/  React + Vite         →  navegador del usuario
backend/   NestJS + Prisma      →  API REST
                                   ↓
                                   PostgreSQL 18
```

La separación es física y deliberada: el documento de propuesta describe, para cada
funcionalidad, un frontend y un backend distintos. Tenerlos como proyectos separados
permite señalar cada responsabilidad sin ambigüedad.

## Decisiones y su justificación

### Por qué NestJS y no Express o Next.js

NestJS impone una estructura por capas (módulo → controlador → servicio → repositorio)
que coincide con la forma en que el proyecto fue descrito en la propuesta. Además, tres
requisitos transversales que prometimos son piezas nativas del framework y no inventos
propios: los **guards** resuelven el control de permisos, los **interceptors** resuelven
la auditoría y los **pipes** resuelven la validación de entrada.

Se descartó Express porque no impone estructura: con el volumen de módulos de este
proyecto, el resultado tiende a desordenarse. Se descartó Next.js porque mezcla
frontend y backend en un mismo proyecto, lo que difumina justamente la separación que
la propuesta describe.

### Por qué Prisma

El archivo `schema.prisma` es una representación legible del modelo entidad-relación:
sirve simultáneamente como definición del esquema y como documentación del MER. Sus
migraciones quedan versionadas en el repositorio, lo que da trazabilidad de cómo
evolucionó la base de datos.

Para el bloqueo pesimista del motor de puntos se usa SQL directo (`SELECT ... FOR UPDATE`)
dentro de una transacción de Prisma, porque el bloqueo de filas no está expuesto en su
API de alto nivel.

### Por qué capas limpias y no arquitectura hexagonal completa

Cada módulo se organiza en cuatro capas:

| Capa | Responsabilidad | Depende de |
|---|---|---|
| `domain` | Reglas del negocio y entidades | Nada |
| `application` | Casos de uso que orquestan el dominio | `domain` |
| `infrastructure` | Repositorios Prisma, adaptadores externos | `domain` |
| `presentation` | Controladores, DTOs, validación | `application` |

La regla es que las dependencias apuntan hacia adentro: el dominio no sabe que existe
Prisma ni HTTP, por lo que sus reglas se pueden probar sin base de datos.

Se descartó la arquitectura hexagonal completa con puertos y adaptadores explícitos.
Para el tamaño de este sistema añade una capa de indirección que no resuelve ningún
problema real y hace más difícil explicar el recorrido de una petición, que es
precisamente lo que el proyecto necesita poder hacer.

### El motor de puntos

Es la pieza crítica del sistema y concentra las decisiones más delicadas.

**Orden de consumo: vencimiento más próximo.** Cuando un cliente tiene varias bolsas
vigentes, se consume primero la que expira antes. Esto minimiza los puntos que el
cliente pierde por vencimiento. No es FIFO: FIFO consumiría primero la comprada antes,
que no siempre es la que vence antes (una bolsa comprada después puede tener una
vigencia más corta).

**Consumo parcial entre bolsas.** Si un servicio cuesta 50 puntos y la bolsa que vence
primero solo tiene 30, se toman 30 de esa y 20 de la siguiente. Por eso se registra un
movimiento por cada bolsa afectada, no uno por servicio.

**Saldo en descubierto.** Si el total disponible no alcanza, la operación no se bloquea:
el asesor ya prestó el servicio. El excedente se marca como pendiente y se traslada al
cierre del siguiente periodo de facturación.

**Atomicidad y concurrencia.** Todo el consumo ocurre dentro de una transacción que
bloquea las filas de las bolsas involucradas con `SELECT ... FOR UPDATE`. Sin ese
bloqueo, dos cierres simultáneos podrían leer el mismo saldo y gastarlo dos veces.

**El saldo no se almacena.** Se deriva sumando los movimientos sobre las bolsas
vigentes. Guardar un campo `saldo` obligaría a mantenerlo sincronizado con el historial,
y cualquier fallo dejaría los dos datos contradiciéndose. Derivarlo hace imposible esa
inconsistencia.

**El descuento es síncrono, no un evento.** Se evaluó dispararlo con un evento al marcar
el ticket como resuelto. Se descartó: un evento asíncrono se ejecuta fuera de la
transacción, lo que reintroduce exactamente la condición de carrera que el bloqueo
evita. Los eventos se reservan para efectos secundarios no críticos, como las
notificaciones y la emisión de puntos de fidelidad.

### Dos monedas separadas

El sistema maneja dos tipos de punto que nunca comparten saldo:

| | Puntos de servicio | Puntos de fidelidad |
|---|---|---|
| Origen | Se compran en un plan | Se ganan por actividad |
| Uso | Se consumen al recibir soporte | Se canjean por recompensas |
| Vigencia | Vence con el plan | Vigencia propia |
| Descubierto | Permitido | Nunca |

Mezclarlas en un solo saldo haría imposible responder qué pagó el cliente y qué obtuvo
como beneficio, que es una de las consultas que el sistema debe soportar.

### Seguridad

- **Contraseñas:** Argon2id, ganador del Password Hashing Competition y recomendación
  actual de OWASP frente a bcrypt.
- **Sesión:** JWT de acceso de corta duración más refresh token con rotación.
- **Aislamiento entre empresas:** un guard verifica, en cada petición, que el recurso
  solicitado pertenece a la empresa del usuario autenticado. Es la protección más
  importante del sistema: sin ella, un cliente podría leer los tickets de otro.
- **Validación de entrada:** DTOs con `class-validator` en cada endpoint. Prisma
  parametriza las consultas, lo que cierra la inyección SQL por construcción.
- **Errores:** filtro global de excepciones que responde en formato RFC 7807 y nunca
  expone trazas de pila.

### Permisos granulares

Un usuario pertenece a un perfil, y un perfil agrupa permisos con la forma
`modulo.accion` (por ejemplo `tickets.cerrar`). La verificación es un guard que compara
el permiso exigido por el endpoint contra los permisos del perfil del usuario.

Los permisos viven en la base de datos, no en el código. Eso es lo que permite que la
pantalla de administración conceda o revoque permisos sin recompilar nada, y que la
empresa cree perfiles nuevos.

## Estructura del repositorio

```
backend/
  prisma/
    schema.prisma        modelo de datos (equivale al MER)
    migrations/          historial versionado de cambios
    seed.ts              datos iniciales: planes, tarifas, perfiles, permisos
  src/
    modules/
      auth/              registro, login, recuperación de contraseña
      usuarios/          usuarios, perfiles y permisos
      empresas/          empresas cliente
      tickets/           F1
      puntos/            F2 — planes, bolsas y motor de consumo
      citas/             F3
      fidelizacion/      F4
    shared/
      guards/            autenticación, permisos, aislamiento por empresa
      interceptors/      auditoría
      filters/           manejo global de errores
frontend/
  src/
    features/            una carpeta por módulo
    components/          componentes reutilizables
    lib/                 cliente HTTP, utilidades
docs/                    documentación del proyecto
```
