import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from '@node-rs/argon2';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Datos de demostración para poder recorrer la aplicación con cada perfil sin
// tener que crear usuarios a mano ni leer contraseñas temporales en la consola.
// No sustituye al seed: este script asume que los permisos, perfiles, planes y
// tarifas ya están cargados.
const CLAVE = 'Innovasoft2026';

const EQUIPO_INNOVASOFT = [
  { email: 'coordinador@innovasoft.com', nombres: 'Daniela', apellidos: 'Restrepo', perfil: 'Coordinador de soporte' },
  { email: 'asesor.redes@innovasoft.com', nombres: 'Mateo', apellidos: 'Vargas', perfil: 'Asesor', especialidad: 'Infraestructura y redes' },
  { email: 'asesor.software@innovasoft.com', nombres: 'Valentina', apellidos: 'Ríos', perfil: 'Asesor', especialidad: 'Aplicaciones y bases de datos' },
];

const EMPRESAS = [
  {
    nit: '900456789',
    razonSocial: 'Comercializadora Andina S.A.S.',
    direccion: 'Carrera 43A #18-95, Medellín',
    telefono: '6044445566',
    plan: 'profesional',
    usuarios: [
      { email: 'gerencia@andina.com', nombres: 'Laura', apellidos: 'Mejía', perfil: 'Administrador de empresa cliente' },
      { email: 'sistemas@andina.com', nombres: 'Andrés', apellidos: 'Cardona', perfil: 'Usuario de empresa cliente' },
    ],
  },
  {
    nit: '901234567',
    razonSocial: 'Transportes del Norte Ltda.',
    direccion: 'Calle 50 #12-30, Bello',
    telefono: '6047778899',
    plan: 'esencial',
    usuarios: [
      { email: 'gerencia@delnorte.com', nombres: 'Camilo', apellidos: 'Arango', perfil: 'Administrador de empresa cliente' },
    ],
  },
];

const JORNADA = [
  { horaInicio: '08:00', horaFin: '12:00' },
  { horaInicio: '14:00', horaFin: '17:00' },
];

async function perfilPorNombre(nombre: string): Promise<string> {
  const perfil = await prisma.perfil.findUnique({ where: { nombre } });

  if (perfil === null) {
    throw new Error(`Falta el perfil "${nombre}". Ejecuta primero npm run db:seed.`);
  }

  return perfil.id;
}

async function crearUsuario(datos: {
  email: string;
  nombres: string;
  apellidos: string;
  perfil: string;
  empresaId?: string;
  especialidad?: string;
}) {
  const passwordHash = await hash(CLAVE);
  const perfilId = await perfilPorNombre(datos.perfil);

  const usuario = await prisma.usuario.upsert({
    where: { email: datos.email },
    update: { activo: true, debeCambiarPassword: false, passwordHash, perfilId },
    create: {
      email: datos.email,
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      passwordHash,
      perfilId,
      empresaId: datos.empresaId ?? null,
      emailVerificado: true,
      // Los usuarios de demostración entran directo: pedirles cambiar la
      // contraseña en cada arranque haría la demostración más lenta sin
      // demostrar nada nuevo.
      debeCambiarPassword: false,
    },
  });

  if (datos.perfil === 'Asesor') {
    const asesor = await prisma.asesor.upsert({
      where: { usuarioId: usuario.id },
      update: { activo: true, especialidad: datos.especialidad ?? null },
      create: { usuarioId: usuario.id, especialidad: datos.especialidad ?? null },
    });

    await prisma.disponibilidadAsesor.deleteMany({ where: { asesorId: asesor.id } });
    await prisma.disponibilidadAsesor.createMany({
      data: [1, 2, 3, 4, 5].flatMap((diaSemana) =>
        JORNADA.map((tramo) => ({ asesorId: asesor.id, diaSemana, ...tramo })),
      ),
    });
  }

  return usuario;
}

function proximoDia(desde: Date, diasAdelante: number, horaInicio: number): Date {
  const fecha = new Date(desde);
  fecha.setDate(fecha.getDate() + diasAdelante);
  fecha.setHours(horaInicio, 0, 0, 0);

  while (fecha.getDay() === 0 || fecha.getDay() === 6) {
    fecha.setDate(fecha.getDate() + 1);
  }

  return fecha;
}

// Tickets en distintos puntos del ciclo de vida. Los cerrados descuentan de la
// bolsa del plan y los calificados acumulan fidelidad, igual que lo haría la
// aplicación, para que el kardex y el programa de puntos muestren historia real.
async function crearTicketsDeEjemplo(
  empresaId: string,
  asesores: Array<{ id: string; usuarioId: string }>,
) {
  if ((await prisma.ticket.count({ where: { empresaId } })) > 0 || asesores.length === 0) {
    return;
  }

  const [solicitante, coordinador, estados, categorias, tarifas, reglas, bolsa] = await Promise.all([
    prisma.usuario.findUniqueOrThrow({ where: { email: 'sistemas@andina.com' } }),
    prisma.usuario.findUniqueOrThrow({ where: { email: 'coordinador@innovasoft.com' } }),
    prisma.estadoTicket.findMany(),
    prisma.categoriaServicio.findMany(),
    prisma.tarifaServicio.findMany(),
    prisma.reglaFidelizacion.findMany(),
    prisma.bolsaPuntos.findFirstOrThrow({ where: { empresaId, origen: 'PLAN' }, orderBy: { venceEn: 'desc' } }),
  ]);

  const estado = (clave: string) => estados.find((e) => e.clave === clave)!;
  const categoria = (clave: string) => categorias.find((c) => c.clave === clave)!.id;
  const tarifa = (clave: string) => tarifas.find((t) => t.clave === clave)!;
  const regla = (evento: string) => reglas.find((r) => r.evento === evento)!;

  const RECORRIDO = ['abierto', 'asignado', 'en_atencion', 'resuelto', 'cerrado'];

  const plantillas = [
    { dias: 20, estado: 'cerrado', categoria: 'falla_aplicacion', prioridad: 'ALTA' as const, titulo: 'El módulo de facturación no genera el PDF', descripcion: 'Desde el lunes, al emitir una factura el sistema muestra "Error 500" y no descarga el PDF. Afecta a todo el equipo de cartera.', horas: [1.5], solucion: 'Corrección aplicada', detalle: 'Se reinstaló la librería de generación de PDF en el servidor y se verificó la emisión de 5 facturas.', calificacion: 5 },
    { dias: 14, estado: 'cerrado', categoria: 'configuracion', prioridad: 'MEDIA' as const, titulo: 'Configurar impresora de la bodega', descripcion: 'La impresora de etiquetas de la bodega no aparece en el sistema de inventario después del cambio de red.', horas: [0.5], solucion: 'Configuración ajustada', detalle: 'Se asignó IP fija a la impresora y se registró de nuevo en el servidor de impresión.', calificacion: 4 },
    { dias: 9, estado: 'cerrado', categoria: 'capacitacion', prioridad: 'BAJA' as const, titulo: 'Capacitación en el nuevo módulo de compras', descripcion: 'Necesitamos una sesión para los tres auxiliares de compras sobre el flujo de órdenes y aprobaciones.', horas: [1, 0.75], solucion: 'Capacitación al usuario', detalle: 'Sesión remota de 1 hora y 45 minutos con los tres auxiliares; se entregó la guía de uso.', calificacion: 5 },
    { dias: 6, estado: 'cerrado', categoria: 'error_datos', prioridad: 'ALTA' as const, titulo: 'Saldos de inventario descuadrados', descripcion: 'El reporte de inventario muestra existencias negativas en 12 referencias que físicamente sí están en bodega.', horas: [0.75], solucion: 'Corrección aplicada', detalle: 'Se corrigió un traslado duplicado y se recalcularon los saldos de las referencias afectadas.', calificacion: 4 },
    { dias: 3, estado: 'resuelto', categoria: 'infraestructura', prioridad: 'MEDIA' as const, titulo: 'Lentitud en el servidor de aplicaciones', descripcion: 'En las tardes el sistema tarda más de un minuto en abrir cualquier pantalla. En la mañana funciona normal.', horas: [1, 0.5], solucion: 'Solución temporal', detalle: 'Se reprogramó la copia de seguridad que corría a las 2 p. m. Se recomienda ampliar memoria del servidor.' },
    { dias: 2, estado: 'en_atencion', categoria: 'falla_aplicacion', prioridad: 'CRITICA' as const, titulo: 'No permite cerrar caja en el punto de venta', descripcion: 'Al intentar el cierre de caja aparece "transacción bloqueada" y no deja continuar. Tenemos dos cajas detenidas.', horas: [0.5] },
    { dias: 1, estado: 'asignado', categoria: 'solicitud_cambio', prioridad: 'BAJA' as const, titulo: 'Agregar campo de centro de costos en requisiciones', descripcion: 'Solicitamos que el formulario de requisiciones permita elegir el centro de costos.', horas: [] },
    { dias: 0, estado: 'abierto', categoria: 'configuracion', prioridad: 'MEDIA' as const, titulo: 'Crear usuario para nueva auxiliar contable', descripcion: 'Ingresó una auxiliar contable y necesita acceso al módulo de contabilidad con permisos de consulta.', horas: [] },
  ];

  const anio = new Date().getFullYear();

  for (const [indice, p] of plantillas.entries()) {
    const asesor = asesores[indice % asesores.length];
    const abiertoEn = new Date(Date.now() - p.dias * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000);
    const pasos = RECORRIDO.slice(0, RECORRIDO.indexOf(p.estado) + 1);
    const momento = (paso: number) => new Date(abiertoEn.getTime() + paso * 40 * 60 * 1000);
    const cerrado = p.estado === 'cerrado';
    const horas = p.horas.reduce((t, h) => t + h, 0);
    const aplicada = cerrado ? tarifa(horas > 1 ? 'soporte_remoto_extendido' : 'soporte_remoto_basico') : null;

    const ticket = await prisma.ticket.create({
      data: {
        codigo: `TCK-${anio}-${String(indice + 1).padStart(4, '0')}`,
        empresaId,
        solicitanteId: solicitante.id,
        asesorId: p.estado === 'abierto' ? null : asesor.id,
        categoriaId: categoria(p.categoria),
        estadoId: estado(p.estado).id,
        prioridad: p.prioridad,
        titulo: p.titulo,
        descripcion: p.descripcion,
        tipoSolucion: p.solucion ?? null,
        descripcionSolucion: p.detalle ?? null,
        tarifaAplicadaId: aplicada?.id ?? null,
        abiertoEn,
        resueltoEn: pasos.includes('resuelto') ? momento(pasos.indexOf('resuelto')) : null,
        cerradoEn: cerrado ? momento(pasos.length) : null,
      },
    });

    for (const [paso, clave] of pasos.entries()) {
      await prisma.ticketHistorial.create({
        data: {
          ticketId: ticket.id,
          estadoAnteriorId: paso === 0 ? null : estado(pasos[paso - 1]).id,
          estadoNuevoId: estado(clave).id,
          usuarioId: paso === 0 ? solicitante.id : clave === 'asignado' ? coordinador.id : asesor.usuarioId,
          comentario: paso === 0 ? 'Ticket registrado' : clave === 'resuelto' ? (p.solucion ?? null) : null,
          createdAt: momento(paso),
        },
      });
    }

    for (const [n, h] of p.horas.entries()) {
      await prisma.ticketActividad.create({
        data: {
          ticketId: ticket.id,
          asesorId: asesor.id,
          descripcion: n === 0 ? 'Diagnóstico remoto del caso' : 'Aplicación y verificación de la solución',
          horas: h,
          fecha: momento(2 + n * 0.5),
        },
      });
    }

    if (aplicada !== null) {
      await prisma.movimientoPuntos.create({
        data: {
          empresaId,
          bolsaId: bolsa.id,
          tipo: 'CONSUMO',
          puntos: -aplicada.puntos,
          ticketId: ticket.id,
          descripcion: `Ticket ${ticket.codigo} — ${aplicada.nombre}`,
          registradoPorId: asesor.usuarioId,
          createdAt: momento(pasos.length),
        },
      });
    }

    if (p.calificacion !== undefined) {
      const carpeta = join(process.env.UPLOADS_DIR || './uploads', 'tickets', ticket.id);
      const archivo = `${randomUUID()}.txt`;
      const contenido = `Registro del error reportado por ${solicitante.nombres} ${solicitante.apellidos}\n\n${p.descripcion}\n`;

      await mkdir(carpeta, { recursive: true });
      await writeFile(join(carpeta, archivo), contenido);
      await prisma.adjunto.create({
        data: {
          ticketId: ticket.id,
          nombreArchivo: 'registro-del-error.txt',
          ruta: join('tickets', ticket.id, archivo),
          tipoMime: 'text/plain',
          tamanoBytes: Buffer.byteLength(contenido),
          subidoPorId: solicitante.id,
          createdAt: momento(0.2),
        },
      });

      await prisma.encuestaTicket.create({
        data: { ticketId: ticket.id, calificacion: p.calificacion, respondidaEn: momento(pasos.length + 1) },
      });

      for (const evento of ['TICKET_CON_EVIDENCIA', 'ENCUESTA_RESPONDIDA']) {
        const r = regla(evento);
        await prisma.movimientoFidelidad.create({
          data: {
            empresaId,
            tipo: 'ACUMULACION',
            puntos: r.puntos,
            reglaId: r.id,
            ticketId: ticket.id,
            descripcion: r.nombre,
            createdAt: momento(pasos.length + 1),
          },
        });
      }
    }
  }

  // Una renovación anticipada del plan completa el saldo de fidelidad
  // necesario para que la empresa pueda probar el canje de una recompensa.
  const renovacion = regla('RENOVACION_ANTICIPADA');
  await prisma.movimientoFidelidad.create({
    data: {
      empresaId,
      tipo: 'ACUMULACION',
      puntos: renovacion.puntos,
      reglaId: renovacion.id,
      descripcion: renovacion.nombre,
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`  ${plantillas.length} tickets de ejemplo creados`);
}

async function main() {
  console.log('Cargando datos de demostración…');

  for (const persona of EQUIPO_INNOVASOFT) {
    await crearUsuario(persona);
    console.log(`  ${persona.perfil.padEnd(32)} ${persona.email}`);
  }

  const asesores = await prisma.asesor.findMany({ include: { usuario: true }, orderBy: { id: 'asc' } });

  for (const datos of EMPRESAS) {
    const empresa = await prisma.empresa.upsert({
      where: { nit: datos.nit },
      update: { activa: true, razonSocial: datos.razonSocial },
      create: {
        nit: datos.nit,
        razonSocial: datos.razonSocial,
        direccion: datos.direccion,
        telefono: datos.telefono,
      },
    });

    console.log(`\n  ${empresa.razonSocial}`);

    for (const persona of datos.usuarios) {
      await crearUsuario({ ...persona, empresaId: empresa.id });
      console.log(`    ${persona.perfil.padEnd(30)} ${persona.email}`);
    }

    const plan = await prisma.plan.findUniqueOrThrow({ where: { clave: datos.plan } });
    const yaTieneBolsa = await prisma.bolsaPuntos.findFirst({
      where: { empresaId: empresa.id, anulada: false, venceEn: { gt: new Date() } },
    });

    if (yaTieneBolsa === null) {
      // El plan se contrató hace 25 días: así los tickets de ejemplo consumen
      // de una bolsa que ya existía y la bolsa queda próxima a vencer, lo que
      // permite ver la alerta del panel.
      const inicioEn = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000);
      const finEn = new Date(inicioEn.getTime() + plan.diasVigencia * 24 * 60 * 60 * 1000);

      const suscripcion = await prisma.suscripcion.create({
        data: { empresaId: empresa.id, planId: plan.id, inicioEn, finEn, precioPagado: plan.precio },
      });

      const bolsa = await prisma.bolsaPuntos.create({
        data: {
          empresaId: empresa.id,
          suscripcionId: suscripcion.id,
          origen: 'PLAN',
          puntosIniciales: plan.puntosIncluidos ?? 0,
          esIlimitada: plan.esIlimitado,
          emitidaEn: inicioEn,
          venceEn: finEn,
        },
      });

      await prisma.movimientoPuntos.create({
        data: {
          empresaId: empresa.id,
          bolsaId: bolsa.id,
          tipo: 'EMISION',
          puntos: plan.puntosIncluidos ?? 0,
          descripcion: `Emisión por contratación del plan ${plan.nombre}`,
          createdAt: inicioEn,
        },
      });

      console.log(`    plan ${plan.nombre} con ${plan.puntosIncluidos} puntos`);
    }
  }

  // Citas de ejemplo en distintos estados, para que las pantallas no se vean
  // vacías al abrirlas por primera vez.
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { nit: EMPRESAS[0].nit } });
  const solicitante = await prisma.usuario.findUniqueOrThrow({ where: { email: 'gerencia@andina.com' } });
  const yaHayCitas = await prisma.cita.count({ where: { empresaId: empresa.id } });

  if (yaHayCitas === 0 && asesores.length > 0) {
    const [presencial, remoto] = await Promise.all([
      prisma.modalidad.findUniqueOrThrow({ where: { clave: 'presencial' }, include: { tarifaPorDefecto: true } }),
      prisma.modalidad.findUniqueOrThrow({ where: { clave: 'remoto' }, include: { tarifaPorDefecto: true } }),
    ]);

    const estados = await prisma.estadoCita.findMany();
    const estado = (clave: string) => estados.find((registro) => registro.clave === clave)!.id;

    const hoy = new Date();
    const anio = hoy.getFullYear();
    const consecutivo = await prisma.cita.count({ where: { createdAt: { gte: new Date(anio, 0, 1) } } });

    const plantillas = [
      { dias: 1, hora: 9, modalidad: presencial, estado: 'confirmada', asesor: 0, direccion: 'Carrera 43A #18-95, piso 4' },
      { dias: 2, hora: 10, modalidad: remoto, estado: 'solicitada', asesor: 1, enlace: 'https://meet.innovasoft.com/andina-1' },
      { dias: 3, hora: 15, modalidad: presencial, estado: 'solicitada', asesor: 0, direccion: 'Carrera 43A #18-95, bodega' },
    ];

    for (const [indice, plantilla] of plantillas.entries()) {
      const asesor = asesores[plantilla.asesor % asesores.length];
      const inicioEn = proximoDia(hoy, plantilla.dias, plantilla.hora);

      await prisma.cita.create({
        data: {
          codigo: `CITA-${anio}-${String(consecutivo + indice + 1).padStart(4, '0')}`,
          empresaId: empresa.id,
          asesorId: asesor.id,
          solicitanteId: solicitante.id,
          modalidadId: plantilla.modalidad.id,
          estadoId: estado(plantilla.estado),
          inicioEn,
          finEn: new Date(inicioEn.getTime() + 60 * 60 * 1000),
          direccion: plantilla.direccion ?? null,
          enlace: plantilla.enlace ?? null,
          tarifaAplicadaId: plantilla.modalidad.tarifaPorDefectoId,
        },
      });
    }

    console.log(`\n  ${plantillas.length} citas de ejemplo creadas`);
  }

  await crearTicketsDeEjemplo(empresa.id, asesores);

  console.log(`\nTodos los usuarios de demostración usan la contraseña: ${CLAVE}`);
  console.log('El administrador de Innovasoft sigue siendo admin@innovasoft.com / Admin123*');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
