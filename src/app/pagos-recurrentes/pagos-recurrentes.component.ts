import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { PagoRecurrenteDto, PagosRecurrentesService, ReporteFila } from './pagos-recurrentes.service';

@Component({
  selector: 'app-pagos-recurrentes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagos-recurrentes.component.html',
  styleUrls: ['../caja-chica/caja-chica.component.css', './pagos-recurrentes.component.css']
})
export class PagosRecurrentesComponent implements OnInit {

  constructor(private service: PagosRecurrentesService) { }

  // ===== Selector de mes =====
  filtroAnio = new Date().getFullYear();
  filtroMes = new Date().getMonth() + 1;
  anios: number[] = [];
  meses = [
    { value: 1, text: 'ENERO' }, { value: 2, text: 'FEBRERO' }, { value: 3, text: 'MARZO' },
    { value: 4, text: 'ABRIL' }, { value: 5, text: 'MAYO' }, { value: 6, text: 'JUNIO' },
    { value: 7, text: 'JULIO' }, { value: 8, text: 'AGOSTO' }, { value: 9, text: 'SEPTIEMBRE' },
    { value: 10, text: 'OCTUBRE' }, { value: 11, text: 'NOVIEMBRE' }, { value: 12, text: 'DICIEMBRE' }
  ];
  diasPago: number[] = Array.from({ length: 31 }, (_, i) => i + 1);

  // ===== Reporte =====
  filas: ReporteFila[] = [];
  totales = { fiscal: 0, no_fiscal: 0 };
  cargando = false;
  errorCarga: string | null = null;

  // La sección "Programación del Gasto" está oculta por default (v5).
  mostrarProgramacion = false;

  // movimiento_id de las filas extra seleccionadas para el Excel (solo sesión, v6).
  // Por default van todas, como antes.
  extrasSeleccionadas = new Set<number>();

  // En pantalla solo se muestran los pagos recurrentes; los pagos del mes
  // que no pertenecen a ningún recurrente solo aparecen en el Excel.
  get filasRecurrentes(): ReporteFila[] {
    return this.filas.filter(f => f.origen === 'recurrente');
  }

  get totalesRecurrentes(): { fiscal: number; no_fiscal: number } {
    return this.filasRecurrentes.reduce(
      (t, f) => ({ fiscal: t.fiscal + (Number(f.fiscal) || 0), no_fiscal: t.no_fiscal + (Number(f.no_fiscal) || 0) }),
      { fiscal: 0, no_fiscal: 0 }
    );
  }

  // Filas que se muestran en la sección revelada y se exportan al Excel (v5+v6):
  // todos los recurrentes + las extras seleccionadas.
  get filasExportar(): ReporteFila[] {
    return this.filas.filter(f => {
      if (f.origen === 'recurrente') return true;
      // Extra sin movimiento_id (back sin el campo nuevo): no se puede
      // deseleccionar, va como antes.
      if (f.movimiento_id == null) return true;
      return this.extrasSeleccionadas.has(f.movimiento_id);
    });
  }

  get totalesExportar(): { fiscal: number; no_fiscal: number } {
    return this.filasExportar.reduce(
      (t, f) => ({ fiscal: t.fiscal + (Number(f.fiscal) || 0), no_fiscal: t.no_fiscal + (Number(f.no_fiscal) || 0) }),
      { fiscal: 0, no_fiscal: 0 }
    );
  }

  toggleProgramacion() {
    this.mostrarProgramacion = !this.mostrarProgramacion;
  }

  isExtraSeleccionada(f: ReporteFila): boolean {
    if (f.movimiento_id == null) return true;
    return this.extrasSeleccionadas.has(f.movimiento_id);
  }

  toggleExtra(f: ReporteFila, ev: Event) {
    if (f.movimiento_id == null) return;
    const input = ev.target as HTMLInputElement;
    if (input.checked) this.extrasSeleccionadas.add(f.movimiento_id);
    else this.extrasSeleccionadas.delete(f.movimiento_id);
  }

  seleccionarTodasExtras() {
    this.filas
      .filter(f => f.origen !== 'recurrente' && f.movimiento_id != null)
      .forEach(f => this.extrasSeleccionadas.add(f.movimiento_id as number));
  }

  seleccionarNingunaExtra() {
    this.extrasSeleccionadas.clear();
  }

  togglePagado(f: ReporteFila, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const pagado = input.checked;
    const id = f.pago_recurrente_id;
    if (id == null) {
      input.checked = f.pagado;
      return;
    }
    const anterior = f.pagado;
    f.pagado = pagado;
    this.service.marcarPagado(id, this.filtroAnio, this.filtroMes, pagado).subscribe({
      next: () => { /* queda actualizado en local, sin recargar todo */ },
      error: (err) => {
        f.pagado = anterior;
        input.checked = anterior;
        Swal.fire('No se pudo guardar', err.error?.message || 'No se pudo marcar el pago.', 'error');
      }
    });
  }

  // ===== Recurrentes registrados =====
  recurrentes: any[] = [];
  cargandoRecurrentes = false;
  errorRecurrentes: string | null = null;

  // Mostrar centavos (con decimales) o redondear todo a pesos enteros
  mostrarCentavos = false;

  get fmtMoneda(): string {
    return this.mostrarCentavos ? '1.2-2' : '1.0-0';
  }

  toggleCentavos() {
    this.mostrarCentavos = !this.mostrarCentavos;
  }

  get nombreMes() {
    return this.meses.find(m => m.value === this.filtroMes)?.text;
  }

  // Mes en español en minúsculas para el título del Excel, p. ej. "noviembre 2026"
  get mesAnioTitulo(): string {
    return `${(this.nombreMes || '').toLowerCase()} ${this.filtroAnio}`;
  }

  ngOnInit() {
    const anioActual = new Date().getFullYear();
    this.anios = [anioActual - 1, anioActual, anioActual + 1];
    this.cargar();
  }

  cambiarMes() {
    this.cargar();
  }

  cargar() {
    this.cargarReporte();
    this.cargarRecurrentes();
  }

  cargarReporte() {
    this.cargando = true;
    this.errorCarga = null;
    this.service.reporte(this.filtroAnio, this.filtroMes).subscribe({
      next: res => {
        const r: any = res || {};
        this.filas = r.filas || r.reporte || r.rows || (Array.isArray(r) ? r : []);
        // Al cargar el mes, todas las extras van seleccionadas por default (v6).
        this.extrasSeleccionadas = new Set(
          this.filas
            .filter(f => f.origen !== 'recurrente' && f.movimiento_id != null)
            .map(f => f.movimiento_id as number)
        );
        // El back devuelve total_fiscal / total_no_fiscal; si no vienen se suman las filas.
        this.totales = {
          fiscal: r.total_fiscal !== undefined ? (Number(r.total_fiscal) || 0) : this.filas.reduce((s, f) => s + (Number(f.fiscal) || 0), 0),
          no_fiscal: r.total_no_fiscal !== undefined ? (Number(r.total_no_fiscal) || 0) : this.filas.reduce((s, f) => s + (Number(f.no_fiscal) || 0), 0)
        };
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.errorCarga = 'No se pudo cargar el reporte del mes. Intenta de nuevo con Reintentar.';
      }
    });
  }

  cargarRecurrentes() {
    this.cargandoRecurrentes = true;
    this.errorRecurrentes = null;
    this.service.getAll().subscribe({
      next: res => { this.recurrentes = res as any[]; this.cargandoRecurrentes = false; },
      error: () => {
        this.cargandoRecurrentes = false;
        this.errorRecurrentes = 'No se pudieron cargar los pagos recurrentes registrados.';
      }
    });
  }

  // ===== Formato de fecha (igual que maquinaria: 26-nov-26) =====
  fmtFecha(f: any): string {
    if (!f) return 'Por definir';
    const soloFecha = f.toString().split('T')[0].split(' ')[0];
    const partes = soloFecha.split('-');
    if (partes.length !== 3) return soloFecha;
    const MESES_ABR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const [y, m, d] = partes;
    return `${d}-${MESES_ABR[Number(m) - 1] || m}-${y.slice(2)}`;
  }

  // ===== EXPORTAR EXCEL (Programación del Gasto) =====
  exportarExcel() {
    const r = (n: any) => this.mostrarCentavos
      ? Math.round(Number(n || 0) * 100) / 100
      : Math.round(Number(n) || 0);
    const v = (n: any) => (Number(n) > 0 ? r(n) : '');

    const filas: any[][] = [
      ['Programación del Gasto', '', '', '', '', '', ''],
      [this.mesAnioTitulo, '', '', '', '', '', ''],
      ['CONCEPTO', 'BENEFICIARIO', 'FISCAL', 'N FISCAL', 'FECHA DE PAGO', 'PAGADO', 'ORIGEN'],
      ...this.filasExportar.map((f: any) => [
        f.concepto || '',
        f.beneficiario || '',
        v(f.fiscal),
        v(f.no_fiscal),
        this.fmtFecha(f.fecha_pago),
        f.pagado ? '✓' : '☐',
        f.origen === 'recurrente' ? 'Recurrente' : 'Factura'
      ]),
      ['TOTAL', '', r(this.totalesExportar.fiscal), r(this.totalesExportar.no_fiscal), '', '', '']
    ];

    // 👇 tipado como any para que TypeScript no marque error en ws[...]
    const ws: any = XLSX.utils.aoa_to_sheet(filas);
    ws['!cols'] = [
      { wch: 42 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 12 }
    ];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }
    ];

    // ===== Estilos (mismo patrón que bancos-caja-chica) =====
    const borde = { style: 'thin', color: { rgb: 'D9DEE2' } };
    const bordes = { top: borde, bottom: borde, left: borde, right: borde };
    const ultimaFila = filas.length - 1;

    const estilo = (rr: number, c: number, s: any) => {
      const ref = XLSX.utils.encode_cell({ r: rr, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = { ...(ws[ref].s || {}), ...s };
    };

    for (let rr = 0; rr <= ultimaFila; rr++) {
      for (let c = 0; c <= 6; c++) {
        const base: any = { font: { name: 'Arial', sz: 10 }, alignment: { vertical: 'center' } };
        if (rr === 0) {
          Object.assign(base, { font: { name: 'Arial', sz: 14, bold: true }, alignment: { horizontal: 'center' } });
        } else if (rr === 1) {
          Object.assign(base, { font: { name: 'Arial', sz: 12, bold: true }, alignment: { horizontal: 'center' } });
        } else if (rr === 2) {
          Object.assign(base, {
            font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '2B5D8A' } },
            alignment: { horizontal: 'center' },
            border: bordes
          });
        } else if (rr === ultimaFila) {
          Object.assign(base, {
            font: { name: 'Arial', sz: 10, bold: true },
            fill: { fgColor: { rgb: 'F2F6FA' } },
            border: bordes
          });
        } else if (c >= 2 && c <= 3) {
          base.numFmt = this.mostrarCentavos ? '"$"#,##0.00' : '"$"#,##0';
          base.alignment = { horizontal: 'right' };
          base.border = bordes;
        } else {
          base.border = bordes;
        }
        estilo(rr, c, base);
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, 'Programación del Gasto');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    saveAs(blob, `Programación del Gasto ${this.mesAnioTitulo}.xlsx`);
  }

  // ===== MODAL (nuevo / editar) =====
  showModal = false;
  editando = false;
  idEditando: number | null = null;
  guardando = false;
  errorModal: string | null = null;

  form: PagoRecurrenteDto = {
    concepto: '',
    beneficiario: '',
    fiscal: 0,
    no_fiscal: 0,
    dia_pago: null,
    activo: true,
    monto_factura: false,
    movimiento_id: null,
    factura_ids: []
  };

  // Día de pago en el select: '' = Por definir
  get diaPagoSel(): string {
    return this.form.dia_pago == null ? '' : String(this.form.dia_pago);
  }
  set diaPagoSel(v: string) {
    this.form.dia_pago = v === '' ? null : Number(v);
  }

  // ===== Buscar factura (varias facturas por pago recurrente) =====
  textoFactura = '';
  facturas: any[] = [];
  buscandoFacturas = false;
  facturasSeleccionadas: any[] = [];

  get totalFacturasSeleccionadas(): number {
    return this.facturasSeleccionadas.reduce((s, f) => s + (Number(f.importe_sin_iva ?? f.fiscal ?? 0) || 0), 0);
  }

  numFacturas(p: any): number {
    if (Array.isArray(p.facturas)) return p.facturas.length;
    if (Array.isArray(p.factura_ids)) return p.factura_ids.length;
    return 0;
  }

  buscarFacturas() {
    const texto = (this.textoFactura || '').trim();
    if (!texto) { this.facturas = []; return; }
    this.buscandoFacturas = true;
    this.service.buscarFacturas(texto).subscribe({
      next: res => { this.facturas = res as any[]; this.buscandoFacturas = false; },
      error: () => { this.buscandoFacturas = false; this.facturas = []; }
    });
  }

  facturaYaAgregada(f: any): boolean {
    return this.facturasSeleccionadas.some(s => s.id === f.id);
  }

  agregarFactura(f: any) {
    if (this.facturaYaAgregada(f)) return;
    // La primera factura llena concepto y beneficiario (como hacía elegirFactura en v3).
    if (this.facturasSeleccionadas.length === 0) {
      this.form.concepto = (f.concepto || '').toString();
      // El back devuelve el beneficiario como razon_social.
      this.form.beneficiario = (f.razon_social ?? f.beneficiario ?? f.nombre ?? '').toString();
    }
    this.facturasSeleccionadas.push(f);
    // El Fiscal es la suma de los importe_sin_iva de las seleccionadas.
    this.form.fiscal = this.totalFacturasSeleccionadas;
  }

  quitarFacturaDeLista(id: number) {
    this.facturasSeleccionadas = this.facturasSeleccionadas.filter(f => f.id !== id);
    this.form.fiscal = this.totalFacturasSeleccionadas;
  }

  nuevo() {
    this.editando = false;
    this.idEditando = null;
    this.form = { concepto: '', beneficiario: '', fiscal: 0, no_fiscal: 0, dia_pago: null, activo: true, monto_factura: false, movimiento_id: null, factura_ids: [] };
    this.textoFactura = '';
    this.facturas = [];
    this.facturasSeleccionadas = [];
    this.errorModal = null;
    this.showModal = true;
  }

  editar(p: any) {
    this.editando = true;
    this.idEditando = p.id;
    this.form = {
      concepto: p.concepto || '',
      beneficiario: p.beneficiario || '',
      fiscal: Number(p.fiscal) || 0,
      no_fiscal: Number(p.no_fiscal) || 0,
      dia_pago: p.dia_pago ?? null,
      activo: p.activo !== false && p.activo !== 0,
      monto_factura: p.monto_factura === 1 || p.monto_factura === true,
      movimiento_id: p.movimiento_id ?? null,
      factura_ids: Array.isArray(p.factura_ids) ? p.factura_ids : []
    };
    // Carga las facturas ligadas: objetos completos si vienen, o entradas
    // mínimas con solo el id si solo vienen los ids. El Fiscal queda como venga en p.fiscal.
    if (Array.isArray(p.facturas) && p.facturas.length > 0) {
      this.facturasSeleccionadas = [...p.facturas];
      this.form.factura_ids = this.facturasSeleccionadas.map(f => f.id);
    } else if (Array.isArray(p.factura_ids) && p.factura_ids.length > 0) {
      this.facturasSeleccionadas = p.factura_ids.map((id: number) => ({ id }));
    } else {
      this.facturasSeleccionadas = [];
    }
    if (this.facturasSeleccionadas.length > 0) {
      this.form.movimiento_id = this.facturasSeleccionadas[0].id ?? null;
    }
    this.textoFactura = '';
    this.facturas = [];
    this.errorModal = null;
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
  }

  guardar() {
    // El beneficiario es opcional (el back casa solo por concepto si está vacío).
    if (!(this.form.concepto || '').trim()) {
      this.errorModal = 'El concepto es obligatorio.';
      return;
    }
    this.guardando = true;
    this.errorModal = null;
    const facturaIds = this.facturasSeleccionadas.map(f => f.id);
    const dto: PagoRecurrenteDto = {
      concepto: this.form.concepto.trim().toUpperCase(),
      beneficiario: (this.form.beneficiario || '').trim().toUpperCase(),
      fiscal: Number(this.form.fiscal) || 0,
      no_fiscal: Number(this.form.no_fiscal) || 0,
      dia_pago: this.form.dia_pago,
      activo: !!this.form.activo,
      monto_factura: !!this.form.monto_factura,
      movimiento_id: facturaIds.length > 0 ? facturaIds[0] : null,
      factura_ids: facturaIds
    };
    const req = this.editando && this.idEditando != null
      ? this.service.update(this.idEditando, dto)
      : this.service.create(dto);
    req.subscribe({
      next: () => {
        this.guardando = false;
        this.showModal = false;
        this.cargar();
      },
      error: (err) => {
        this.guardando = false;
        this.errorModal = err.error?.message || 'No se pudo guardar el pago recurrente.';
      }
    });
  }

  // ===== ELIMINAR (mismo patrón SweetAlert2 que finanzas) =====
  eliminar(p: any) {
    Swal.fire({
      title: '¿Eliminar pago recurrente?',
      text: `"${p.concepto}" — ${p.beneficiario}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.delete(p.id).subscribe({
          next: () => {
            Swal.fire({
              title: 'Eliminado',
              text: 'El pago recurrente fue eliminado correctamente.',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false
            });
            this.cargar();
          },
          error: (err) => {
            Swal.fire('No se pudo eliminar', err.error?.message || 'Error', 'error');
          }
        });
      }
    });
  }
}
