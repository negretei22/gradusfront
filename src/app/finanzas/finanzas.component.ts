import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';
import { FinanzasService } from '../services/finanzas.service';
import { AlertsService } from '../core/alerts.service';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import JSZip from "jszip";
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { DragDropModule } from '@angular/cdk/drag-drop';
import {
  CdkDragDrop,
  moveItemInArray
} from '@angular/cdk/drag-drop';
import { HostListener } from '@angular/core';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { PDFDocument } from 'pdf-lib';
import { AuthService } from '../core/services/auth.service';
import { Router } from '@angular/router';




@Component({
  selector: 'app-finanzas',
  imports: [CommonModule, FormsModule, NgxMaskDirective, DragDropModule],
  templateUrl: './finanzas.component.html',
  styleUrl: './finanzas.component.css'
})



export class FinanzasComponent implements OnInit {

  puedeVer = false;
  puedeEditar = false;
  puedeEliminar = false;


  private busquedaRazonSocial$ = new Subject<string>();
  private busquedaConcepto$ = new Subject<string>();
  resultadosBusqueda: any[] = [];
  resultadosConceptos: any[] = [];



  @HostListener('document:keydown.escape')
  onEscapePress() {
    this.mostrarMenuArchivos = null;
    if (this.showModal) {
      this.closeModal();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.mostrarMenuArchivos === null) return;

    const target = event.target as HTMLElement;
    if (!target.closest('.archivos-indicador')) {
      this.mostrarMenuArchivos = null;
    }
  }

  constructor(
    private finanzasService: FinanzasService,
    private alert: AlertsService,
    private authService: AuthService,
    private router: Router
  ) { }


  movimientos: any[] = []
  titulo: string = 'Nuevo Movimento Financiero'
  id: number = 0;
  textoBoton: string = 'Guardar'
  razon_social: string = ''
  rfc: string = ''
  folio_fiscal: string = ''
  editing: boolean = false
  filtroMovimiento: string = ''
  movimientosFiltrados: any[] = []
  showModal = false
  tipo_movimiento_id: number = 0
  fecha_pago: string = '0000-00-00'
  fecha_factura: string = '0000-00-00'
  concepto: string = ''
  importe_sin_iva: number | null = null;
  iva_acreditable: number | null = null;
  iva_traslado: number = 0;
  isr_retenido: number | null = null;
  iva_retenido: number | null = null;
  granTotal: number | null = null;
  filtroAnio: number = 2026;
  filtroMes: number = new Date().getMonth() + 1;
  categoria_id: any = '';
  categorias: any[] = []
  metodo_pago_id: any = '';
  metodosPago: any[] = []
  ingresos = 0;
  egresos = 0;
  inversiones = 0;
  saldo = 0;
  iva: number = 16; // default
  tab = 'todos';
  cargandoFormulario = false;
  mesesVisibles: any[] = [];
  metodoPagoFiltro: number = 0;
  expandidoKey: string | null = null;


  tiposArchivo = [
    { key: 'factura', label: 'Factura' },
    { key: 'pago', label: 'Comprobante de Pago' },
  ];


  archivos: { [key: string]: File[] } = {
    factura: [], pago: []
  };
  archivosNombre: { [key: string]: string[] } = {
    factura: [], pago: []
  };
  archivosActuales: { [key: string]: string[] } = {
    factura: [], pago: []
  };
  dragging: { [key: string]: boolean } = {
    factura: false, pago: false
  };





  toggleExpandido(key: string, event: Event): void {
    event.stopPropagation();
    this.expandidoKey = this.expandidoKey === key ? null : key;
    console.log('Expandido ahora:', this.expandidoKey);
  }

  trackByKey(index: number, item: any): string {
    return item.key;
  }

  // ===== FILTRO COMBINADO PARA LA TABLA (tab + método de pago) =====
  movimientosVisibles(): any[] {
    const base = this.tab === 'todos' ? this.movimientos : this.movimientosFiltradosTabs();
    return this.metodoPagoFiltro === 0
      ? base
      : base.filter(m => m.metodo_pago_id == this.metodoPagoFiltro);
  }

  private coincideMetodoPago(m: any): boolean {
    return this.metodoPagoFiltro === 0 || m.metodo_pago_id == this.metodoPagoFiltro;
  }

  private coincideTab(tipo: 'ingreso' | 'egreso' | 'nomina' | 'inversion'): boolean {
    return this.tab === 'todos' || this.tab === tipo;
  }

  get ingresosCard(): number {
    if (!this.coincideTab('ingreso')) return 0;
    return this.movimientos
      .filter(m => m.tipo_movimiento_id == 1 && this.coincideMetodoPago(m))
      .reduce((sum, m) => sum + Number(m.importe_sin_iva || 0), 0);
  }

  get nominaCard(): number {
    if (!this.coincideTab('nomina')) return 0;
    return this.movimientos
      .filter(m => m.tipo_movimiento_id == 2 && m.categoria_id == 2 && this.coincideMetodoPago(m))
      .reduce((sum, m) => sum + Number(m.importe_sin_iva || 0), 0);
  }

  get egresosCard(): number {
    if (!this.coincideTab('egreso')) return 0;
    return this.movimientos
      .filter(m => m.tipo_movimiento_id == 2 && m.categoria_id != 2 && this.coincideMetodoPago(m))
      .reduce((sum, m) => sum + Number(m.importe_sin_iva || 0), 0);
  }

  get inversionesCard(): number {
    if (!this.coincideTab('inversion')) return 0;
    return this.movimientos
      .filter(m => m.tipo_movimiento_id != 1 && m.tipo_movimiento_id != 2 && this.coincideMetodoPago(m))
      .reduce((sum, m) => sum + Number(m.importe_sin_iva || 0), 0);
  }

  get saldoCard(): number {
    return this.ingresosCard - this.egresosCard - this.nominaCard;
  }

  cambiarTab(nuevoTab: string) {
    this.tab = nuevoTab;
    this.metodoPagoFiltro = 0; // reset a "TODOS" cada vez que cambias de tab
  }

  async drop(event: CdkDragDrop<any[]>) {

    moveItemInArray(
      this.movimientos,
      event.previousIndex,
      event.currentIndex
    );

    // Reasignar orden localmente a TODOS los registros visibles
    const items = this.movimientos.map((m, i) => {
      m.orden = i + 1;
      return { id: m.id, orden: m.orden };
    });

    try {
      await this.finanzasService.updateOrdenMasivo(items);
    } catch (err) {
      console.error('Error actualizando orden', err);
      // opcional: revertir el drag si falla, o mostrar toast de error
    }
  }




  seleccionarMes(mes: number) {
    this.filtroMes = mes;
    this.inicializarFechas();
    this.cargarMovimientos();
    this.getSaldo(this.filtroAnio, mes)
  }

  onCategoriaChange() {
    if (+this.categoria_id === 10) {
      this.fecha_factura = '1900-01-01'; // fecha sentinela para "NO APLICA"
    }
  }

  movimientosFiltradosTabs() {

    if (this.tab === 'ingreso') {
      return this.movimientosFiltrados.filter(m =>
        m.tipo_movimiento_id == 1
      );
    }

    if (this.tab === 'nomina') {
      return this.movimientosFiltrados.filter(m =>
        m.tipo_movimiento_id == 2 && m.categoria_id == 2
      );
    }

    if (this.tab === 'egreso') {
      return this.movimientosFiltrados.filter(m =>
        m.tipo_movimiento_id == 2 && m.categoria_id != 2
      );
    }

    if (this.tab === 'inversion') {
      return this.movimientosFiltrados.filter(m =>
        m.tipo_movimiento_id != 1 && m.tipo_movimiento_id != 2
      );
    }

    return [];
  }


  meses = [
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


  esPDF(nombre: string) {
    return nombre?.toLowerCase().endsWith('.pdf');
  }

  onDragOver(event: DragEvent, key: string) {
    event.preventDefault();
    this.dragging[key] = true;
  }

  onDragLeave(event: DragEvent, key: string) {
    event.preventDefault();
    this.dragging[key] = false;
  }

  onFileSelected(event: any, key: string) {
    const files: FileList = event.target.files;
    if (files && files.length) {
      for (let i = 0; i < files.length; i++) {
        this.archivos[key].push(files[i]);
        this.archivosNombre[key].push(files[i].name);
      }
    }
    event.target.value = '';
  }

  onDrop(event: DragEvent, key: string) {
    event.preventDefault();
    this.dragging[key] = false;

    if (event.dataTransfer?.files.length) {
      const files = event.dataTransfer.files;
      for (let i = 0; i < files.length; i++) {
        this.archivos[key].push(files[i]);
        this.archivosNombre[key].push(files[i].name);
      }
    }
  }

  removeArchivo(key: string, index: number) {
    this.archivos[key].splice(index, 1);
    this.archivosNombre[key].splice(index, 1);
  }

  removeArchivoActual(key: string, index: number) {
    this.archivosActuales[key].splice(index, 1);
  }


  esImagen(nombre: string) {
    return nombre?.match(/\.(jpg|jpeg|png|gif)$/i);
  }

  o(nombre: string) {
    window.open(`http://localhost:3000/uploads/movimientos/${nombre}`, '_blank');
  }



  contarArchivos(m: any): number {
    return this.tiposArchivo.reduce((acc, t) => {
      const val = m[`archivo_${t.key}`];
      if (!val) return acc;
      const arr = Array.isArray(val) ? val : val.split(',').filter((x: string) => x.trim());
      return acc + arr.length;
    }, 0);
  }


  archivosDeMovimiento(m: any) {
    const result: { label: string, archivo: string }[] = [];

    this.tiposArchivo.forEach(t => {
      const val = m[`archivo_${t.key}`];
      if (!val) return;
      const arr = Array.isArray(val) ? val : val.split(',').filter((x: string) => x.trim());

      arr.forEach((a: string, index: number) => {
        result.push({ label: `${t.label} ${index + 1}`, archivo: a });
      });
    });

    return result;
  }

  mostrarMenuArchivos: number | null = null;

  toggleMenuArchivos(id: number) {
    this.mostrarMenuArchivos = this.mostrarMenuArchivos === id ? null : id;
  }


  openModal() {
    this.resetForm()
    this.showModal = true
    this.getMetodosPago()
    this.inicializarFechas()
  }

  inicializarFechas() {
    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;

    let fecha: Date;

    if (this.filtroMes === mesActual) {
      const ultimoDiaMes = new Date(anioActual, this.filtroMes, 0).getDate();
      const diaFinal = Math.min(hoy.getDate(), ultimoDiaMes);
      fecha = new Date(anioActual, this.filtroMes - 1, diaFinal);
    } else {
      fecha = new Date(anioActual, this.filtroMes - 1, 1);
    }

    this.fecha_pago = this.formatearFecha(fecha);

  }

  formatearFecha(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
  }

  cargaCategorias(id_categoria: number) {
    this.getCategorias(id_categoria)
  }


  cargarMovimientos() {
    this.finanzasService.getMovimientos(this.filtroAnio, this.filtroMes)
      .subscribe(res => {
        this.movimientos = res as any[];
        this.movimientosFiltrados = [...this.movimientos];
      });
  }


  calcularTotal() {

    if (this.cargandoFormulario) return;

    const m = Number(this.importe_sin_iva) || 0;
    const ivaNum = Number(this.iva) || 0;
    const m2 = Number(this.iva_acreditable) || 0;
    const m3 = Number(this.iva_traslado) || 0;
    const m4 = Number(this.isr_retenido) || 0;
    const m5 = Number(this.iva_retenido) || 0;

    const ivaCalc = m * ivaNum / 100;

    if (this.tipo_movimiento_id == 1) {
      this.iva_traslado = ivaCalc;
    } else {
      this.iva_acreditable = ivaCalc;
    }

    this.granTotal = m + m2 + m3 - m4 - m5;
  }


  filtrarMovimientos() {

  }

  resetForm() {
    this.id = 0
    this.inicializarFechas()
    this.tiposArchivo.forEach(t => {
      this.archivos[t.key] = [];
      this.archivosNombre[t.key] = [];
      this.archivosActuales[t.key] = [];
    });
    this.tipo_movimiento_id = 0;
    this.categoria_id = '';
    this.editing = false;
    this.titulo = 'Nuevo Movimento Financiero';
    this.textoBoton = 'Guardar';

    this.folio_fiscal = '';
    this.rfc = '';
    this.razon_social = '';
    this.concepto = '';

    this.metodo_pago_id = '';
    this.importe_sin_iva = null
    this.iva = 16;
    this.iva_acreditable = null
    this.iva_traslado = 0
    this.isr_retenido = null
    this.iva_retenido = null

    this.granTotal = null
  }

  ngAfterViewInit() {
    const hoy = new Date();

    this.filtroAnio = hoy.getFullYear();
    this.filtroMes = (hoy.getMonth() + 1);

    this.getMetodosPago();

    setTimeout(() => {
      this.cargarMovimientos();
      this.getSaldo(this.filtroAnio, this.filtroMes);
    });
  }


  ngOnInit() {

    this.authService.getPermisos('finanzas').subscribe({
      next: (permisos) => {
        this.puedeVer = permisos.puedeVer;
        this.puedeEditar = permisos.puedeEditar;
        this.puedeEliminar = permisos.puedeEliminar;
      },
      error: () => {
        this.router.navigate(['/unauthorized']);
      }
    });

    this.busquedaRazonSocial$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(texto => {
        if (texto && texto.length > 3) {
          return this.finanzasService.buscarPorRazonSocial(texto);
        }
        this.resultadosBusqueda = [];
        return of([]);
      })
    ).subscribe(resultados => {
      this.resultadosBusqueda = resultados;
    });

    this.busquedaConcepto$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(texto => {
        if (this.rfc) {
          return this.finanzasService.buscarConceptosPorRfc(this.rfc, texto);
        }
        return of([]);
      })
    ).subscribe(resultados => {
      this.resultadosConceptos = resultados;
    });

    this.getSaldo(this.filtroAnio, this.filtroMes)

    const mesActual = new Date().getMonth() + 1;
    this.mesesVisibles = this.meses.filter(
      m => m.value <= mesActual
    );

  }


  onRazonSocialChange(event: any): void {
    this.busquedaRazonSocial$.next(event.target.value);
  }

  seleccionarResultado(item: any): void {
    this.razon_social = item.razon_social;
    this.rfc = item.rfc;
    this.resultadosBusqueda = [];
  }

  onConceptoFocus(): void {
    if (this.rfc) {
      this.busquedaConcepto$.next(this.concepto || '');
    }
  }

  onConceptoChange(event: any): void {
    this.busquedaConcepto$.next(event.target.value);
  }

  onConceptoEnter(): void {
    this.resultadosConceptos = [];
  }

  onConceptoBlur(): void {
    setTimeout(() => {
      this.resultadosConceptos = [];
    }, 150);
  }

  seleccionarConcepto(item: any): void {
    this.concepto = item.concepto;
    this.resultadosConceptos = [];
  }


  async editMovimiento(id: number) {

    this.cargandoFormulario = true;
    const data: any = await firstValueFrom(
      this.finanzasService.getMovimientoById(id)
    );

    this.editing = true;
    this.id = data.id;
    this.titulo = 'Editar Movimiento Financiero';
    this.textoBoton = 'Actualizar';

    this.getMetodosPago();
    this.tipo_movimiento_id = +data.tipo_movimiento_id;
    this.getCategorias(this.tipo_movimiento_id);

    this.categoria_id = +data.categoria_id;
    this.fecha_pago = data.fecha_pago.split('T')[0];
    this.fecha_factura = data.fecha_factura.split('T')[0];
    this.folio_fiscal = data.folio_fiscal;
    this.rfc = data.rfc;
    this.razon_social = data.razon_social;
    this.concepto = data.concepto;
    this.iva = data.iva;
    this.importe_sin_iva = data.importe_sin_iva;
    this.iva_acreditable = data.iva_acreditable;
    this.iva_traslado = Number(data.iva_traslado);
    this.granTotal = data.gran_total;

    this.isr_retenido = data.isr_retenido;
    this.metodo_pago_id = data.metodo_pago_id;

    this.tiposArchivo.forEach(t => {
      const campo = `archivo_${t.key}`;
      if (data[campo]) {
        this.archivosActuales[t.key] = Array.isArray(data[campo])
          ? data[campo]
          : data[campo].split(',').map((x: string) => x.trim()).filter(Boolean);
      } else {
        this.archivosActuales[t.key] = [];
      }
    });

    setTimeout(() => {
      this.cargandoFormulario = false;
    });

    this.showModal = true;
  }


  deleteMovimiento(id: number) {

    Swal.fire({
      title: '¿Eliminar movimiento?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545'
    }).then((result) => {

      if (result.isConfirmed) {

        this.finanzasService.deleteMovimiento(id).subscribe(() => {

          Swal.fire({
            title: 'Eliminado',
            text: 'El movimiento fue eliminado correctamente.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });

          this.cargarMovimientos();

        });

      }

    });

  }

  async getCategorias(id_categoria: number) {

    await this.finanzasService.getCategorias(id_categoria).subscribe(res => {
      this.categorias = res;
    });
  }


  verArchivo(nombre: string) {
    console.log(nombre)
    window.open(`http://localhost:3000/uploads/movimientos/${nombre}`, '_blank');
  }


  async getSaldo(anio: number, mes: number) {
    await this.finanzasService.getSaldo(anio, mes).subscribe((res: any) => {
      this.ingresos = res.ingresos;
      this.egresos = res.egresos;
      this.inversiones = res.inversiones;
      this.saldo = res.saldo;
    });
  }

  async getMetodosPago() {

    await this.finanzasService.getCatalogo('metodos_pago').subscribe(res => {
      this.metodosPago = res;
    });
  }



  async exportarExcel() {

    const headers = [
      "No.", "TIPO DE MOVIMIENTO", "FECHA DE PAGO", "FECHA DE FACTURA",
      "FOLIO FISCAL", "FOLIO COMPLEMENTO FISCAL", "RFC EMISOR", "NOMBRE O RAZÓN SOCIAL DEL EMISOR",
      "CONCEPTO", "IMPORTE SIN IVA (BASE ISR)", "IVA Acreditable (Pagado)",
      "IVA Trasladado (Cobrado)", "ISR Retenido", "IVA Retenido", "TOTAL", "MÉTODO DE PAGO"
    ];


    const getTipoMovimientoLabel = (tipoId: any): string => {
      return tipoId == 1 ? 'INGRESO' :
        tipoId == 2 ? 'EGRESO' : 'INVERSIÓN';
    };

    const getMetodoPagoLabel = (metodoId: any): string => {
      const metodos: Record<number, string> = {
        1: 'EFECTIVO',
        2: 'TRANSFERENCIA',
        3: 'TARJETA DE DÉBITO',
        4: 'CHEQUE',
        5: 'TARJETA DE CRÉDITO'
      };
      return metodos[Number(metodoId)] || '';
    };

    const formatRow = (m: any, index: number) => {
      const importe = Number(m.importe_sin_iva || 0);
      const ivaAcred = Number(m.iva_acreditable || 0);
      const ivaTras = Number(m.iva_traslado || 0);
      const isr = Number(m.isr_retenido || 0);
      const ivaRet = Number(m.iva_retenido || 0);
      const total = importe + ivaAcred + ivaTras - isr - ivaRet;

      return [
        index + 1,
        m.tipo_movimiento_id == 1 ? 'INGRESO' :
          m.tipo_movimiento_id == 2 ? 'EGRESO' : 'INVERSIÓN',
        m.fecha_pago?.split('T')[0],
        (!m.fecha_factura || m.fecha_factura.startsWith('1899')) ? '' : m.fecha_factura.split('T')[0],
        m.folio_fiscal,
        m.folio_complemento_fiscal,
        m.rfc,
        m.razon_social,
        m.concepto,
        importe,
        ivaAcred,
        ivaTras,
        isr,
        ivaRet,
        total,
        m.metodo_pago
      ];
    };

    const movimientosOrdenados = [...this.movimientosFiltrados]
      .sort((a: any, b: any) => a.orden - b.orden);

    const ingresos = movimientosOrdenados.filter((m: any) => m.tipo_movimiento_id == 1);
    const egresos = movimientosOrdenados.filter(
      (m: any) => m.tipo_movimiento_id == 2
    );

    const egresosSinNomina = egresos.filter((m: any) =>
      m.categoria_id !== 2
    );

    const nomina = egresos.filter((m: any) =>
      m.categoria_id == 2
    );

    const inversiones = movimientosOrdenados.filter((m: any) => m.tipo_movimiento_id == 3);

    const sum = (arr: any[], field: string) =>
      arr.reduce((t, m) => t + Number(m[field] || 0), 0);

    const calcTotales = (arr: any[]) => {
      const importe = sum(arr, 'importe_sin_iva');
      const ivaAcred = sum(arr, 'iva_acreditable');
      const ivaTras = sum(arr, 'iva_traslado');
      const isr = sum(arr, 'isr_retenido');
      const ivaRet = sum(arr, 'iva_retenido');
      const total = importe + ivaAcred + ivaTras - isr - ivaRet;
      return { importe, ivaAcred, ivaTras, isr, ivaRet, total };
    };

    const totalIngresos = sum(ingresos, 'importe_sin_iva');
    const totalGastos = sum(egresosSinNomina, 'importe_sin_iva');

    const gastosConIVA = egresos
      .filter((m: any) => Number(m.iva_acreditable) > 0)
      .reduce((t, m) => t + Number(m.importe_sin_iva || 0), 0);

    const ivaTrasladado = sum(ingresos, 'iva_traslado');
    const ivaAcreditable = sum(egresos, 'iva_acreditable');
    const ivaPorPagar = ivaTrasladado - ivaAcreditable;

    const isrRetenido = sum(egresos, 'isr_retenido');
    const ivaRetenido = sum(egresos, 'iva_retenido');

    const sheetData: any[][] = [];
    const emptyRow = () => Array(headers.length).fill("");

    const addSection = (title: string, data: any[]) => {
      sheetData.push([title]);
      sheetData.push(headers);

      data.forEach((m, i) => sheetData.push(formatRow(m, i)));

      const t = calcTotales(data);
      sheetData.push([
        ...emptyRow().slice(0, 8),
        "TOTALES",
        t.importe,
        t.ivaAcred,
        t.ivaTras,
        t.isr,
        t.ivaRet,
        t.total,
        ""
      ]);

      sheetData.push([]);
      sheetData.push([]);
    };

    addSection("INGRESOS", ingresos);
    addSection("EGRESOS", egresosSinNomina);
    addSection("NÓMINA", nomina);

    addSection("INVERSIONES", inversiones);

    sheetData.push(emptyRow());
    sheetData.push(["", "", "", "", "", "", "", "", "TOTALES GENERALES"]);

    sheetData.push([...emptyRow().slice(0, 9), "INGRESOS (+)", totalIngresos]);
    sheetData.push([...emptyRow().slice(0, 9), "GASTOS (-)", totalGastos]);

    sheetData.push(emptyRow());
    sheetData.push([...emptyRow().slice(0, 9), "GASTOS QUE GENERARON IVA", gastosConIVA]);

    sheetData.push(emptyRow());
    sheetData.push(["", "", "", "", "", "", "", "", "IVA"]);

    sheetData.push([...emptyRow().slice(0, 9), "IVA TRASLADADO", ivaTrasladado]);
    sheetData.push([...emptyRow().slice(0, 9), "IVA ACREDITABLE (-)", ivaAcreditable]);
    sheetData.push([...emptyRow().slice(0, 9), "IVA POR PAGAR", ivaPorPagar]);

    sheetData.push(emptyRow());
    sheetData.push(["", "", "", "", "", "", "", "", "RETENCIONES"]);

    sheetData.push([...emptyRow().slice(0, 9), "ISR RETENIDO", isrRetenido]);
    sheetData.push([...emptyRow().slice(0, 9), "IVA RETENIDO", ivaRetenido]);

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Finanzas');

    const ref = worksheet['!ref'];
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      const moneyCols = [9, 10, 11, 12, 13, 14];

      for (let R = range.s.r; R <= range.e.r; R++) {
        moneyCols.forEach(C => {
          const cell = XLSX.utils.encode_cell({ r: R, c: C });
          if (worksheet[cell] && typeof worksheet[cell].v === 'number') {
            worksheet[cell].z = '$#,##0.00';
          }
        });
      }

      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cell = XLSX.utils.encode_cell({ r: R, c: C });
          if (worksheet[cell]) {
            worksheet[cell].s = { font: { name: "Calibri", sz: 8 } };
          }
        }
      }
    }

    const zip = new JSZip();

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const mesSeleccionado = this.mesesVisibles.find(m => m.value === this.filtroMes);
    const nombreArchivoExcel = `Finanzas ${mesSeleccionado?.text || 'SinMes'}.xlsx`;

    zip.file(nombreArchivoExcel, excelBuffer);

    // Una sola carpeta para los PDFs combinados (factura + comprobante)
    const carpetaDocumentos = zip.folder('Documentos');

    const anioMes = `${this.filtroAnio}-${String(this.filtroMes).padStart(2, '0')}`;

    const fixEncoding = (str: string) => decodeURIComponent(escape(str));

    const sanitizar = (str: string) =>
      (str || '').replace(/[\\/:*?"<>|]/g, '-').trim();

    const getExtension = (nombreArchivo: string) => {
      const idx = nombreArchivo.lastIndexOf('.');
      return idx >= 0 ? nombreArchivo.substring(idx).toLowerCase() : '';
    };

    const parseArchivos = (campo: any): string[] => {
      if (!campo) return [];
      return String(campo)
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);
    };

    // Descarga un archivo y devuelve su blob (o null si falla)
    const descargarBlob = async (nombreOriginal: string): Promise<Blob | null> => {
      const url = `http://anvotv.ddns.net:3000/uploads/movimientos/${nombreOriginal}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`No se pudo descargar: ${nombreOriginal}`);
          return null;
        }
        return await response.blob();
      } catch (e) {
        console.warn(`Error descargando ${nombreOriginal}`, e);
        return null;
      }
    };

    // Agrega el contenido de un archivo (pdf o imagen) al PDF final
    const agregarArchivoAlPdf = async (pdfFinal: PDFDocument, blob: Blob, ext: string) => {
      const bytes = new Uint8Array(await blob.arrayBuffer());

      if (ext === '.pdf') {
        const pdfOrigen = await PDFDocument.load(bytes);
        const paginas = await pdfFinal.copyPages(pdfOrigen, pdfOrigen.getPageIndices());
        paginas.forEach(p => pdfFinal.addPage(p));
        return;
      }

      let imagen;
      if (ext === '.png') {
        imagen = await pdfFinal.embedPng(bytes);
      } else if (ext === '.jpg' || ext === '.jpeg') {
        imagen = await pdfFinal.embedJpg(bytes);
      } else {
        console.warn(`Extensión no soportada para PDF: ${ext}`);
        return;
      }

      const { width, height } = imagen.scale(1);
      const maxWidth = 595; // ancho carta en puntos aprox
      const escala = width > maxWidth ? maxWidth / width : 1;
      const pagina = pdfFinal.addPage([width * escala, height * escala]);
      pagina.drawImage(imagen, { x: 0, y: 0, width: width * escala, height: height * escala });
    };

    for (let idx = 0; idx < movimientosOrdenados.length; idx++) {


      const m = movimientosOrdenados[idx];

      const tipoLabel = getTipoMovimientoLabel(m.tipo_movimiento_id);


      const baseNombre = `${idx + 1}. ${anioMes} - ${tipoLabel} - ${sanitizar(m.concepto)}${m.metodo_pago ? ' - ' + m.metodo_pago : ''}`;

      const facturas = parseArchivos(m.archivo_factura);
      const comprobantes = parseArchivos(m.archivo_pago);

      // Si el movimiento no tiene ningún archivo, se omite
      if (facturas.length === 0 && comprobantes.length === 0) continue;

      const pdfFinal = await PDFDocument.create();
      let tuvoContenido = false;

      // Facturas: INGRESO (1) y EGRESO (2, incluye nómina). INVERSIÓN (3) no tiene.
      if (Number(m.tipo_movimiento_id) !== 3) {
        for (const f of facturas) {
          const original = fixEncoding(f);
          const ext = getExtension(original);
          const blob = await descargarBlob(original);
          if (!blob) continue;
          try {
            await agregarArchivoAlPdf(pdfFinal, blob, ext);
            tuvoContenido = true;
          } catch (e) {
            console.warn(`No se pudo incrustar factura ${original}`, e);
          }
        }
      }

      // Comprobantes de pago: aplica para todos los tipos
      for (const c of comprobantes) {
        const original = fixEncoding(c);
        const ext = getExtension(original);
        const blob = await descargarBlob(original);
        if (!blob) continue;
        try {
          await agregarArchivoAlPdf(pdfFinal, blob, ext);
          tuvoContenido = true;
        } catch (e) {
          console.warn(`No se pudo incrustar comprobante ${original}`, e);
        }
      }

      if (tuvoContenido) {
        const pdfBytes = await pdfFinal.save();
        carpetaDocumentos?.file(`${baseNombre}.pdf`, pdfBytes);
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const nombreZip = `Finanzas ${mesSeleccionado?.text || 'SinMes'}.zip`;
    saveAs(zipBlob, nombreZip);

  }


  closeModal() {

    this.showModal = false
    this.resetForm()
  }


  async getPrimerDiaMes() {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const yyyy = primerDia.getFullYear();
    const mm = String(primerDia.getMonth() + 1).padStart(2, '0');
    const dd = '01';

    return await `${yyyy}-${mm}-${dd}`;
  }

  async saveMovimiento() {

    const formData = new FormData();

    formData.append('id', String(this.id) ?? '');
    formData.append('tipo_movimiento_id', String(this.tipo_movimiento_id));
    formData.append('fecha_pago', this.fecha_pago ? this.fecha_pago : '0000-00-00');
    const fecha = this.fecha_factura
      ? this.fecha_factura
      : await this.getPrimerDiaMes();

    formData.append('fecha_factura', fecha);
    formData.append('concepto', this.concepto.toUpperCase());
    formData.append('rfc', this.rfc.toUpperCase());
    formData.append('razon_social', this.razon_social.toUpperCase());
    formData.append('importe_sin_iva', String(this.importe_sin_iva));
    formData.append('iva', String(this.iva));
    formData.append('iva_acreditable', String(this.iva_acreditable));
    formData.append('iva_traslado', String(this.iva_traslado));
    formData.append('isr_retenido', String(this.isr_retenido));
    formData.append('iva_retenido', String(this.iva_retenido));
    formData.append('gran_total', String(this.granTotal));
    formData.append('categoria_id', this.categoria_id);
    formData.append('metodo_pago_id', this.metodo_pago_id);
    formData.append('folio_fiscal', this.folio_fiscal.toUpperCase());

    this.tiposArchivo.forEach(t => {
      this.archivos[t.key].forEach(file => {
        formData.append(`archivo_${t.key}`, file);
      });

      formData.append(`archivos_actuales_${t.key}`, JSON.stringify(this.archivosActuales[t.key]));
    });

    try {

      const res = this.editing
        ? await this.finanzasService.updateMovimiento(this.id, formData)
        : await this.finanzasService.saveMovimiento(formData);

      this.showModal = false;

      await this.alert.AlertaVerde('', 'Se agregó el contrato exitosamente.');

      this.getSaldo(this.filtroAnio, this.filtroMes);

      this.cargarMovimientos();

    } catch (err: any) {

      console.log(err);

    }

  }


}