import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FinanzasService } from '../services/finanzas.service';
import { AuthService } from '../core/services/auth.service';
import { Router } from '@angular/router';
import { HostListener } from '@angular/core';
import * as XLSX from 'xlsx-js-style';


interface Movimiento {
  id: number;
  fecha_pago: string;
  fecha_factura: string;
  razon_social: string;
  concepto: string;
  importe_sin_iva: number;
  metodo_pago_id: number;
  donde_aplica?: number | string;
}

@Component({
  selector: 'app-obra-puerto-penasco',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './obra-puerto-penasco.component.html',
  styleUrl: './obra-puerto-penasco.component.css'
})


export class ObraPuertoPenascoComponent implements OnInit {



  movimientos: any[] = [];
  mostrarDetalle: 'general' | 'penasco' | 'hermosillo' | null = null;
  metodoPagoFiltro: number = 0;
  donde_aplica?: number | string;

  puedeVer = false;

  tiposArchivo = [
    { key: 'factura', label: 'Factura' },
    { key: 'pago', label: 'Comprobante de Pago' },
  ];

  mostrarMenuArchivos: number | null = null;

  filtroAnio: number = new Date().getFullYear();
  filtroMes: number = new Date().getMonth() + 1; // mes actual por defecto
  origenFiltro: 'todos' | 'penasco' | 'hermosillo' = 'todos';

  meses = [
    { value: 0, text: 'TODOS' },
    { value: 1, text: 'ENERO' },
    { value: 2, text: 'FEBRERO' },
    { value: 3, text: 'MARZO' },
    { value: 4, text: 'ABRIL' },
    { value: 5, text: 'MAYO' },
    { value: 6, text: 'JUNIO' },
    { value: 7, text: 'JULIO' },
    { value: 8, text: 'AGOSTO' },
    { value: 9, text: 'SEPTIEMBRE' },
    { value: 10, text: 'OCTUBRE' },
    { value: 11, text: 'NOVIEMBRE' },
    { value: 12, text: 'DICIEMBRE' }
  ];

  get mesesVisibles() {
    const mesActual = new Date().getMonth() + 1; // 1-12
    return this.meses.filter(m => m.value === 0 || m.value <= mesActual);
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    this.mostrarMenuArchivos = null;

  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.mostrarMenuArchivos === null) return;

    const target = event.target as HTMLElement;
    if (!target.closest('.archivos-indicador')) {
      this.mostrarMenuArchivos = null;
    }
  }



  constructor(private finanzasService: FinanzasService,
    private authService: AuthService,
    private router: Router

  ) { }

  ngOnInit(): void {
    this.cargarMovimientos();
    this.authService.getPermisos('finanzas').subscribe({
      next: (permisos) => {
        this.puedeVer = permisos.puedeVer;

      },
      error: () => {
        this.router.navigate(['/unauthorized']);
      }
    });

  }

  seleccionarMes(mesValue: number): void {
    this.filtroMes = mesValue;
    this.cargarMovimientos();
  }

  cargarMovimientos(): void {
    this.finanzasService
      .getMovimientosPorCategoria(17, 2, this.filtroAnio, this.filtroMes)
      .subscribe({
        next: (data) => this.movimientos = data,
        error: (err) => console.error('Error cargando movimientos de Puerto Peñasco:', err)
      });
  }

  toggleDetalle(tipo: 'general' | 'penasco' | 'hermosillo'): void {
    this.mostrarDetalle = this.mostrarDetalle === tipo ? null : tipo;
    this.origenFiltro = 'todos'; // reinicia el sub-filtro

  }


  exportarExcel(): void {
    const datos = this.movimientosVisibles();

    const filas = datos.map((m: Movimiento, i: number) => ({
      '#': i + 1,
      'Fecha Pago': this.formatearFecha(m.fecha_pago),
      'Fecha Factura': this.formatearFecha(m.fecha_factura),
      'Razón Social': m.razon_social,
      'Concepto': m.concepto,
      'Monto': Number(m.importe_sin_iva || 0),
      'Método de Pago': this.nombreMetodoPago(m.metodo_pago_id),
      'Ubicación': Number(m.donde_aplica) === 1 ? 'PUERTO PEÑASCO'
        : Number(m.donde_aplica) === 2 ? 'HERMOSILLO' : ''
    }));

    const ws = XLSX.utils.json_to_sheet(filas);

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 14 }, { wch: 30 },
      { wch: 45 }, { wch: 14 }, { wch: 16 }, { wch: 18 }
    ];

    // Formato de moneda en la columna Monto (F)
    for (let r = 2; r <= filas.length + 1; r++) {
      const celda = ws[`F${r}`];
      if (celda) celda.z = '"$"#,##0.00';
    }

    const rango = XLSX.utils.decode_range(ws['!ref']!);
    for (let c = rango.s.c; c <= rango.e.c; c++) {
      const celda = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (celda) {
        celda.s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '0B5D3B' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');

    const mes = this.meses.find(x => x.value === this.filtroMes)?.text ?? '';
    XLSX.writeFile(wb, `Gastos_Puerto_Penasco_${mes}_${this.filtroAnio}.xlsx`);
  }

  private formatearFecha(valor: string): string {
    if (!valor) return '';
    const anio = formatDate(valor, 'yyyy', 'en-US');
    if (anio === '1899') return 'SIN FECHA';
    if (anio === '1900') return 'NO APLICA';
    return formatDate(valor, 'dd/MM/yyyy', 'en-US');
  }

  private nombreMetodoPago(id: number | string): string {
    switch (Number(id)) {
      case 1: return 'EFECTIVO';
      case 2: return 'TRANSFERENCIA ELECTRÓNICA';
      case 3: return 'TARJETA DE DÉBITO';
      case 4: return 'CHEQUE';
      case 5: return 'TARJETA DE CRÉDITO';
      default: return '';
    }
  }

  get movimientosPenasco(): any[] {
    return this.movimientos.filter(m => Number(m.donde_aplica) === 1);
  }

  get movimientosHermosillo(): any[] {
    return this.movimientos.filter(m => Number(m.donde_aplica) === 2);
  }

  get gastoGeneral(): number {
    return this.movimientos
      .reduce((sum, m) => sum + Number(m.importe_sin_iva || 0), 0);
  }

  get gastoPenasco(): number {
    return this.movimientosPenasco
      .reduce((sum, m) => sum + Number(m.importe_sin_iva || 0), 0);
  }

  get gastoHermosillo(): number {
    return this.movimientosHermosillo
      .reduce((sum, m) => sum + Number(m.importe_sin_iva || 0), 0);
  }

  movimientosVisibles(): Movimiento[] {
    let lista: Movimiento[] = this.movimientos;

    if (this.mostrarDetalle === 'general' && this.origenFiltro !== 'todos') {
      lista = lista.filter((m: Movimiento) => this.esDeOrigen(m, this.origenFiltro));
    }

    if (this.metodoPagoFiltro !== 0) {
      lista = lista.filter((m: Movimiento) => m.metodo_pago_id === this.metodoPagoFiltro);
    }

    return lista;
  }

  esDeOrigen(m: Movimiento, origen: string): boolean {
    const donde = Number(m.donde_aplica);
    return origen === 'penasco' ? donde === 1 : donde === 2;
  }


  private parseArchivosCampo(val: string): string[] {
    if (!val) return [];
    try {
      const arr = JSON.parse(val);
      return Array.isArray(arr) ? arr : [];
    } catch {
      // Fallback para registros viejos guardados como texto separado por comas
      return val.split(',').map(x => x.trim()).filter(Boolean);
    }
  }

  contarArchivos(m: any): number {
    return this.tiposArchivo.reduce((acc, t) => {
      const val = m[`archivo_${t.key}`];
      if (!val) return acc;
      const arr = this.parseArchivosCampo(val);
      return acc + arr.length;
    }, 0);
  }

  archivosDeMovimiento(m: any) {
    const result: { label: string, archivo: string }[] = [];

    this.tiposArchivo.forEach(t => {
      const val = m[`archivo_${t.key}`];
      if (!val) return;
      const arr = this.parseArchivosCampo(val);

      arr.forEach((a: string, index: number) => {
        result.push({ label: `${t.label} ${index + 1}`, archivo: a });
      });
    });

    return result;
  }

  toggleMenuArchivos(id: number) {
    this.mostrarMenuArchivos = this.mostrarMenuArchivos === id ? null : id;
  }

  verArchivo(nombre: string) {
    window.open(`http://localhost:3000/uploads/movimientos/${nombre}`, '_blank');
  }

  esPDF(nombre: string): boolean {
    return nombre?.toLowerCase().endsWith('.pdf');
  }

  esImagen(nombre: string): boolean {
    return !!nombre?.match(/\.(jpg|jpeg|png|gif)$/i);
  }
}