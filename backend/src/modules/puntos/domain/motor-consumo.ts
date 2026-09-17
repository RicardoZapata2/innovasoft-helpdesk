export type BolsaVigente = {
  id: string;
  venceEn: Date;
  esIlimitada: boolean;
  saldo: number;
};

export type AplicacionEnBolsa = {
  bolsaId: string;
  puntos: number;
};

export type PlanDeConsumo = {
  aplicaciones: AplicacionEnBolsa[];
  descubierto: number;
  cubiertoPorPlanIlimitado: boolean;
};

// Reparte el costo de un servicio entre las bolsas vigentes de una empresa.
//
// La función no toca la base de datos ni sabe que existe: recibe el estado y
// devuelve el reparto. Eso permite probar las reglas del negocio —que son la
// parte delicada— sin levantar nada.
export function planificarConsumo(bolsas: BolsaVigente[], costo: number): PlanDeConsumo {
  if (costo <= 0) {
    throw new Error('El costo de un consumo debe ser mayor que cero');
  }

  // Un plan ilimitado cubre la operación completa y deja intactas las demás
  // bolsas. El cliente que paga por no preocuparse no debería ver bajar sus
  // recargas mientras su plan esté vigente.
  const ilimitada = bolsas.find((bolsa) => bolsa.esIlimitada);

  if (ilimitada !== undefined) {
    return {
      aplicaciones: [{ bolsaId: ilimitada.id, puntos: costo }],
      descubierto: 0,
      cubiertoPorPlanIlimitado: true,
    };
  }

  // Se consume primero lo que vence antes, para que al cliente se le pierdan
  // los menos puntos posibles. No es FIFO por fecha de compra: una bolsa
  // comprada después puede tener una vigencia más corta.
  const porVencimiento = bolsas
    .filter((bolsa) => bolsa.saldo > 0)
    .sort((a, b) => a.venceEn.getTime() - b.venceEn.getTime());

  const aplicaciones: AplicacionEnBolsa[] = [];
  let pendiente = costo;

  for (const bolsa of porVencimiento) {
    if (pendiente === 0) {
      break;
    }

    const tomado = Math.min(bolsa.saldo, pendiente);
    aplicaciones.push({ bolsaId: bolsa.id, puntos: tomado });
    pendiente -= tomado;
  }

  return { aplicaciones, descubierto: pendiente, cubiertoPorPlanIlimitado: false };
}

// El servicio ya se prestó cuando se llega aquí, así que quedar en negativo es
// aceptable hasta cierto punto. Pasado el tope, el sistema deja de aceptar
// consumos nuevos y obliga a renovar el plan.
export function excedeElDescubierto(saldoActual: number, costo: number, tope: number): boolean {
  return saldoActual - costo < -tope;
}
