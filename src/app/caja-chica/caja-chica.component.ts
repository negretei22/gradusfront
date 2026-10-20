import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';
import { CajaChicaService } from '../services/caja-chica.service';
import { AlertsService } from '../core/alerts.service';

@Component({
  selector: 'app-caja-chica',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './caja-chica.component.html',
  styleUrl: './caja-chica.component.css'
})
export class CajaChicaComponent implements OnInit {

  constructor(
    private cajaChicaService: CajaChicaService,
    private alert: AlertsService
  ) { }

  movimientos: any[] = [];
  movimientosFiltrados: any[] = [];

  tab: 'todos' | 'gasto' | 'ingreso' = 'todos';

  filtroAnio: number = new Date().getFullYear();
  filtroMes: number = new Date().getMonth() + 1;
  mesesVisibles: any[] = [];

  meses = [
    { value: 1, text: 'ENERO' }, { value: 2, text: 'FEBRERO' }, { value: 3, text: 'MARZO' },
    { value: 4, text: 'ABRIL' }, { value: 5, text: 'MAYO' }, { value: 6, text: 'JUNIO' },
    { value: 7, text: 'JULIO' }, { value: 8, text: 'AGOSTO' }, { value: 9, text: 'SEPTIEMBRE' },
    { value: 10, text: 'OCTUBRE' }, { value: 11, text: 'NOVIEMBRE' }, { value: 12, text: 'DICIEMBRE' }
  ];

  // ===== CARDS (igual que TOTAL de tu excel) =====
  totalGasto = 0;
  totalIngreso = 0;
  saldoActual = 0;

  // ===== MODAL =====
  showModal = false;
  editing = false;
  titulo = 'Nuevo Movimiento';
  textoBoton = 'Guardar';

  showDetalle = false;
  detalle: any = null;
  cargandoDetalle = false;

  id: number = 0;
  fecha: string = '';
  concepto: string = '';
  tipo_movimiento: 'gasto' | 'ingreso' = 'gasto';
  monto: number | null = null;
  capturo: string = '';
  readonly urlArchivos = 'http://localhost:3000/uploads/movimientos/';

  @HostListener('document:keydown.escape')
  onEscapePress() {
    if (this.showDetalle) this.cerrarDetalle();
  }

  ngOnInit() {
    const hoy = new Date();
    this.filtroAnio = hoy.getFullYear();
    this.filtroMes = hoy.getMonth() + 1;
    this.mesesVisibles = this.meses.filter(m => m.value <= this.filtroMes);

    this.cargarMovimientos();
    this.cargarTotales();
  }

  abrirDetalle(id: number) {
    this.detalle = null;
    this.cargandoDetalle = true;
    this.showDetalle = true;

    this.cajaChicaService.getMovimientoFinanciero(id).subscribe({
      next: res => { this.detalle = res; this.cargandoDetalle = false; },
      error: () => { this.cargandoDetalle = false; }
    });
  }


  obtenerArchivos(valor: string | null | undefined): string[] {
    if (!valor || valor === 'null') {
      return [];
    }

    try {
      const archivos = typeof valor === 'string'
        ? JSON.parse(valor)
        : valor;

      if (Array.isArray(archivos)) {
        return archivos.filter(
          (archivo): archivo is string =>
            typeof archivo === 'string' && archivo.trim() !== ''
        );
      }

      // Por si la API devuelve un solo nombre en lugar de un arreglo
      return typeof archivos === 'string' && archivos.trim()
        ? [archivos]
        : [];
    } catch {
      // Si el campo contiene un nombre sin formato JSON
      return [valor];
    }
  }

  // Construye la URL del archivo
  urlArchivo(nombre: string): string {
    return this.urlArchivos + encodeURIComponent(nombre);
  }

  cerrarDetalle() {
    this.showDetalle = false;
    this.detalle = null;
  }

  seleccionarMes(mes: number) {
    this.filtroMes = mes;
    this.cargarMovimientos();
    this.cargarTotales();
  }

  cambiarTab(nuevoTab: 'todos' | 'gasto' | 'ingreso') {
    this.tab = nuevoTab;
  }

  refrescar() {
    this.cargarMovimientos();
    this.cargarTotales();
  }

  movimientosVisibles(): any[] {
    if (this.tab === 'todos') return this.movimientosFiltrados;
    if (this.tab === 'gasto') return this.movimientosFiltrados.filter(m => Number(m.gasto) > 0);
    return this.movimientosFiltrados.filter(m => Number(m.ingreso) > 0);
  }

  cargarMovimientos() {
    this.cajaChicaService.getMovimientos(this.filtroAnio, this.filtroMes)
      .subscribe(res => {
        this.movimientos = res;
        this.movimientosFiltrados = [...this.movimientos];
      });
  }

  cargarTotales() {
    this.cajaChicaService.getSaldo(this.filtroAnio, this.filtroMes)
      .subscribe(res => {
        this.totalGasto = res.total_gasto;
        this.totalIngreso = res.total_ingreso;
        this.saldoActual = res.saldo_actual;
      });
  }



  
  formatearFecha(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  editMovimiento(m: any) {
    this.editing = true;
    this.titulo = 'Editar Movimiento';
    this.textoBoton = 'Actualizar';

    this.id = m.id!;
    this.fecha = m.fecha.split('T')[0];
    this.concepto = m.concepto;
    this.capturo = m.capturo;
    this.tipo_movimiento = Number(m.gasto) > 0 ? 'gasto' : 'ingreso';
    this.monto = Number(m.gasto) > 0 ? Number(m.gasto) : Number(m.ingreso);

    this.showModal = true;
  }




 

  // ===== EXPORTAR EXCEL (igual formato a tu hoja) =====
  exportarExcel() {

    const headers = ['No.', 'FECHA', 'CONCEPTO', 'GASTO (-)', 'INGRESO (+)', 'SALDO ACTUAL', 'CAPTURÓ'];

    const ordenados = [...this.movimientosFiltrados].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    const rows = ordenados.map((m, i) => [
      i + 1,
      m.fecha?.split('T')[0],
      m.concepto,
      Number(m.gasto) || 0,
      Number(m.ingreso) || 0,
      Number(m.saldo_actual) || 0,
      m.capturo
    ]);

    const sheetData = [
      ['', '', 'TOTAL', this.totalGasto, this.totalIngreso, this.saldoActual, ''],
      [],
      headers,
      ...rows
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Caja Chica');

    const ref = worksheet['!ref'];
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      const moneyCols = [3, 4, 5];
      for (let R = range.s.r; R <= range.e.r; R++) {
        moneyCols.forEach(C => {
          const cell = XLSX.utils.encode_cell({ r: R, c: C });
          if (worksheet[cell] && typeof worksheet[cell].v === 'number') {
            worksheet[cell].z = '$#,##0.00';
          }
        });
      }
    }

    const mesSeleccionado = this.mesesVisibles.find(m => m.value === this.filtroMes);
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    saveAs(blob, `Caja Chica ${mesSeleccionado?.text || 'SinMes'}.xlsx`);
  }
}