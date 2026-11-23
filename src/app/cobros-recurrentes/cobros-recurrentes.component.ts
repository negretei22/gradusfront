import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { CobroRecurrenteDto, CobrosRecurrentesService, ReporteFila } from './cobros-recurrentes.service';
import { PagosRecurrentesService } from '../pagos-recurrentes/pagos-recurrentes.service';
import { exportarExcelCombinado, extraerFilas, filtrarProgramacion } from '../pagos-recurrentes/excel-combinado';

@Component({
  selector: 'app-cobros-recurrentes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cobros-recurrentes.component.html',
  styleUrls: ['../caja-chica/caja-chica.component.css', './cobros-recurrentes.component.css']
})
export class CobrosRecurrentesComponent implements OnInit {

  constructor(private service: CobrosRecurrentesService, private pagosService: PagosRecurrentesService) { }

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

  // Acordeón de secciones (v10): solo una abierta a la vez; null = todas cerradas.
  seccionActiva: 'recurrentes' | 'movimientos' | 'programacion' | null = 'recurrentes';

  toggleSeccion(s: 'recurrentes' | 'movimientos' | 'programacion') {
    this.seccionActiva = (this.seccionActiva === s ? null : s);
  }

  // movimiento_id de las filas extra seleccionadas para la programación (v13:
  // la selección se guarda en la base y se carga desde fila.incluido).
  extrasSeleccionadas = new Set<number>();

  // En pantalla, los recurrentes van en su propia sección; los cobros del mes
  // que no pertenecen a ningún recurrente van en la sección
  // "Movimientos financieros del mes" (v9).
  get filasRecurrentes(): ReporteFila[] {
    return this.filas.filter(f => f.origen === 'recurrente');
  }

  // Filas extra del reporte: movimientos del mes que no casan con ningún
  // recurrente (sección 2, v9).
  get filasExtras(): ReporteFila[] {
    return this.filas.filter(f => f.origen === 'factura');
  }

  get totalesRecurrentes(): { fiscal: number; no_fiscal: number } {
    return this.filasRecurrentes.reduce(
      (t, f) => ({ fiscal: t.fiscal + (Number(f.fiscal) || 0), no_fiscal: t.no_fiscal + (Number(f.no_fiscal) || 0) }),
      { fiscal: 0, no_fiscal: 0 }
    );
  }

  // Programación del Ingreso (sección 3, v9): todos los recurrentes + las
  // extras seleccionadas en la sección 2, en el orden que trae el back
  // (mezclado por fecha; el front NO reordena). Es lo que se exporta al Excel.
  get filasProgramacion(): ReporteFila[] {
    return this.filas.filter(f => {
      if (f.origen === 'recurrente') return true;
      // Extra sin movimiento_id (back sin el campo nuevo): no se puede
      // deseleccionar, va como antes.
      if (f.movimiento_id == null) return true;
      return this.extrasSeleccionadas.has(f.movimiento_id);
    });
  }

  // Alias: lo que se exporta al Excel es la programación (v9).
  get filasExportar(): ReporteFila[] {
    return this.filasProgramacion;
  }

  get totalesExportar(): { fiscal: number; no_fiscal: number } {
    return this.filasProgramacion.reduce(
      (t, f) => ({ fiscal: t.fiscal + (Number(f.fiscal) || 0), no_fiscal: t.no_fiscal + (Number(f.no_fiscal) || 0) }),
      { fiscal: 0, no_fiscal: 0 }
    );
  }

  isExtraSeleccionada(f: ReporteFila): boolean {
    if (f.movimiento_id == null) return true;
    return this.extrasSeleccionadas.has(f.movimiento_id);
  }

  toggleExtra(f: ReporteFila, ev: Event) {
    if (f.movimiento_id == null) return;
    const movId = f.movimiento_id;
    const input = ev.target as HTMLInputElement;
    const incluido = input.checked;
    if (incluido) this.extrasSeleccionadas.add(movId);
    else this.extrasSeleccionadas.delete(movId);
    // La selección se guarda en la base (v13): ante error se revierte el cambio local.
    this.service.guardarSeleccion(this.filtroAnio, this.filtroMes, movId, incluido).subscribe({
      error: (err) => {
        if (incluido) this.extrasSeleccionadas.delete(movId);
        else this.extrasSeleccionadas.add(movId);
        input.checked = !incluido;
        Swal.fire('No se pudo guardar', err.error?.message || 'No se pudo guardar la selección.', 'error');
      }
    });
  }

  seleccionarTodasExtras() {
    const anteriores = new Set(this.extrasSeleccionadas);
    this.filas
      .filter(f => f.origen !== 'recurrente' && f.movimiento_id != null)
      .forEach(f => this.extrasSeleccionadas.add(f.movimiento_id as number));
    this.service.guardarSeleccionMes(this.filtroAnio, this.filtroMes, true).subscribe({
      error: (err) => {
        this.extrasSeleccionadas = anteriores;
        Swal.fire('No se pudo guardar', err.error?.message || 'No se pudo guardar la selección.', 'error');
      }
    });
  }

  seleccionarNingunaExtra() {
    const anteriores = new Set(this.extrasSeleccionadas);
    this.extrasSeleccionadas.clear();
    this.service.guardarSeleccionMes(this.filtroAnio, this.filtroMes, false).subscribe({
      error: (err) => {
        this.extrasSeleccionadas = anteriores;
        Swal.fire('No se pudo guardar', err.error?.message || 'No se pudo guardar la selección.', 'error');
      }
    });
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
        Swal.fire('No se pudo guardar', err.error?.message || 'No se pudo marcar el cobro.', 'error');
      }
    });
  }

  // ===== Recurrentes registrados =====
  recurrentes: any[] = [];
  cargandoRecurrentes = false;
  errorRecurrentes: string | null = null;

  // Montos siempre con centavos (v12: Ivo pidió centavos en este reporte).
  get fmtMoneda(): string {
    return '1.2-2';
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
        // Al cargar el mes, la selección viene del back (fila.incluido, v13):
        // incluido false = desmarcada guardada; sin el campo, va marcada como antes.
        this.extrasSeleccionadas = new Set(
          this.filas
            .filter(f => f.origen !== 'recurrente' && f.movimiento_id != null && f.incluido !== false)
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
        this.errorRecurrentes = 'No se pudieron cargar los cobros recurrentes registrados.';
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

  // ===== EXPORTAR EXCEL COMBINADO (v13, diseño de Ivo 2026-11-23) =====
  // Un solo archivo con gastos + cobros + Resumen + mensual estático.
  // El botón de cualquiera de las dos pestañas genera el mismo archivo:
  // se piden AMBOS reportes del mes (pagos + cobros).
  exportarExcel() {
    forkJoin({
      pagos: this.pagosService.reporte(this.filtroAnio, this.filtroMes),
      cobros: this.service.reporte(this.filtroAnio, this.filtroMes)
    }).subscribe({
      next: ({ pagos, cobros }) => {
        const filasGasto = filtrarProgramacion(extraerFilas(pagos));
        const filasIngreso = filtrarProgramacion(extraerFilas(cobros));
        exportarExcelCombinado(filasGasto, filasIngreso, this.mesAnioTitulo);
      },
      error: () => {
        Swal.fire('No se pudo exportar', 'No se pudo cargar el reporte del mes para armar el Excel.', 'error');
      }
    });
  }

  // ===== MODAL (nuevo / editar) =====
  showModal = false;
  editando = false;
  idEditando: number | null = null;
  guardando = false;
  errorModal: string | null = null;

  form: CobroRecurrenteDto = {
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

  // ===== Buscar factura (varias facturas por cobro recurrente) =====
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
    const dto: CobroRecurrenteDto = {
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
        this.errorModal = err.error?.message || 'No se pudo guardar el cobro recurrente.';
      }
    });
  }

  // ===== ELIMINAR (mismo patrón SweetAlert2 que finanzas) =====
  eliminar(p: any) {
    Swal.fire({
      title: '¿Eliminar cobro recurrente?',
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
              text: 'El cobro recurrente fue eliminado correctamente.',
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
