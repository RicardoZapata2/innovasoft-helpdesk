import PDFDocument from 'pdfkit';

const AZUL = '#263f8f';
const GRIS = '#64748b';
const LINEA = '#cbd5e1';
const MARGEN = 50;

export type Documento = InstanceType<typeof PDFDocument>;

const FECHA = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

export const fechaPdf = (valor: Date) => FECHA.format(valor);

// Todos los reportes comparten encabezado y pie: así se reconocen como
// documentos de la misma empresa sin importar desde qué módulo se generen.
export function nuevoDocumento(titulo: string, subtitulo: string): Documento {
  const doc = new PDFDocument({ size: 'LETTER', margin: MARGEN, bufferPages: true });

  doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(20).text('Innovasoft', MARGEN, MARGEN);
  doc.fillColor(GRIS).font('Helvetica').fontSize(9).text('Soporte técnico prepago por puntos');
  doc.moveDown(1);
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(15).text(titulo);
  doc.fillColor(GRIS).font('Helvetica').fontSize(10).text(subtitulo);
  separador(doc);

  return doc;
}

export function separador(doc: Documento): void {
  doc.moveDown(0.6);
  doc
    .strokeColor(LINEA)
    .lineWidth(1)
    .moveTo(MARGEN, doc.y)
    .lineTo(doc.page.width - MARGEN, doc.y)
    .stroke();
  doc.moveDown(0.6);
}

export function seccion(doc: Documento, titulo: string): void {
  // Un título sin al menos un par de líneas debajo queda huérfano al pie de la
  // página; en ese caso la sección empieza en la siguiente.
  if (doc.y > doc.page.height - MARGEN - 90) {
    doc.addPage();
  }

  doc.moveDown(0.8);
  doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(12).text(titulo, MARGEN);
  doc.moveDown(0.3);
}

export function datos(doc: Documento, filas: Array<[string, string]>): void {
  for (const [etiqueta, valor] of filas) {
    doc
      .fillColor(GRIS)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(`${etiqueta}: `, MARGEN, doc.y, { continued: true })
      .fillColor('#0f172a')
      .font('Helvetica')
      .text(valor);
  }
}

export function parrafo(doc: Documento, texto: string): void {
  doc.fillColor('#0f172a').font('Helvetica').fontSize(10).text(texto, MARGEN, doc.y, { align: 'justify' });
}

// Tabla sencilla de anchos fijos. Si la siguiente fila no cabe en la página,
// se abre otra y se repite la cabecera para que la tabla se siga leyendo.
export function tabla(doc: Documento, cabeceras: string[], anchos: number[], filas: string[][]): void {
  const dibujarCabecera = () => {
    const y = doc.y;
    let x = MARGEN;
    doc.rect(MARGEN, y - 2, anchos.reduce((a, b) => a + b, 0), 16).fill('#eef4ff');
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(8);
    cabeceras.forEach((cabecera, i) => {
      doc.text(cabecera, x + 3, y + 2, { width: anchos[i] - 6 });
      x += anchos[i];
    });
    doc.y = y + 18;
  };

  dibujarCabecera();
  doc.font('Helvetica').fontSize(8).fillColor('#0f172a');

  for (const fila of filas) {
    const alto = Math.max(...fila.map((celda, i) => doc.heightOfString(celda, { width: anchos[i] - 6 }))) + 6;

    if (doc.y + alto > doc.page.height - MARGEN - 20) {
      doc.addPage();
      dibujarCabecera();
      doc.font('Helvetica').fontSize(8).fillColor('#0f172a');
    }

    const y = doc.y;
    let x = MARGEN;
    fila.forEach((celda, i) => {
      doc.text(celda, x + 3, y + 3, { width: anchos[i] - 6 });
      x += anchos[i];
    });
    doc.y = y + alto;
    doc
      .strokeColor(LINEA)
      .lineWidth(0.5)
      .moveTo(MARGEN, doc.y)
      .lineTo(MARGEN + anchos.reduce((a, b) => a + b, 0), doc.y)
      .stroke();
  }

  doc.x = MARGEN;
}

export function terminar(doc: Documento): Promise<Buffer> {
  const paginas = doc.bufferedPageRange();

  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(paginas.start + i);
    // El pie se escribe dentro del margen inferior; sin bajarlo a cero, PDFKit
    // interpreta que el texto no cabe y abre una página en blanco.
    doc.page.margins.bottom = 0;
    doc
      .fillColor(GRIS)
      .font('Helvetica')
      .fontSize(8)
      .text(
        `Generado el ${fechaPdf(new Date())} · Página ${i + 1} de ${paginas.count}`,
        MARGEN,
        doc.page.height - MARGEN + 10,
        { align: 'center', width: doc.page.width - MARGEN * 2, lineBreak: false },
      );
  }

  return new Promise((resolver, rechazar) => {
    const partes: Buffer[] = [];
    doc.on('data', (parte: Buffer) => partes.push(parte));
    doc.on('end', () => resolver(Buffer.concat(partes)));
    doc.on('error', rechazar);
    doc.end();
  });
}
