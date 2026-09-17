export type Alerta = {
  tipo: 'SALDO_BAJO' | 'SALDO_EN_DESCUBIERTO' | 'BOLSA_POR_VENCER';
  mensaje: string;
};

export type BolsaParaAlertar = {
  venceEn: Date;
  saldo: number;
  esIlimitada: boolean;
};

export type UmbralesAlerta = {
  saldoBajo: number;
  diasParaVencer: number;
  topeDescubierto: number;
};

const DIA_EN_MILISEGUNDOS = 24 * 60 * 60 * 1000;

export function diasHasta(fecha: Date, desde: Date): number {
  return Math.ceil((fecha.getTime() - desde.getTime()) / DIA_EN_MILISEGUNDOS);
}

// Las alertas se calculan al consultar el saldo, no se almacenan: guardarlas
// obligaría a mantenerlas sincronizadas con cada consumo y con el paso del
// tiempo, y cualquier fallo dejaría avisos que ya no corresponden.
export function calcularAlertas(
  saldo: number,
  bolsas: BolsaParaAlertar[],
  umbrales: UmbralesAlerta,
  ahora: Date,
): Alerta[] {
  const alertas: Alerta[] = [];

  if (saldo < 0) {
    const disponible = umbrales.topeDescubierto + saldo;

    alertas.push({
      tipo: 'SALDO_EN_DESCUBIERTO',
      mensaje:
        `El saldo está en ${saldo} puntos. Quedan ${disponible} puntos de margen ` +
        `antes de que se bloqueen los consumos; lo consumido de más se descuenta ` +
        `del próximo periodo.`,
    });
  } else if (saldo <= umbrales.saldoBajo) {
    alertas.push({
      tipo: 'SALDO_BAJO',
      mensaje: `Quedan ${saldo} puntos disponibles. Conviene renovar el plan o contratar una recarga.`,
    });
  }

  for (const bolsa of bolsas) {
    if (bolsa.esIlimitada || bolsa.saldo <= 0) {
      continue;
    }

    const dias = diasHasta(bolsa.venceEn, ahora);

    if (dias >= 0 && dias <= umbrales.diasParaVencer) {
      alertas.push({
        tipo: 'BOLSA_POR_VENCER',
        mensaje:
          `Una bolsa con ${bolsa.saldo} puntos vence en ${dias} ` +
          `${dias === 1 ? 'día' : 'días'}.`,
      });
    }
  }

  return alertas;
}
