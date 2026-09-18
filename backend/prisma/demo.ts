import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from '@node-rs/argon2';

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

async function main() {
  console.log('Cargando datos de demostración…');

  for (const persona of EQUIPO_INNOVASOFT) {
    await crearUsuario(persona);
    console.log(`  ${persona.perfil.padEnd(32)} ${persona.email}`);
  }

  const asesores = await prisma.asesor.findMany({ include: { usuario: true } });

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
      const inicioEn = new Date();
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

  console.log(`\nTodos los usuarios de demostración usan la contraseña: ${CLAVE}`);
  console.log('El administrador de Innovasoft sigue siendo admin@innovasoft.com / Admin123*');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
