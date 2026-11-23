// Excel combinado de Recurrentes (v13, diseño de Ivo 2026-11-23):
// un solo archivo con toda la información, una hoja "Programación":
// (1) Programación del Gasto, (2) Programación de Ingresos,
// (3) Resumen con fórmulas, (4) PROGRAMACIÓN MENSUAL DE GASTO
// (estática, precios a octubre 2026 de la captura de Ivo).
// Lo genera el botón Exportar Excel de cualquiera de las dos pestañas
// (Pagos / Cobros) pidiendo AMBOS reportes del mes.
// Ampliación v14: el archivo NO es para imprimir, se llena en un Drive
// (Google Sheets): TODO lo calculado son FÓRMULAS vivas (SUM / SUMIF
// sobre los rangos de datos de cada bloque) con su valor en caché, para
// que al agregar renglones o cambiar valores todo se actualice solo.
// Rediseño v15: presentación ejecutiva — banda de título azul marino con
// filete dorado, encabezados azul acero, banding gris claro, totales
// azul claro con texto azul marino. Misma estructura, datos y fórmulas.
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
  // Factura del movimiento (v14): sale de archivo_factura; el back la trae
  // en el reporte de cobros y de ahí sale el FOLIO de Ingresos.
  factura?: string;
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
// Paleta ejecutiva (v15)
const NAVY = '1F3864'; // títulos y títulos de sección
const STEEL = '2F5597'; // encabezados de columna
const GOLD = 'BF9000'; // filete bajo el título
const BANDING = 'F2F2F2'; // renglones pares de datos
const TOTAL_BG = 'D9E2F3'; // totales
const AMARILLO_SUAVE = 'FFF2CC'; // "Saldos al..."
const VERDE_SUAVE = 'E2EFDA'; // "Saldo proyectado"
const VERDE_TEXTO = '375623';
const GRIS_NOTA = '595959';
const BORDE_GRIS = 'BFBFBF';
const BLANCO = 'FFFFFF';

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

// FOLIO (v14): la factura del movimiento, que el back ya trae como
// fila.factura y sale de archivo_factura (["518_87.pdf","518_89.pdf"] ->
// "F87 y F89"); vacío si el movimiento no tiene archivo_factura.
// Ya NO usa folio_fiscal de las facturas ligadas.
function folioDe(f: FilaRecurrenteExport): string {
  return (f.factura || '').toString().trim();
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

// ---- Posición de los bloques (filas 1-based, v15 con banda de título) ----
// Fila 1: banda de título "Programación — {mes} {año}" (A:N).
// Fila 2: filete dorado (A:N).
// Los bloques empiezan en la fila 3:
// Gasto: título 3, encabezado 4, datos 5.., total 5+nG.
// Ingresos: 2 filas en blanco después del total del gasto.
// Resumen (H:J, fijo): 3 título, 4 fecha, 5 encabezado, 6-11 filas,
// 13 "Saldos al...", 14-16 manuales, 17-19 calculadas.
// Mensual (L:N, fijo): 3 título, 4 encabezado, 5-14 datos, 15 total, 16 nota.
const F_GASTO_TITULO = 3;
const F_GASTO_HEAD = 4;
const F_GASTO_FIRST = 5;
const F_RES_TITULO = 3;
const F_RES_FECHA = 4;
const F_RES_HEAD = 5;
const F_RES_RECIBIDOS = 6;
const F_RES_REALIZADOS = 7;
const F_RES_SALDOS = 8;
const F_RES_COBRAR = 9;
const F_RES_PAGAR = 10;
const F_RES_PROYECTADO = 11;
const F_RES_SALDOS_LBL = 13;
const F_RES_BANORTE = 14;
const F_RES_GBM = 15;
const F_RES_CAJA = 16;
const F_RES_BGB = 17;
const F_RES_CAJA2 = 18;
const F_RES_TOTAL = 19;
const F_MEN_TITULO = 3;
const F_MEN_HEAD = 4;
const F_MEN_FIRST = 5;
const F_MEN_LAST = 14;
const F_MEN_TOTAL = 15;
const F_MEN_NOTA = 16;

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
  const nG = filasGasto.length;
  const nI = filasIngreso.length;
  const totalGastoRow = F_GASTO_FIRST + nG;
  const tituloIngresosRow = totalGastoRow + 3;
  const headerIngresosRow = tituloIngresosRow + 1;
  const totalIngresosRow = headerIngresosRow + 1 + nI;
  const nRows = Math.max(totalIngresosRow, F_RES_TOTAL, F_MEN_NOTA);

  const aoa: any[][] = Array.from({ length: nRows }, () => new Array(N_COLS).fill(''));
  const set = (r1: number, c0: number, val: any) => { aoa[r1 - 1][c0] = val; };

  // ===== Banda de título (v15, fila 1) + filete dorado (fila 2) =====
  set(1, 0, `Programación — ${mesAnioTitulo}`);
  // La fila 2 queda vacía (solo el filete dorado por estilo).

  // ===== Bloque 1: Programación del Gasto (A:F) =====
  set(F_GASTO_TITULO, 0, 'Programación del Gasto');
  ['CONCEPTO', 'BENEFICIARIO', 'FISCAL', 'N/FISCAL', 'FECHA DE PAGO', 'PAGADO']
    .forEach((h, c) => set(F_GASTO_HEAD, c, h));
  filasGasto.forEach((f, i) => {
    const r = F_GASTO_FIRST + i;
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
  // Filas fijas 3-19; las fórmulas referencian las celdas de este mismo
  // bloque (las manuales I14:I16), no valores fijos.
  set(F_RES_TITULO, 7, 'Resumen');
  set(F_RES_FECHA, 7, tituloFecha);
  set(F_RES_HEAD, 7, 'CONCEPTO');
  set(F_RES_HEAD, 8, 'FISCAL');
  set(F_RES_HEAD, 9, 'N/FISCAL');
  set(F_RES_RECIBIDOS, 7, 'Pagos recibidos');
  set(F_RES_RECIBIDOS, 8, v(recibidos.fiscal));
  set(F_RES_RECIBIDOS, 9, v(recibidos.no_fiscal));
  set(F_RES_REALIZADOS, 7, 'Pagos realizados');
  set(F_RES_REALIZADOS, 8, v(realizados.fiscal));
  set(F_RES_REALIZADOS, 9, v(realizados.no_fiscal));
  set(F_RES_SALDOS, 7, 'Saldos actuales'); // fórmula -> I17 (Banorte + GBM)
  set(F_RES_COBRAR, 7, '(+) Por cobrar');
  set(F_RES_COBRAR, 8, v(porCobrar.fiscal));
  set(F_RES_COBRAR, 9, v(porCobrar.no_fiscal));
  set(F_RES_PAGAR, 7, '(-) Por pagar');
  set(F_RES_PAGAR, 8, v(porPagar.fiscal));
  set(F_RES_PAGAR, 9, v(porPagar.no_fiscal));
  set(F_RES_PROYECTADO, 7, 'Saldo proyectado'); // fórmula -> I8+(I9+J9)-(I10+J10)
  set(F_RES_SALDOS_LBL, 7, tituloSaldos);
  set(F_RES_BANORTE, 7, 'Banorte'); // I14 EN BLANCO: se captura a mano en el Excel
  set(F_RES_GBM, 7, 'GBM'); // I15 EN BLANCO
  set(F_RES_CAJA, 7, 'Caja chica'); // I16 EN BLANCO
  set(F_RES_BGB, 7, 'Banorte + GBM'); // fórmula -> I14+I15
  set(F_RES_CAJA2, 7, 'Caja chica'); // fórmula -> I16
  set(F_RES_TOTAL, 7, 'Total'); // fórmula -> I17+I18

  // ===== Bloque 4: PROGRAMACIÓN MENSUAL DE GASTO (L:N, estático) =====
  set(F_MEN_TITULO, 11, 'PROGRAMACIÓN MENSUAL DE GASTO');
  set(F_MEN_HEAD, 11, 'CONCEPTO');
  set(F_MEN_HEAD, 12, 'FISCAL');
  set(F_MEN_HEAD, 13, 'N/FISCAL');
  MENSUAL.forEach(([nombre, a, b], i) => {
    const r = F_MEN_FIRST + i;
    set(r, 11, nombre);
    set(r, 12, v(a));
    set(r, 13, v(b));
  });
  set(F_MEN_TOTAL, 11, 'TOTAL:');
  set(F_MEN_TOTAL, 12, r2(totalMensual.fiscal));
  set(F_MEN_TOTAL, 13, r2(totalMensual.no_fiscal));
  set(F_MEN_NOTA, 11, '* Precios a octubre 2026');

  // 👇 tipado como any para que TypeScript no marque error en ws[...]
  const ws: any = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });
  ws['!cols'] = [
    { wch: 44 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, // A:F
    { wch: 3 }, // G (separador)
    { wch: 28 }, { wch: 16 }, { wch: 16 }, // H:J
    { wch: 3 }, // K (separador)
    { wch: 40 }, { wch: 16 }, { wch: 16 } // L:N
  ];
  ws['!rows'] = [
    { hpt: 30 }, // 1: banda de título
    { hpt: 6 } // 2: filete dorado
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }, // Banda de título
    { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }, // Filete dorado
    { s: { r: F_GASTO_TITULO - 1, c: 0 }, e: { r: F_GASTO_TITULO - 1, c: 5 } }, // Título gasto
    { s: { r: tituloIngresosRow - 1, c: 0 }, e: { r: tituloIngresosRow - 1, c: 5 } }, // Título ingresos
    { s: { r: F_RES_TITULO - 1, c: 7 }, e: { r: F_RES_TITULO - 1, c: 9 } }, // Resumen
    { s: { r: F_RES_FECHA - 1, c: 7 }, e: { r: F_RES_FECHA - 1, c: 9 } }, // Al {fecha}
    { s: { r: F_RES_SALDOS_LBL - 1, c: 7 }, e: { r: F_RES_SALDOS_LBL - 1, c: 9 } }, // Saldos al {fecha}:
    { s: { r: F_MEN_TITULO - 1, c: 11 }, e: { r: F_MEN_TITULO - 1, c: 13 } }, // Título mensual
    { s: { r: F_MEN_NOTA - 1, c: 11 }, e: { r: F_MEN_NOTA - 1, c: 13 } } // Nota * Precios a octubre 2026
  ];

  // ===== Fórmulas (referencian las celdas manuales I14:I16) =====
  // Fórmulas vivas (v14): los totales y el Resumen se calculan
  // con SUM / SUMIF sobre los rangos EXACTOS de datos de cada bloque
  // (las variables de fila ya calculadas arriba); el valor en caché (`v`)
  // es el calculado en TS para que el archivo se vea bien al abrirlo
  // antes de recalcular. Con un bloque vacío no hay rango válido y se
  // deja el valor estático (0). Las columnas PAGADO/COBRADO llevan texto
  // ☑/☐, así que el criterio del SUMIF es el carácter exacto.
  // Gasto: datos C5:C{gasLast} / D5:D{gasLast}; Ingresos: datos
  // C{ingFirst}:C{ingLast} / D{ingFirst}:D{ingLast}; Mensual: M5:M14 / N5:N14.
  const gasFirst = F_GASTO_FIRST;
  const gasLast = totalGastoRow - 1; // = 4 + nG
  const ingFirst = headerIngresosRow + 1;
  const ingLast = totalIngresosRow - 1; // = headerIngresosRow + nI
  if (nG > 0) {
    ws[`C${totalGastoRow}`] = { t: 'n', f: `SUM(C${gasFirst}:C${gasLast})`, v: r2(totalGasto.fiscal) };
    ws[`D${totalGastoRow}`] = { t: 'n', f: `SUM(D${gasFirst}:D${gasLast})`, v: r2(totalGasto.no_fiscal) };
  }
  if (nI > 0) {
    ws[`C${totalIngresosRow}`] = { t: 'n', f: `SUM(C${ingFirst}:C${ingLast})`, v: r2(totalIngreso.fiscal) };
    ws[`D${totalIngresosRow}`] = { t: 'n', f: `SUM(D${ingFirst}:D${ingLast})`, v: r2(totalIngreso.no_fiscal) };
  }
  ws[`M${F_MEN_TOTAL}`] = { t: 'n', f: `SUM(M${F_MEN_FIRST}:M${F_MEN_LAST})`, v: r2(totalMensual.fiscal) };
  ws[`N${F_MEN_TOTAL}`] = { t: 'n', f: `SUM(N${F_MEN_FIRST}:N${F_MEN_LAST})`, v: r2(totalMensual.no_fiscal) };
  // Resumen: recibidos / por cobrar = SUMIF sobre Ingresos por COBRADO;
  // realizados / por pagar = SUMIF sobre Gasto por PAGADO (columna F).
  if (nI > 0) {
    ws[`I${F_RES_RECIBIDOS}`] = { t: 'n', f: `SUMIF(F${ingFirst}:F${ingLast},"☑",C${ingFirst}:C${ingLast})`, v: r2(recibidos.fiscal) };
    ws[`J${F_RES_RECIBIDOS}`] = { t: 'n', f: `SUMIF(F${ingFirst}:F${ingLast},"☑",D${ingFirst}:D${ingLast})`, v: r2(recibidos.no_fiscal) };
    ws[`I${F_RES_COBRAR}`] = { t: 'n', f: `SUMIF(F${ingFirst}:F${ingLast},"☐",C${ingFirst}:C${ingLast})`, v: r2(porCobrar.fiscal) };
    ws[`J${F_RES_COBRAR}`] = { t: 'n', f: `SUMIF(F${ingFirst}:F${ingLast},"☐",D${ingFirst}:D${ingLast})`, v: r2(porCobrar.no_fiscal) };
  }
  if (nG > 0) {
    ws[`I${F_RES_REALIZADOS}`] = { t: 'n', f: `SUMIF(F${gasFirst}:F${gasLast},"☑",C${gasFirst}:C${gasLast})`, v: r2(realizados.fiscal) };
    ws[`J${F_RES_REALIZADOS}`] = { t: 'n', f: `SUMIF(F${gasFirst}:F${gasLast},"☑",D${gasFirst}:D${gasLast})`, v: r2(realizados.no_fiscal) };
    ws[`I${F_RES_PAGAR}`] = { t: 'n', f: `SUMIF(F${gasFirst}:F${gasLast},"☐",C${gasFirst}:C${gasLast})`, v: r2(porPagar.fiscal) };
    ws[`J${F_RES_PAGAR}`] = { t: 'n', f: `SUMIF(F${gasFirst}:F${gasLast},"☐",D${gasFirst}:D${gasLast})`, v: r2(porPagar.no_fiscal) };
  }
  ws[`I${F_RES_SALDOS}`] = { t: 'n', f: `I${F_RES_BGB}`, v: 0 }; // Saldos actuales = Banorte + GBM
  ws[`I${F_RES_PROYECTADO}`] = { t: 'n', f: `I${F_RES_SALDOS}+(I${F_RES_COBRAR}+J${F_RES_COBRAR})-(I${F_RES_PAGAR}+J${F_RES_PAGAR})`, v: saldoProyectadoCache }; // Saldo proyectado
  ws[`I${F_RES_BGB}`] = { t: 'n', f: `I${F_RES_BANORTE}+I${F_RES_GBM}`, v: 0 }; // Banorte + GBM
  ws[`I${F_RES_CAJA2}`] = { t: 'n', f: `I${F_RES_CAJA}`, v: 0 }; // Caja chica
  ws[`I${F_RES_TOTAL}`] = { t: 'n', f: `I${F_RES_BGB}+I${F_RES_CAJA2}`, v: 0 }; // Total saldos

  // ===== Estilos (v15, presentación ejecutiva) =====
  const bordeFino = { style: 'thin', color: { rgb: BORDE_GRIS } };
  const bordes = { top: bordeFino, bottom: bordeFino, left: bordeFino, right: bordeFino };
  const estilo = (r1: number, c0: number, s: any) => {
    const ref = XLSX.utils.encode_cell({ r: r1 - 1, c: c0 });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    ws[ref].s = { ...(ws[ref].s || {}), ...s };
  };
  // Aplica `s` a una fila de datos con banding en renglones pares (i impar).
  const conBanding = (s: any, par: boolean) =>
    par ? { ...s, fill: { fgColor: { rgb: BANDING } } } : s;
  const banner = {
    font: { name: 'Arial', sz: 16, bold: true, color: { rgb: BLANCO } },
    fill: { fgColor: { rgb: NAVY } },
    alignment: { horizontal: 'center', vertical: 'center' }
  };
  const tituloSeccion = {
    font: { name: 'Arial', sz: 12, bold: true, color: { rgb: BLANCO } },
    fill: { fgColor: { rgb: NAVY } },
    alignment: { horizontal: 'center', vertical: 'center' }
  };
  const encabezado = {
    font: { name: 'Arial', sz: 11, bold: true, color: { rgb: BLANCO } },
    fill: { fgColor: { rgb: STEEL } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: bordes
  };
  const base: any = { font: { name: 'Arial', sz: 11 }, alignment: { vertical: 'center' }, border: bordes };
  const centrado: any = { ...base, alignment: { horizontal: 'center', vertical: 'center' } };
  const monto: any = { ...base, numFmt: '"$"#,##0.00', alignment: { horizontal: 'right', vertical: 'center' } };
  const bordeTotalMedio = { style: 'medium', color: { rgb: NAVY } };
  const total: any = {
    font: { name: 'Arial', sz: 11, bold: true, color: { rgb: NAVY } },
    fill: { fgColor: { rgb: TOTAL_BG } },
    border: { top: bordeTotalMedio, bottom: bordeFino, left: bordeFino, right: bordeFino }
  };
  const totalMonto: any = { ...total, numFmt: '"$"#,##0.00', alignment: { horizontal: 'right', vertical: 'center' } };

  const rango = (r1: number, c0: number, c1: number, s: any) => {
    for (let c = c0; c <= c1; c++) estilo(r1, c, s);
  };
  // Banda de título (fila 1) y filete dorado (fila 2)
  rango(1, 0, 13, banner);
  rango(2, 0, 13, { fill: { fgColor: { rgb: GOLD } } });
  // Títulos de sección y encabezados
  rango(F_GASTO_TITULO, 0, 5, tituloSeccion);
  rango(F_GASTO_HEAD, 0, 5, encabezado);
  rango(tituloIngresosRow, 0, 5, tituloSeccion);
  rango(headerIngresosRow, 0, 5, encabezado);
  rango(F_RES_TITULO, 7, 9, tituloSeccion);
  rango(F_RES_FECHA, 7, 9, {
    font: { name: 'Arial', sz: 12, bold: true, color: { rgb: NAVY } },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  rango(F_RES_HEAD, 7, 9, encabezado);
  rango(F_MEN_TITULO, 11, 13, tituloSeccion);
  rango(F_MEN_HEAD, 11, 13, encabezado);
  // Datos del gasto: fecha (E) como yyyy-mm-dd, PAGADO (F) centrado
  for (let i = 0; i < nG; i++) {
    const r = F_GASTO_FIRST + i;
    const par = i % 2 === 1;
    estilo(r, 0, conBanding(base, par));
    estilo(r, 1, conBanding(base, par));
    estilo(r, 2, conBanding(monto, par));
    estilo(r, 3, conBanding(monto, par));
    estilo(r, 4, conBanding({ ...centrado, numFmt: 'yyyy-mm-dd' }, par));
    estilo(r, 5, conBanding(centrado, par));
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
    const par = i % 2 === 1;
    estilo(r, 0, conBanding(base, par));
    estilo(r, 1, conBanding(base, par));
    estilo(r, 2, conBanding(monto, par));
    estilo(r, 3, conBanding(monto, par));
    estilo(r, 4, conBanding(base, par));
    estilo(r, 5, conBanding(centrado, par));
  }
  // Total de ingresos
  rango(totalIngresosRow, 0, 1, total);
  estilo(totalIngresosRow, 2, totalMonto);
  estilo(totalIngresosRow, 3, totalMonto);
  rango(totalIngresosRow, 4, 5, total);
  // Resumen: etiquetas azul marino en negrita, montos normales
  const etiquetaResumen: any = {
    ...base,
    font: { name: 'Arial', sz: 11, bold: true, color: { rgb: NAVY } }
  };
  for (const r of [F_RES_RECIBIDOS, F_RES_REALIZADOS, F_RES_SALDOS, F_RES_COBRAR, F_RES_PAGAR]) {
    estilo(r, 7, etiquetaResumen);
    estilo(r, 8, monto);
    estilo(r, 9, monto);
  }
  const verde: any = {
    ...base,
    font: { name: 'Arial', sz: 11, bold: true, color: { rgb: VERDE_TEXTO } },
    fill: { fgColor: { rgb: VERDE_SUAVE } }
  };
  const verdeMonto: any = { ...verde, numFmt: '"$"#,##0.00', alignment: { horizontal: 'right', vertical: 'center' } };
  estilo(F_RES_PROYECTADO, 7, verde);
  estilo(F_RES_PROYECTADO, 8, verdeMonto);
  estilo(F_RES_PROYECTADO, 9, verde);
  rango(F_RES_SALDOS_LBL, 7, 9, {
    font: { name: 'Arial', sz: 11, bold: true, color: { rgb: NAVY } },
    fill: { fgColor: { rgb: AMARILLO_SUAVE } },
    alignment: { vertical: 'center' },
    border: bordes
  });
  // Celdas manuales (Banorte / GBM / Caja chica): fondo blanco con borde
  // medio azul acero para que se note que ahí se escribe.
  const bordeManual = { style: 'medium', color: { rgb: STEEL } };
  const manual: any = {
    ...monto,
    fill: { fgColor: { rgb: BLANCO } },
    border: { top: bordeManual, bottom: bordeManual, left: bordeManual, right: bordeManual }
  };
  for (const r of [F_RES_BANORTE, F_RES_GBM, F_RES_CAJA]) {
    estilo(r, 7, etiquetaResumen);
    estilo(r, 8, manual); // celdas manuales: con formato $ para cuando se capturen
    estilo(r, 9, base);
  }
  for (const r of [F_RES_BGB, F_RES_CAJA2]) {
    estilo(r, 7, etiquetaResumen);
    estilo(r, 8, monto);
    estilo(r, 9, base);
  }
  estilo(F_RES_TOTAL, 7, total);
  estilo(F_RES_TOTAL, 8, totalMonto);
  estilo(F_RES_TOTAL, 9, total);
  // Mensual: datos 5-14, total 15, nota 16
  for (let i = 0; i < MENSUAL.length; i++) {
    const r = F_MEN_FIRST + i;
    const par = i % 2 === 1;
    estilo(r, 11, conBanding(base, par));
    estilo(r, 12, conBanding(monto, par));
    estilo(r, 13, conBanding(monto, par));
  }
  estilo(F_MEN_TOTAL, 11, total);
  estilo(F_MEN_TOTAL, 12, totalMonto);
  estilo(F_MEN_TOTAL, 13, totalMonto);
  rango(F_MEN_NOTA, 11, 13, { font: { name: 'Arial', sz: 10, italic: true, color: { rgb: GRIS_NOTA } } });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'Programación');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  saveAs(blob, `Programación ${mesAnioTitulo}.xlsx`);
}
