# Innovasoft Helpdesk

Sistema web de gestión de soporte técnico y puntos para Innovasoft.
Proyecto de Práctica Profesional Integral (PPI-T).

## Regla de oro

`docs/COMPROMISOS.md` es el contrato de alcance, derivado de la propuesta aprobada
(`docs/Propuesta_PPI_Innovasoft.docx`). Ninguna funcionalidad de esa lista se recorta,
se simplifica en silencio ni se reinterpreta por conveniencia técnica. Antes de dar
un módulo por terminado se verifica ítem por ítem contra ese archivo. Si algo resulta
más costoso de lo previsto, se dice y se decide; no se entrega una versión reducida.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | NestJS + TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL 18 |
| Frontend | React + Vite + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Datos en cliente | TanStack Query |
| Pruebas | Jest + Supertest |
| PDF | PDFKit |

## Comandos

```bash
# Backend  (desde backend/)
npm run start:dev        # API en http://localhost:3000
npm run test             # pruebas unitarias
npm run test:e2e         # pruebas de integración
npx prisma migrate dev   # aplicar cambios del esquema
npx prisma studio        # explorador visual de la base de datos

# Frontend (desde frontend/)
npm run dev              # aplicación en http://localhost:5173
```

## Convenciones de código

Este código lo sustenta oralmente un estudiante ante un docente. Todo lo demás
se subordina a esa restricción.

- **Sin huella de generación automática.** No se escriben comentarios que narren lo
  obvio línea por línea, encabezados decorativos de bloque, ni docstrings formulaicos
  en funciones triviales. Un comentario existe solo cuando explica una decisión o una
  regla de negocio que no se deduce leyendo el código.
- **Nombres:** el dominio va en español (`bolsaPuntos`, `saldoDisponible`,
  `consumirPuntos`); la infraestructura del framework va en inglés (`findById`,
  `Repository`, `Module`). Consistente, nunca mezclado dentro de una misma capa.
- **Preferir lo explicable sobre lo ingenioso.** Si una abstracción es difícil de
  defender en voz alta, es la abstracción equivocada para este proyecto.
- Sin `TODO`, sin código comentado, sin funciones a medio terminar en `main`.
- Cada regla de negocio no evidente se acompaña de su prueba automatizada.

## Estructura

```
backend/src/
  modules/<modulo>/
    domain/          reglas y entidades del negocio, sin dependencias externas
    application/     casos de uso que orquestan el dominio
    infrastructure/  repositorios Prisma, adaptadores
    presentation/    controladores, DTOs
  shared/            guards, interceptores, filtros, utilidades transversales
frontend/src/
  features/<modulo>/ vistas y lógica de cada módulo
  components/        componentes reutilizables
  lib/               cliente HTTP, utilidades
```

## Documentos

| Archivo | Para qué |
|---|---|
| `docs/COMPROMISOS.md` | Checklist del contrato. Criterio de aceptación. |
| `docs/ARQUITECTURA.md` | Decisiones técnicas y su justificación. |
| `docs/ESTADO.md` | Qué está hecho y qué sigue. Se actualiza al cerrar cada sesión. |
| `docs/Propuesta_PPI_Innovasoft.docx` | La propuesta aprobada. Fuente de los compromisos. |

El manual de sustentación (`docs/MANUAL.md`) se redacta en la etapa 6, cuando ya
existe el código que describe.

Al iniciar una sesión de trabajo, leer `docs/ESTADO.md` primero. Los demás
documentos se consultan solo cuando la tarea lo requiere.
