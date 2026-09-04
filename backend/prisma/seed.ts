import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from '@node-rs/argon2';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Catálogo de permisos. La clave tiene la forma "modulo.accion" y es lo que
// verifica el guard en cada endpoint. Al vivir en la base de datos, la pantalla
// de administración puede componer perfiles nuevos sin tocar el código.
const PERMISOS: Array<[modulo: string, accion: string, descripcion: string]> = [
  ['empresas', 'ver_todas', 'Ver todas las empresas cliente'],
  ['empresas', 'ver_propia', 'Ver los datos de su propia empresa'],
  ['empresas', 'crear', 'Registrar una empresa cliente'],
  ['empresas', 'editar', 'Modificar los datos de una empresa'],
  ['empresas', 'desactivar', 'Desactivar una empresa cliente'],

  ['usuarios', 'ver', 'Ver el listado de usuarios'],
  ['usuarios', 'crear', 'Crear usuarios'],
  ['usuarios', 'editar', 'Modificar usuarios'],
  ['usuarios', 'desactivar', 'Desactivar usuarios'],
  ['usuarios', 'asignar_perfil', 'Cambiar el perfil de un usuario'],

  ['perfiles', 'ver', 'Ver perfiles y sus permisos'],
  ['perfiles', 'crear', 'Crear perfiles'],
  ['perfiles', 'editar', 'Modificar perfiles'],
  ['perfiles', 'eliminar', 'Eliminar perfiles'],
  ['perfiles', 'asignar_permisos', 'Conceder o revocar permisos de un perfil'],

  ['tickets', 'ver_todos', 'Ver los tickets de todas las empresas'],
  ['tickets', 'ver_empresa', 'Ver los tickets de su empresa'],
  ['tickets', 'ver_propios', 'Ver únicamente los tickets que registró'],
  ['tickets', 'crear', 'Registrar tickets'],
  ['tickets', 'asignar', 'Asignar un asesor a un ticket'],
  ['tickets', 'cambiar_estado', 'Mover el ticket entre estados'],
  ['tickets', 'cerrar', 'Cerrar un ticket, lo que descuenta puntos'],
  ['tickets', 'reabrir', 'Reabrir un ticket cerrado o resuelto'],
  ['tickets', 'comentar', 'Agregar comentarios al ticket'],
  ['tickets', 'subir_evidencias', 'Adjuntar archivos al ticket'],
  ['tickets', 'registrar_actividad', 'Registrar horas y actividades'],
  ['tickets', 'exportar_pdf', 'Descargar el reporte del ticket'],
  ['tickets', 'eliminar', 'Eliminar tickets'],

  ['puntos', 'ver_saldo_empresa', 'Consultar el saldo de su empresa'],
  ['puntos', 'ver_saldo_todos', 'Consultar el saldo de cualquier empresa'],
  ['puntos', 'contratar_plan', 'Contratar un plan'],
  ['puntos', 'renovar_plan', 'Renovar un plan vigente'],
  ['puntos', 'ver_kardex', 'Consultar el historial de movimientos'],
  ['puntos', 'exportar_kardex', 'Descargar el historial de movimientos'],
  ['puntos', 'ajustar_saldo', 'Registrar ajustes manuales de puntos'],
  ['puntos', 'administrar_planes', 'Crear y modificar planes'],
  ['puntos', 'administrar_tarifas', 'Crear y modificar el tarifario'],
  ['puntos', 'cerrar_periodo', 'Cerrar el periodo de facturación'],

  ['citas', 'ver_todas', 'Ver la agenda completa'],
  ['citas', 'ver_empresa', 'Ver las citas de su empresa'],
  ['citas', 'ver_propias', 'Ver únicamente sus propias citas'],
  ['citas', 'crear', 'Solicitar una cita'],
  ['citas', 'confirmar', 'Confirmar una cita solicitada'],
  ['citas', 'reprogramar', 'Cambiar la fecha de una cita'],
  ['citas', 'cancelar', 'Cancelar una cita'],
  ['citas', 'marcar_realizada', 'Marcar la cita como realizada, lo que descuenta puntos'],
  ['citas', 'administrar_disponibilidad', 'Definir la disponibilidad de los asesores'],

  ['fidelizacion', 'ver_saldo', 'Consultar los puntos de fidelidad'],
  ['fidelizacion', 'ver_historial', 'Consultar acumulaciones y canjes'],
  ['fidelizacion', 'canjear', 'Canjear puntos por una recompensa'],
  ['fidelizacion', 'administrar_recompensas', 'Crear y modificar recompensas'],
  ['fidelizacion', 'administrar_reglas', 'Crear y modificar reglas de acumulación'],

  ['auditoria', 'ver', 'Consultar el registro de auditoría'],
];

// Un perfil se define por los permisos que agrupa. Un patrón "modulo.*" concede
// todas las acciones del módulo.
const PERFILES: Array<{
  nombre: string;
  descripcion: string;
  ambito: 'INNOVASOFT' | 'EMPRESA';
  permisos: string[];
}> = [
  {
    nombre: 'Administrador Innovasoft',
    descripcion: 'Control total de la plataforma',
    ambito: 'INNOVASOFT',
    permisos: ['*'],
  },
  {
    nombre: 'Coordinador de soporte',
    descripcion: 'Coordina la operación: asigna tickets y programa visitas',
    ambito: 'INNOVASOFT',
    permisos: [
      'empresas.ver_todas',
      'usuarios.ver',
      'tickets.ver_todos', 'tickets.asignar', 'tickets.cambiar_estado', 'tickets.cerrar',
      'tickets.reabrir', 'tickets.comentar', 'tickets.exportar_pdf',
      'puntos.ver_saldo_todos', 'puntos.ver_kardex',
      'citas.*',
      'auditoria.ver',
    ],
  },
  {
    nombre: 'Asesor',
    descripcion: 'Atiende los tickets y las visitas que le asignan',
    ambito: 'INNOVASOFT',
    permisos: [
      'tickets.ver_propios', 'tickets.cambiar_estado', 'tickets.cerrar',
      'tickets.comentar', 'tickets.subir_evidencias', 'tickets.registrar_actividad',
      'tickets.exportar_pdf',
      'citas.ver_propias', 'citas.reprogramar', 'citas.marcar_realizada',
      'puntos.ver_saldo_todos',
    ],
  },
  {
    nombre: 'Administrador de empresa cliente',
    descripcion: 'Administra los usuarios, el plan y los consumos de su empresa',
    ambito: 'EMPRESA',
    permisos: [
      'empresas.ver_propia', 'empresas.editar',
      'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.desactivar',
      'usuarios.asignar_perfil',
      'tickets.ver_empresa', 'tickets.crear', 'tickets.comentar',
      'tickets.subir_evidencias', 'tickets.exportar_pdf',
      'puntos.ver_saldo_empresa', 'puntos.contratar_plan', 'puntos.renovar_plan',
      'puntos.ver_kardex', 'puntos.exportar_kardex',
      'citas.ver_empresa', 'citas.crear', 'citas.reprogramar', 'citas.cancelar',
      'fidelizacion.ver_saldo', 'fidelizacion.ver_historial', 'fidelizacion.canjear',
    ],
  },
  {
    nombre: 'Usuario de empresa cliente',
    descripcion: 'Registra sus propias solicitudes de soporte',
    ambito: 'EMPRESA',
    permisos: [
      'empresas.ver_propia',
      'tickets.ver_propios', 'tickets.crear', 'tickets.comentar',
      'tickets.subir_evidencias', 'tickets.exportar_pdf',
      'puntos.ver_saldo_empresa',
      'citas.ver_propias', 'citas.crear',
      'fidelizacion.ver_saldo',
    ],
  },
];

const PLANES = [
  { clave: 'esencial', nombre: 'Esencial', descripcion: 'Para empresas con soporte ocasional', tipo: 'SUSCRIPCION' as const, puntosIncluidos: 30, esIlimitado: false, diasVigencia: 30, precio: '350000' },
  { clave: 'profesional', nombre: 'Profesional', descripcion: 'Para una operación con soporte recurrente', tipo: 'SUSCRIPCION' as const, puntosIncluidos: 100, esIlimitado: false, diasVigencia: 30, precio: '1000000' },
  { clave: 'corporativo', nombre: 'Corporativo', descripcion: 'Para alto volumen o varias sedes', tipo: 'SUSCRIPCION' as const, puntosIncluidos: 250, esIlimitado: false, diasVigencia: 30, precio: '2200000' },
  { clave: 'ilimitado_mensual', nombre: 'Ilimitado mensual', descripcion: 'Servicio administrado sin límite de puntos', tipo: 'SUSCRIPCION' as const, puntosIncluidos: null, esIlimitado: true, diasVigencia: 30, precio: '4500000' },
  { clave: 'ilimitado_anual', nombre: 'Ilimitado anual', descripcion: 'Servicio administrado sin límite, con tarifa anual', tipo: 'SUSCRIPCION' as const, puntosIncluidos: null, esIlimitado: true, diasVigencia: 365, precio: '45000000' },
  { clave: 'recarga_10', nombre: 'Recarga de 10 puntos', descripcion: 'Excedente sobre el plan vigente', tipo: 'RECARGA' as const, puntosIncluidos: 10, esIlimitado: false, diasVigencia: 30, precio: '150000' },
  { clave: 'recarga_25', nombre: 'Recarga de 25 puntos', descripcion: 'Excedente sobre el plan vigente', tipo: 'RECARGA' as const, puntosIncluidos: 25, esIlimitado: false, diasVigencia: 30, precio: '350000' },
  { clave: 'recarga_50', nombre: 'Recarga de 50 puntos', descripcion: 'Excedente sobre el plan vigente', tipo: 'RECARGA' as const, puntosIncluidos: 50, esIlimitado: false, diasVigencia: 30, precio: '650000' },
  { clave: 'bono_extraordinario', nombre: 'Bono extraordinario', descripcion: 'Cubre picos puntuales de trabajo durante una semana', tipo: 'BONO' as const, puntosIncluidos: 15, esIlimitado: false, diasVigencia: 7, precio: '250000' },
];

const TARIFAS = [
  { clave: 'soporte_remoto_basico', nombre: 'Soporte remoto básico (hasta 1 hora)', puntos: 1 },
  { clave: 'soporte_remoto_extendido', nombre: 'Soporte remoto extendido (más de 1 hora)', puntos: 2 },
  { clave: 'visita_ciudad', nombre: 'Visita técnica presencial dentro de la ciudad', puntos: 5 },
  { clave: 'visita_fuera_ciudad', nombre: 'Visita técnica presencial fuera de la ciudad', puntos: 8 },
  { clave: 'implementacion_programada', nombre: 'Implementación o configuración programada', puntos: 10 },
];

const CATEGORIAS = [
  { clave: 'falla_aplicacion', nombre: 'Falla en la aplicación', descripcion: 'El software no responde como se espera' },
  { clave: 'error_datos', nombre: 'Error en los datos', descripcion: 'Información incorrecta o inconsistente' },
  { clave: 'configuracion', nombre: 'Configuración', descripcion: 'Ajustes, parámetros y puesta a punto' },
  { clave: 'capacitacion', nombre: 'Capacitación', descripcion: 'Acompañamiento en el uso de la herramienta' },
  { clave: 'infraestructura', nombre: 'Infraestructura', descripcion: 'Servidores, red y equipos' },
  { clave: 'solicitud_cambio', nombre: 'Solicitud de cambio', descripcion: 'Ajuste o funcionalidad nueva' },
];

const ESTADOS_TICKET = [
  { clave: 'abierto', nombre: 'Abierto', orden: 1, esFinal: false },
  { clave: 'asignado', nombre: 'Asignado', orden: 2, esFinal: false },
  { clave: 'en_atencion', nombre: 'En atención', orden: 3, esFinal: false },
  { clave: 'en_espera_cliente', nombre: 'En espera del cliente', orden: 4, esFinal: false },
  { clave: 'resuelto', nombre: 'Resuelto', orden: 5, esFinal: false },
  { clave: 'cerrado', nombre: 'Cerrado', orden: 6, esFinal: true },
  { clave: 'reabierto', nombre: 'Reabierto', orden: 7, esFinal: false },
];

// Cada fila declara un salto permitido y el permiso que lo autoriza. Un salto que
// no esté aquí es imposible, sin importar quién lo intente.
const TRANSICIONES: Array<[desde: string, hasta: string, permiso: string]> = [
  ['abierto', 'asignado', 'tickets.asignar'],
  ['abierto', 'en_atencion', 'tickets.cambiar_estado'],
  ['asignado', 'abierto', 'tickets.asignar'],
  ['asignado', 'en_atencion', 'tickets.cambiar_estado'],
  ['en_atencion', 'en_espera_cliente', 'tickets.cambiar_estado'],
  ['en_espera_cliente', 'en_atencion', 'tickets.cambiar_estado'],
  ['en_atencion', 'resuelto', 'tickets.cambiar_estado'],
  ['resuelto', 'cerrado', 'tickets.cerrar'],
  ['resuelto', 'reabierto', 'tickets.reabrir'],
  ['cerrado', 'reabierto', 'tickets.reabrir'],
  ['reabierto', 'en_atencion', 'tickets.cambiar_estado'],
];

const ESTADOS_CITA = [
  { clave: 'solicitada', nombre: 'Solicitada', orden: 1, esFinal: false },
  { clave: 'confirmada', nombre: 'Confirmada', orden: 2, esFinal: false },
  { clave: 'reprogramada', nombre: 'Reprogramada', orden: 3, esFinal: false },
  { clave: 'en_curso', nombre: 'En curso', orden: 4, esFinal: false },
  { clave: 'realizada', nombre: 'Realizada', orden: 5, esFinal: true },
  { clave: 'cancelada', nombre: 'Cancelada', orden: 6, esFinal: true },
  { clave: 'no_asistida', nombre: 'No asistida', orden: 7, esFinal: true },
];

const REGLAS_FIDELIZACION = [
  { clave: 'ticket_con_evidencia', nombre: 'Ticket registrado con evidencia completa', evento: 'TICKET_CON_EVIDENCIA' as const, puntos: 5 },
  { clave: 'encuesta_respondida', nombre: 'Encuesta de satisfacción respondida al cierre', evento: 'ENCUESTA_RESPONDIDA' as const, puntos: 10 },
  { clave: 'renovacion_anticipada', nombre: 'Renovación del plan antes del vencimiento', evento: 'RENOVACION_ANTICIPADA' as const, puntos: 50 },
];

const RECOMPENSAS = [
  { clave: 'descuento_5', nombre: '5 % de descuento en la próxima renovación', descripcion: 'Se aplica automáticamente al renovar el plan', costoPuntos: 100, tipo: 'DESCUENTO_RENOVACION' as const, valor: '5', diasVigenciaBeneficio: 90 },
  { clave: 'visita_sin_consumo', nombre: 'Visita presencial sin consumo de puntos', descripcion: 'Una visita técnica en la ciudad que no descuenta puntos del plan', costoPuntos: 250, tipo: 'SERVICIO_SIN_CONSUMO' as const, valor: '1', diasVigenciaBeneficio: 60 },
  { clave: 'descuento_10', nombre: '10 % de descuento en la próxima renovación', descripcion: 'Se aplica automáticamente al renovar el plan', costoPuntos: 400, tipo: 'DESCUENTO_RENOVACION' as const, valor: '10', diasVigenciaBeneficio: 90 },
  { clave: 'recarga_10_puntos', nombre: 'Recarga de 10 puntos de servicio', descripcion: 'Emite una bolsa promocional con 30 días de vigencia', costoPuntos: 500, tipo: 'RECARGA_PUNTOS' as const, valor: '10', diasVigenciaBeneficio: 30 },
];

const MODALIDADES = [
  { clave: 'presencial', nombre: 'Presencial', tarifaPorDefecto: 'visita_ciudad' },
  { clave: 'remoto', nombre: 'Remoto', tarifaPorDefecto: 'soporte_remoto_basico' },
];

async function main() {
  const permisos = new Map<string, string>();
  for (const [modulo, accion, descripcion] of PERMISOS) {
    const clave = `${modulo}.${accion}`;
    const registro = await prisma.permiso.upsert({
      where: { clave },
      update: { descripcion },
      create: { clave, modulo, accion, descripcion },
    });
    permisos.set(clave, registro.id);
  }

  const perfiles = new Map<string, string>();
  for (const definicion of PERFILES) {
    const perfil = await prisma.perfil.upsert({
      where: { nombre: definicion.nombre },
      update: { descripcion: definicion.descripcion },
      create: {
        nombre: definicion.nombre,
        descripcion: definicion.descripcion,
        ambito: definicion.ambito,
        esSistema: true,
      },
    });
    perfiles.set(definicion.nombre, perfil.id);

    const claves = definicion.permisos.includes('*')
      ? [...permisos.keys()]
      : definicion.permisos.flatMap((patron) =>
          patron.endsWith('.*')
            ? [...permisos.keys()].filter((c) => c.startsWith(patron.slice(0, -1)))
            : [patron],
        );

    await prisma.perfilPermiso.deleteMany({ where: { perfilId: perfil.id } });
    await prisma.perfilPermiso.createMany({
      data: claves.map((clave) => ({ perfilId: perfil.id, permisoId: permisos.get(clave)! })),
    });
  }

  for (const plan of PLANES) {
    await prisma.plan.upsert({ where: { clave: plan.clave }, update: plan, create: plan });
  }

  const tarifas = new Map<string, string>();
  for (const tarifa of TARIFAS) {
    const registro = await prisma.tarifaServicio.upsert({
      where: { clave: tarifa.clave },
      update: tarifa,
      create: tarifa,
    });
    tarifas.set(tarifa.clave, registro.id);
  }

  for (const categoria of CATEGORIAS) {
    await prisma.categoriaServicio.upsert({
      where: { clave: categoria.clave },
      update: categoria,
      create: categoria,
    });
  }

  const estadosTicket = new Map<string, string>();
  for (const estado of ESTADOS_TICKET) {
    const registro = await prisma.estadoTicket.upsert({
      where: { clave: estado.clave },
      update: estado,
      create: estado,
    });
    estadosTicket.set(estado.clave, registro.id);
  }

  for (const [desde, hasta, permisoRequerido] of TRANSICIONES) {
    const desdeEstadoId = estadosTicket.get(desde)!;
    const hastaEstadoId = estadosTicket.get(hasta)!;
    await prisma.transicionTicket.upsert({
      where: { desdeEstadoId_hastaEstadoId: { desdeEstadoId, hastaEstadoId } },
      update: { permisoRequerido },
      create: { desdeEstadoId, hastaEstadoId, permisoRequerido },
    });
  }

  for (const estado of ESTADOS_CITA) {
    await prisma.estadoCita.upsert({
      where: { clave: estado.clave },
      update: estado,
      create: estado,
    });
  }

  for (const modalidad of MODALIDADES) {
    const datos = {
      clave: modalidad.clave,
      nombre: modalidad.nombre,
      tarifaPorDefectoId: tarifas.get(modalidad.tarifaPorDefecto)!,
    };
    await prisma.modalidad.upsert({ where: { clave: modalidad.clave }, update: datos, create: datos });
  }

  for (const regla of REGLAS_FIDELIZACION) {
    await prisma.reglaFidelizacion.upsert({ where: { clave: regla.clave }, update: regla, create: regla });
  }

  for (const recompensa of RECOMPENSAS) {
    await prisma.recompensa.upsert({
      where: { clave: recompensa.clave },
      update: recompensa,
      create: recompensa,
    });
  }

  const emailAdministrador = 'admin@innovasoft.com';
  await prisma.usuario.upsert({
    where: { email: emailAdministrador },
    update: {},
    create: {
      email: emailAdministrador,
      nombres: 'Administrador',
      apellidos: 'Innovasoft',
      passwordHash: await hash('Admin123*'),
      emailVerificado: true,
      perfilId: perfiles.get('Administrador Innovasoft')!,
    },
  });

  console.log(
    `Datos iniciales cargados: ${permisos.size} permisos, ${PERFILES.length} perfiles, ` +
      `${PLANES.length} planes, ${TARIFAS.length} tarifas, ${ESTADOS_TICKET.length} estados de ticket, ` +
      `${TRANSICIONES.length} transiciones, ${RECOMPENSAS.length} recompensas.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
