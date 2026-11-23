// Excel combinado de Recurrentes (v13, diseño de Ivo 2026-11-23):
// un solo archivo con toda la información, una hoja "Programación":
// (1) Programación del Gasto, (2) Programación de Ingresos,
// (3) Resumen con fórmulas, (4) PROGRAMACIÓN MENSUAL DE GASTO
// (estática, precios a octubre 2026 de la captura de Ivo).
// Lo genera el botón Exportar Excel de cualquiera de las dos pestañas
// (Pagos / Cobros) pidiendo AMBOS reportes del mes.
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';

export interface FilaRecurrenteExport {
  concepto: string;
  beneficiario: string;
  fiscal: number;
  no_fiscal: number;
  fecha_pago: string | null;
  pagado: boolean;
  origen?: string;
  movimiento_id?: number;
  incluido?: boolean;
  facturas?: Array<{ folio_fiscal?: string | null }>;
}

// Extrae las filas de una respuesta de reporte (mismo fallback que cargarReporte).
export function extraerFilas(res: any): FilaRecurrenteExport[] {
  const r: any = res || {};
  return r.filas || r.reporte || r.rows || (Array.isArray(r) ? r : []);
}

// Programación (sección 3): recurrentes + extras incluidas (fila.incluido;
// sin el campo, la extra va incluida como antes). El front NO reordena.
export function filtrarProgramacion(filas: FilaRecurrenteExport[]): FilaRecurrenteExport[] {
  return (filas || []).filter(f => {
    if (f.origen === 'recurrente') return true;
    if (f.movimiento_id == null) return true;
    return f.incluido !== false;
  });
}

const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const AZUL = '2B5D8A';
const AMARILLO = 'FFFF00';
const ROSA = 'FCE4EC';
const GRIS_TOTAL = 'F2F6FA';

const r2 = (n: any) => Math.round((Number(n) || 0) * 100) / 100;
const v = (n: any) => (Number(n) > 0 ? r2(n) : '');

// Fecha real de Excel (mediodía local para que ningún huso horario la corra
// de día); null cuando no hay fecha ("Por definir").
function fechaExcel(valor: string | null): Date | null {
  if (!valor || valor === 'Por definir') return null;
  const soloFecha = valor.toString().split('T')[0].split(' ')[0];
  const partes = soloFecha.split('-');
  if (partes.length !== 3) return null;
  const [y, m, d] = partes.map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12);
}

// FOLIO: los folio_fiscal de las facturas ligadas al cobro, unidos con " y "
// (ej. "F87 y F89"); vacío si no tiene facturas ligadas.
function folioDe(f: FilaRecurrenteExport): string {
  const folios = (f.facturas || [])
    .map(x => (x.folio_fiscal || '').toString().trim())
    .filter(Boolean);
  return folios.join(' y ');
}

// Bloque 4 ESTÁTICO: valores tal cual de la captura de Ivo (precios a
// octubre 2026); NO se calculan del sistema. Los totales se suman aquí
// para no escribir un número fijo distinto de la suma de las filas.
const MENSUAL: Array<[string, number, number]> = [
  ['Nóminas', 30530.20, 36000.00],
  ['Renta oficinas 17, 18 y 19', 27515.48, 5680.00],
  ['SAT', 20000.00, 0],
  ['IMSS', 15000.00, 0],
  ['ISRTP 3%', 1054.00, 0],
  ['TOTO - Excavadora 323GX CAT', 213029.16, 0],
  ['Vibrocompactador SANY', 82232.03, 0],
  ['Excavadora SANY', 104456.90, 0],
  ['JITOMATA - Excavadora 320GX CAT', 159384.00, 0],
  ['Maquinaria diversa', 273600.00, 360000.00],
];

export function exportarExcelCombinado(
  filasGasto: FilaRecurrenteExport[],
  filasIngreso: FilaRecurrenteExport[],
  mesAnioTitulo: string
): void {
  const N_COLS = 14; // A..N
  const hoy = new Date();
  const tituloFecha = `Al ${hoy.getDate()} de ${MESES_ES[hoy.getMonth()]} de ${hoy.getFullYear()}`;
  const tituloSaldos = `Saldos al ${hoy.getDate()} de ${MESES_ES[hoy.getMonth()]}:`;

  // ---- Sumas para el Resumen (calculadas del sistema) ----
  const suma = (filas: FilaRecurrenteExport[], pred: (f: FilaRecurrenteExport) => boolean) =>
    filas.filter(pred).reduce(
      (t, f) => ({ fiscal: t.fiscal + (Number(f.fiscal) || 0), no_fiscal: t.no_fiscal + (Number(f.no_fiscal) || 0) }),
      { fiscal: 0, no_fiscal: 0 }
    );
  const recibidos = suma(filasIngreso, f => !!f.pagado);
  const realizados = suma(filasGasto, f => !!f.pagado);
  const porCobrar = suma(filasIngreso, f => !f.pagado);
  const porPagar = suma(filasGasto, f => !f.pagado);
  const totalGasto = suma(filasGasto, () => true);
  const totalIngreso = suma(filasIngreso, () => true);
  // Valor en caché de la fórmula de Saldo proyectado: los saldos manuales
  // parten en blanco (= 0), así que el archivo abre con el proyectado
  // calculado y se recalcula solo al capturar Banorte / GBM / Caja chica.
  const saldoProyectadoCache = r2(
    (porCobrar.fiscal + porCobrar.no_fiscal) - (porPagar.fiscal + porPagar.no_fiscal)
  );
  const totalMensual = MENSUAL.reduce(
    (t, [, a, b]) => ({ fiscal: t.fiscal + a, no_fiscal: t.no_fiscal + b }),
    { fiscal: 0, no_fiscal: 0 }
  );

  // ---- Posición de los bloques (filas 1-based) ----
  // Gasto: título 1, encabezado 2, datos 3.., total 3+nG.
  // Ingresos: 2 filas en blanco después del total del gasto.
  const nG = filasGasto.length;
  const nI = filasIngreso.length;
  const totalGastoRow = 3 + nG;
  const tituloIngresosRow = totalGastoRow + 3;
  const headerIngresosRow = tituloIngresosRow + 1;
  const totalIngresosRow = headerIngresosRow + 1 + nI;
  // Resumen (H:J, fijo): 1 título, 2 fecha, 3 encabezado, 4-9 filas,
  // 11 "Saldos al...", 12-14 manuales, 15-17 calculadas.
  // Mensual (L:N, fijo): 1 título, 2 encabezado, 3-12 datos, 13 total, 14 nota.
  const nRows = Math.max(totalIngresosRow, 17, 14);

  const aoa: any[][] = Array.from({ length: nRows }, () => new Array(N_COLS).fill(''));
  const set = (r1: number, c0: number, val: any) => { aoa[r1 - 1][c0] = val; };

  // ===== Bloque 1: Programación del Gasto (A:F) =====
  set(1, 0, 'Programación del Gasto');
  ['CONCEPTO', 'BENEFICIARIO', 'FISCAL', 'N/FISCAL', 'FECHA DE PAGO', 'PAGADO']
    .forEach((h, c) => set(2, c, h));
  filasGasto.forEach((f, i) => {
    const r = 3 + i;
    const fecha = fechaExcel(f.fecha_pago);
    set(r, 0, f.concepto || '');
    set(r, 1, f.beneficiario || '');
    set(r, 2, v(f.fiscal));
    set(r, 3, v(f.no_fiscal));
    set(r, 4, fecha ?? 'Por definir');
    set(r, 5, f.pagado ? '☑' : '☐');
  });
  set(totalGastoRow, 0, 'TOTAL');
  set(totalGastoRow, 2, r2(totalGasto.fiscal));
  set(totalGastoRow, 3, r2(totalGasto.no_fiscal));

  // ===== Bloque 2: Programación de Ingresos (A:F) =====
  set(tituloIngresosRow, 0, 'Programación de Ingresos');
  ['CONCEPTO', 'BENEFICIARIO', 'FISCAL', 'N/FISCAL', 'FOLIO', 'COBRADO']
    .forEach((h, c) => set(headerIngresosRow, c, h));
  filasIngreso.forEach((f, i) => {
    const r = headerIngresosRow + 1 + i;
    set(r, 0, f.concepto || '');
    set(r, 1, f.beneficiario || '');
    set(r, 2, v(f.fiscal));
    set(r, 3, v(f.no_fiscal));
    set(r, 4, folioDe(f));
    set(r, 5, f.pagado ? '☑' : '☐');
  });
  set(totalIngresosRow, 0, 'TOTAL');
  set(totalIngresosRow, 2, r2(totalIngreso.fiscal));
  set(totalIngresosRow, 3, r2(totalIngreso.no_fiscal));

  // ===== Bloque 3: Resumen (H:J) =====
  // Filas fijas 1-17; las fórmulas referencian las celdas de este mismo
  // bloque (las manuales I12:I14), no valores fijos.
  set(1, 7, 'Resumen');
  set(2, 7, tituloFecha);
  set(3, 7, 'CONCEPTO');
  set(3, 8, 'FISCAL');
  set(3, 9, 'N/FISCAL');
  set(4, 7, 'Pagos recibidos');
  set(4, 8, v(recibidos.fiscal));
  set(4, 9, v(recibidos.no_fiscal));
  set(5, 7, 'Pagos realizados');
  set(5, 8, v(realizados.fiscal));
  set(5, 9, v(realizados.no_fiscal));
  set(6, 7, 'Saldos actuales'); // fórmula -> I15 (Banorte + GBM)
  set(7, 7, '(+) Por cobrar');
  set(7, 8, v(porCobrar.fiscal));
  set(7, 9, v(porCobrar.no_fiscal));
  set(8, 7, '(-) Por pagar');
  set(8, 8, v(porPagar.fiscal));
  set(8, 9, v(porPagar.no_fiscal));
  set(9, 7, 'Saldo proyectado'); // fórmula -> I6+(I7+J7)-(I8+J8)
  set(11, 7, tituloSaldos);
  set(12, 7, 'Banorte'); // I12 EN BLANCO: se captura a mano en el Excel
  set(13, 7, 'GBM'); // I13 EN BLANCO
  set(14, 7, 'Caja chica'); // I14 EN BLANCO
  set(15, 7, 'Banorte + GBM'); // fórmula -> I12+I13
  set(16, 7, 'Caja chica'); // fórmula -> I14
  set(17, 7, 'Total'); // fórmula -> I15+I16

  // ===== Bloque 4: PROGRAMACIÓN MENSUAL DE GASTO (L:N, estático) =====
  set(1, 11, 'PROGRAMACIÓN MENSUAL DE GASTO');
  set(2, 11, 'CONCEPTO');
  set(2, 12, 'FISCAL');
  set(2, 13, 'N/FISCAL');
  MENSUAL.forEach(([nombre, a, b], i) => {
    const r = 3 + i;
    set(r, 11, nombre);
    set(r, 12, v(a));
    set(r, 13, v(b));
  });
  set(13, 11, 'TOTAL:');
  set(13, 12, r2(totalMensual.fiscal));
  set(13, 13, r2(totalMensual.no_fiscal));
  set(14, 11, '* Precios a octubre 2026');

  // 👇 tipado como any para que TypeScript no marque error en ws[...]
  const ws: any = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });
  ws['!cols'] = [
    { wch: 42 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, // A:F
    { wch: 3 }, // G (separador)
    { wch: 26 }, { wch: 16 }, { wch: 16 }, // H:J
    { wch: 3 }, // K (separador)
    { wch: 38 }, { wch: 16 }, { wch: 16 } // L:N
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Título gasto
    { s: { r: tituloIngresosRow - 1, c: 0 }, e: { r: tituloIngresosRow - 1, c: 5 } }, // Título ingresos
    { s: { r: 0, c: 7 }, e: { r: 0, c: 9 } }, // Resumen
    { s: { r: 1, c: 7 }, e: { r: 1, c: 9 } }, // Al {fecha}
    { s: { r: 10, c: 7 }, e: { r: 10, c: 9 } }, // Saldos al {fecha}:
    { s: { r: 0, c: 11 }, e: { r: 0, c: 13 } }, // Título mensual
    { s: { r: 13, c: 11 }, e: { r: 13, c: 13 } } // Nota * Precios a octubre 2026
  ];

  // ===== Fórmulas (referencian las celdas manuales I12:I14) =====
  ws['I6'] = { t: 'n', f: 'I15', v: 0 }; // Saldos actuales = Banorte + GBM
  ws['I9'] = { t: 'n', f: 'I6+(I7+J7)-(I8+J8)', v: saldoProyectadoCache }; // Saldo proyectado
  ws['I15'] = { t: 'n', f: 'I12+I13', v: 0 }; // Banorte + GBM
  ws['I16'] = { t: 'n', f: 'I14', v: 0 }; // Caja chica
  ws['I17'] = { t: 'n', f: 'I15+I16', v: 0 }; // Total saldos

  // ===== Estilos =====
  const borde = { style: 'thin', color: { rgb: 'D9DEE2' } };
  const bordes = { top: borde, bottom: borde, left: borde, right: borde };
  const estilo = (r1: number, c0: number, s: any) => {
    const ref = XLSX.utils.encode_cell({ r: r1 - 1, c: c0 });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    ws[ref].s = { ...(ws[ref].s || {}), ...s };
  };
  const titulo = {
    font: { name: 'Arial', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: AZUL } },
    alignment: { horizontal: 'center', vertical: 'center' }
  };
  const encabezado = {
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: AZUL } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: bordes
  };
  const base: any = { font: { name: 'Arial', sz: 10 }, alignment: { vertical: 'center' }, border: bordes };
  const centrado: any = { ...base, alignment: { horizontal: 'center', vertical: 'center' } };
  const monto: any = { ...base, numFmt: '"$"#,##0.00', alignment: { horizontal: 'right', vertical: 'center' } };
  const total: any = { ...base, font: { name: 'Arial', sz: 10, bold: true }, fill: { fgColor: { rgb: GRIS_TOTAL } } };
  const totalMonto: any = { ...total, numFmt: '"$"#,##0.00', alignment: { horizontal: 'right', vertical: 'center' } };

  const rango = (r1: number, c0: number, c1: number, s: any) => {
    for (let c = c0; c <= c1; c++) estilo(r1, c, s);
  };
  // Títulos y encabezados
  rango(1, 0, 5, titulo);
  rango(2, 0, 5, encabezado);
  rango(tituloIngresosRow, 0, 5, titulo);
  rango(headerIngresosRow, 0, 5, encabezado);
  rango(1, 7, 9, titulo);
  rango(2, 7, 9, { font: { name: 'Arial', sz: 12, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } });
  rango(3, 7, 9, encabezado);
  rango(1, 11, 13, titulo);
  rango(2, 11, 13, encabezado);
  // Datos del gasto: fecha (E) como yyyy-mm-dd, PAGADO (F) centrado
  for (let i = 0; i < nG; i++) {
    const r = 3 + i;
    estilo(r, 0, base);
    estilo(r, 1, base);
    estilo(r, 2, monto);
    estilo(r, 3, monto);
    estilo(r, 4, { ...centrado, numFmt: 'yyyy-mm-dd' });
    estilo(r, 5, centrado);
    // La fecha es celda de fecha real: el formato va en `z` (aoa_to_sheet le
    // pone el default m/d/yy y `z` manda sobre s.numFmt en estas celdas).
    if (fechaExcel(filasGasto[i].fecha_pago) != null) {
      const refFecha = XLSX.utils.encode_cell({ r: r - 1, c: 4 });
      if (ws[refFecha]) ws[refFecha].z = 'yyyy-mm-dd';
    }
  }
  // Total del gasto
  rango(totalGastoRow, 0, 1, total);
  estilo(totalGastoRow, 2, totalMonto);
  estilo(totalGastoRow, 3, totalMonto);
  rango(totalGastoRow, 4, 5, total);
  // Datos de ingresos: FOLIO (E) texto, COBRADO (F) centrado
  for (let i = 0; i < nI; i++) {
    const r = headerIngresosRow + 1 + i;
    estilo(r, 0, base);
    estilo(r, 1, base);
    estilo(r, 2, monto);
    estilo(r, 3, monto);
    estilo(r, 4, base);
    estilo(r, 5, centrado);
  }
  // Total de ingresos
  rango(totalIngresosRow, 0, 1, total);
  estilo(totalIngresosRow, 2, totalMonto);
  estilo(totalIngresosRow, 3, totalMonto);
  rango(totalIngresosRow, 4, 5, total);
  // Resumen: filas 4-8 normales, 9 proyectado (rosa), 11 saldos (amarillo),
  // 12-14 manuales, 15-17 calculadas
  for (const r of [4, 5, 6, 7, 8]) {
    estilo(r, 7, base);
    estilo(r, 8, monto);
    estilo(r, 9, monto);
  }
  const rosa: any = { ...base, font: { name: 'Arial', sz: 10, bold: true }, fill: { fgColor: { rgb: ROSA } } };
  const rosaMonto: any = { ...rosa, numFmt: '"$"#,##0.00', alignment: { horizontal: 'right', vertical: 'center' } };
  estilo(9, 7, rosa);
  estilo(9, 8, rosaMonto);
  estilo(9, 9, rosa);
  rango(11, 7, 9, {
    font: { name: 'Arial', sz: 10, bold: true },
    fill: { fgColor: { rgb: AMARILLO } },
    alignment: { vertical: 'center' },
    border: bordes
  });
  for (const r of [12, 13, 14]) {
    estilo(r, 7, base);
    estilo(r, 8, monto); // celdas manuales: con formato $ para cuando se capturen
    estilo(r, 9, base);
  }
  for (const r of [15, 16]) {
    estilo(r, 7, base);
    estilo(r, 8, monto);
    estilo(r, 9, base);
  }
  estilo(17, 7, total);
  estilo(17, 8, totalMonto);
  estilo(17, 9, total);
  // Mensual: datos 3-12, total 13, nota 14
  for (let i = 0; i < MENSUAL.length; i++) {
    const r = 3 + i;
    estilo(r, 11, base);
    estilo(r, 12, monto);
    estilo(r, 13, monto);
  }
  estilo(13, 11, total);
  estilo(13, 12, totalMonto);
  estilo(13, 13, totalMonto);
  rango(14, 11, 13, { font: { name: 'Arial', sz: 10, italic: true, color: { rgb: '666666' } } });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'Programación');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  saveAs(blob, `Programación ${mesAnioTitulo}.xlsx`);
}
