import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';
import { AlertsService } from '../core/alerts.service';
import { MaquinariaService } from '../services/maquinaria.service';
import { HostListener } from '@angular/core';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FinanzasService } from '../services/finanzas.service';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';


@Pipe({ name: 'safeUrl' })
export class SafeUrlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) { }
  transform(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}



@Component({
  selector: 'app-maquinaria',
  imports: [CommonModule, FormsModule, NgxMaskDirective, SafeUrlPipe],
  templateUrl: './maquinaria.component.html',
  styleUrl: './maquinaria.component.css'
})
export class MaquinariaComponent {

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(private maquinariaService: MaquinariaService,
    private finanzasService: FinanzasService
  ) { }

  maquinaria: any[] = [];
  mostrarBuscador: boolean = true // controla visibilidad
  filtroMaquinaria: string = ''
  filtroSeguro: string = 'todos';
  filtroAdquisicion: string = 'todos';
  maquinariaFiltrada: any[] = []

  // Modal Exportar Excel: qué grupos incluir. Datos del Activo siempre van;
  // Leasing, Servicio y Seguro se eligen con checkbox (1, 2 o los 3).
  mostrarExportar = false;
  exportLeasing = true;
  exportServicio = true;
  exportSeguro = true;

  mostrarPagos = false;
  cargandoPagos = false;
  activoPagos: any = null;
  pagosActivo: any[] = [];

  mostrarPoliza = false;
  activoPoliza: any = null;
  dragoverPoliza = false;

  showModal = false
  tituloAdquisicion = '';
  numero_de_contrato = '';
  aseguradora = '';
  numero_poliza = '';
  costo_poliza = '';
  fecha_inicio_poliza = '';
  fecha_fin_poliza = '';
  documento_poliza = '';
  archivoPoliza: File | null = null;

  id_tipo_de_adquisicion = 0;
  numero_activo = '';
  numero_serie = '';
  descripcion = '';
  nombre = '';
  anio = '';
  id_marca = 0;
  id_modelo = 0;
  documentos = '';

  editando: boolean = false;
  id_maquinaria: any = null;

  documentosNuevos: File[] = [];        // archivos que el usuario acaba de seleccionar
  documentosExistentes: string[] = [];  // nombres ya guardados en documentos (modo editar)

  panelDocumentosAbierto = false;
  valor_compra: any = [];
  importe_con_iva: any = [];
  importe_sin_iva: any = [];
  fecha_de_adquisicion = '';

  filasPagos: any[] = [];
  menuPagoItems: { label: string, archivo: string }[] = [];
  menuPagoId: number | null = null;
  menuPos = { top: 0, left: 0 };

  plazo = 0;
  pago_mensual = 0;

  id_arrendador = 0;
  monto_renta_mensual = 0;

  marcas: any[] = [];
  modelos: any[] = [];
  arrendadores: any[] = [];
  tiposMaquinaria: any[] = [];
  tipo_maquinaria_id = 0;
  placas = '';
  especificacion = '';
  ubicacion = '';
  dragoverActivo = false;


  mostrarCarrousel = false;
  documentosCarrousel: any[] = [];
  indiceActual = 0;
  carrouselNumeroSerie = '';


  openModal() {
    this.showModal = true;
    this.loadMarcas();
    this.loadTiposMaquinaria();

  }

  loadTiposMaquinaria() {
    this.maquinariaService.getTiposMaquinaria()
      .subscribe(res => this.tiposMaquinaria = res);
  }



  mostrarMenuArchivos: number | null = null;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.mostrarMenuArchivos === null) return;

    const target = event.target as HTMLElement;
    if (!target.closest('.archivos-indicador')) {
      this.mostrarMenuArchivos = null;
    }
  }

  toggleMenuArchivos(id: number) {
    this.mostrarMenuArchivos = this.mostrarMenuArchivos === id ? null : id;
  }
  async verPagos(c: any) {
    this.activoPagos = c;
    this.pagosActivo = [];
    this.filasPagos = [];
    this.mostrarPagos = true;
    this.cargandoPagos = true;
    try {
      this.pagosActivo = await firstValueFrom(
        this.finanzasService.getPagosActivo(c.id_maquinaria)
      );
      this.filasPagos = this.armarFilasPagos();
    } catch (err) {
      console.error(err);
    } finally {
      this.cargandoPagos = false;
    }
  }

  cerrarPagos() {
    this.mostrarPagos = false;
    this.activoPagos = null;
    this.pagosActivo = [];
    this.filasPagos = [];
    this.cerrarMenuPago();
  }

  // Rellena con "SIN INFORMACIÓN" los números que faltan entre el 1 y el más alto capturado
  private armarFilasPagos(): any[] {
    const conNumero = this.pagosActivo.filter(p => Number(p.numero_pago) > 0);
    const sinNumero = this.pagosActivo.filter(p => !(Number(p.numero_pago) > 0));

    const existentes = new Set(conNumero.map(p => Number(p.numero_pago)));
    const max = conNumero.length ? Math.max(...existentes) : 0;

    const filas: any[] = [...conNumero];
    for (let n = 1; n <= max; n++) {
      if (!existentes.has(n)) filas.push({ numero_pago: n, sinInfo: true });
    }
    filas.sort((a, b) => Number(b.numero_pago) - Number(a.numero_pago));

    return [...filas, ...sinNumero];
  }

  get pagosSinInfo(): number {
    return this.filasPagos.filter(f => f.sinInfo).length;
  }

  get pagosRealizados(): number {
    const nums = this.pagosActivo.map(p => Number(p.numero_pago)).filter(n => n > 0);
    return nums.length ? Math.max(...nums) : this.pagosActivo.length;
  }

  get plazoActivo(): number {
    return Number(this.activoPagos?.plazo) || 0;
  }

  get pagosPendientes(): number {
    return Math.max(this.plazoActivo - this.pagosRealizados, 0);
  }

  get progresoPagos(): number {
    if (!this.plazoActivo) return 0;
    return Math.min(Math.round((this.pagosRealizados / this.plazoActivo) * 100), 100);
  }

  get montoMensualActivo(): number {
    const a = this.activoPagos;
    if (!a) return 0;
    return Number(+a.id_tipo_de_adquisicion === 2 ? a.pago_mensual : a.monto_renta_mensual) || 0;
  }


  get totalPagado(): number {
    return this.pagosActivo.reduce((s, p) => s + (Number(p.importe_sin_iva) || 0), 0);
  }

  onDragOverPanel(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragoverActivo = true;
  }

  onDragLeavePanel(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragoverActivo = false;
  }

  onDropPanel(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragoverActivo = false;

    // Abre automáticamente al recibir archivos
    this.panelDocumentosAbierto = true;

    const archivos = event.dataTransfer?.files;
    if (archivos && archivos.length > 0) {
      this.procesarArchivos(archivos);
    }
  }

  archivosDePago(p: any): { label: string, archivo: string }[] {
  const result: { label: string, archivo: string }[] = [];
  const tipos = [
    { campo: 'archivo_factura', label: 'Factura' },
    { campo: 'archivo_pago', label: 'Pago' },
  ];
  tipos.forEach(t => {
    this.parseDocumentosFrontend(p[t.campo]).forEach((a, i) =>
      result.push({ label: `${t.label} ${i + 1}`, archivo: a })
    );
  });
  return result;
}

contarArchivosPago(p: any): number {
  return this.archivosDePago(p).length;
}

togglePagoArchivos(p: any, event: MouseEvent) {
  event.stopPropagation();
  if (this.menuPagoId === p.id) {
    this.cerrarMenuPago();
    return;
  }
  const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
  this.menuPos = { top: r.bottom + 4, left: Math.max(r.right - 200, 8) };
  this.menuPagoItems = this.archivosDePago(p);
  this.menuPagoId = p.id;
}

cerrarMenuPago() {
  this.menuPagoId = null;
  this.menuPagoItems = [];
}

verArchivoPago(nombre: string) {
  window.open(`http://localhost:3000/uploads/movimientos/${nombre}`, '_blank');
  this.cerrarMenuPago();
}

@HostListener('document:click')
onClickFueraMenuPago() {
  if (this.menuPagoId !== null) this.cerrarMenuPago();
}

  // --- Click en el body del panel ---
  onPanelBodyClick(event: Event) {
    // No abrir si hizo clic en un botón, link o archivo
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('li')) {
      return;
    }
    this.fileInput.nativeElement.click();
  }

  // --- Input file (clic normal) ---
  onDocumentosSeleccionados(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.procesarArchivos(input.files);
    }
    input.value = '';
  }

  // --- Procesar archivos ---
  procesarArchivos(archivos: FileList) {
    const tiposPermitidos = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];

      if (!tiposPermitidos.includes(archivo.type)) {
        alert(`"${archivo.name}" no es válido. Solo se permiten PDF, JPG y PNG.`);
        continue;
      }

      const yaExisteNuevo = this.documentosNuevos.some(f => f.name === archivo.name && f.size === archivo.size);
      const yaExisteGuardado = this.documentosExistentes.includes(archivo.name);

      if (!yaExisteNuevo && !yaExisteGuardado) {
        this.documentosNuevos.push(archivo);
      }
    }
    this.panelDocumentosAbierto = true;
  }

  abrirCarrousel(c: any) {
    this.carrouselNumeroSerie = c.numero_serie;
    this.documentosCarrousel = this.documentosDeMaquinaria(c).map(
      (nombre: string) => `http://localhost:3000/uploads/activos/${c.numero_serie}/${nombre}`
    );
    this.indiceActual = 0;
    this.mostrarCarrousel = true;
    this.mostrarMenuArchivos = null; // cierra el menú viejo
  }

  cerrarCarrousel() {
    this.mostrarCarrousel = false;
  }

  anterior() {
    this.indiceActual = (this.indiceActual - 1 + this.documentosCarrousel.length) % this.documentosCarrousel.length;
  }

  siguiente() {
    this.indiceActual = (this.indiceActual + 1) % this.documentosCarrousel.length;
  }

  // Detecta el tipo de archivo por extensión
  esImagen(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url);
  }

  esPdf(url: string): boolean {
    return /\.pdf$/i.test(url);
  }

  nombreArchivo(url: string): string {
    return url.split('/').pop() || url;
  }

  descargar(url: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = this.nombreArchivo(url);
    a.target = '_blank';
    a.click();
  }


  contarArchivos(m: any): number {
    return this.parseDocumentosFrontend(m.documentos).length;
  }

  documentosDeMaquinaria(m: any): string[] {
    return this.parseDocumentosFrontend(m.documentos);
  }

  private parseDocumentosFrontend(valor: any): string[] {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor;

    try {
      const parsed = JSON.parse(valor);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // formato viejo, cae a comas
    }

    return valor.split(',').map((d: string) => d.trim()).filter(Boolean);
  }

  verArchivo(nombre: string, numero_serie: string) {
    console.log(nombre)
    console.log(numero_serie)
    window.open(`http://localhost:3000/uploads/activos/${numero_serie}/${nombre}`, '_blank');
  }




  quitarDocumentoExistente(nombre: string, numero_serie: string) {
    this.documentosExistentes = this.documentosExistentes.filter(d => d !== nombre);
  }

  ngOnInit() {
    this.maquinariaService.getMaquinaria().subscribe(res => {
      console.log('DATA LISTADO:', res);
      this.maquinaria = res as any[];
      this.filtrarMaquinaria();
    });

  }

  filtrarMaquinaria() {
    this.maquinariaFiltrada = this.maquinaria.filter((c: any) => {
      if (this.filtroSeguro === 'con' && !this.tienePoliza(c)) return false;
      if (this.filtroSeguro === 'sin' && this.tienePoliza(c)) return false;
      if (this.filtroAdquisicion !== 'todos' && String(c.id_tipo_de_adquisicion) !== this.filtroAdquisicion) return false;
      return true;
    });
  }

  limpiarFiltros() {
    this.filtroSeguro = 'todos';
    this.filtroAdquisicion = 'todos';
    this.filtrarMaquinaria();
  }



  loadMarcas() {
    this.maquinariaService.getMarcas()
      .subscribe(res => this.marcas = res);
  }

  // Se usa en (change) del select de marca — cuando el usuario cambia la marca manualmente
  loadModelos() {
    this.modelos = [];
    this.id_modelo = 0;

    if (!this.id_marca) return;

    this.maquinariaService.getModelos(this.id_marca)
      .subscribe(res => this.modelos = res);
  }

  // Se usa SOLO al editar, para no perder el id_modelo ya guardado
  loadModelosParaEditar(idMarca: number, idModeloActual: number) {
    this.modelos = [];
    this.loadMarcas()
    if (!idMarca) return;

    this.maquinariaService.getModelos(idMarca)
      .subscribe(res => {
        this.modelos = res;
        this.id_modelo = idModeloActual; // se asigna DESPUÉS de que llegan los modelos
      });
  }

  closeModal() {
    this.showModal = false;
    this.editando = false;
    this.id_maquinaria = null;
    this.documentosNuevos = [];
    this.documentosExistentes = [];

    this.id_tipo_de_adquisicion = 0;
    this.numero_de_contrato = '';
    this.aseguradora = '';
    this.numero_poliza = '';
    this.costo_poliza = '';
    this.fecha_inicio_poliza = '';
    this.fecha_fin_poliza = '';
    this.documento_poliza = '';
    this.archivoPoliza = null;
    this.numero_activo = '';
    this.numero_serie = '';
    this.descripcion = '';
    this.nombre = '';
    this.tipo_maquinaria_id = 0;
    this.placas = '';
    this.especificacion = '';
    this.ubicacion = '';
    this.anio = '';
    this.id_marca = 0;
    this.id_modelo = 0;
    this.documentos = '';

    this.valor_compra = '';
    this.importe_con_iva = '';
    this.importe_sin_iva = '';
    this.fecha_de_adquisicion = '';

    this.plazo = 0;
    this.pago_mensual = 0;

    this.id_arrendador = 0;
    this.monto_renta_mensual = 0;

    this.tituloAdquisicion = '';
    this.modelos = [];
    this.arrendadores = [];


  }

  loadArrendadoresMaquinaria() {
    this.maquinariaService.getArreandadores()
      .subscribe(res => this.arrendadores = res);


  }

  editMaquinaria(c: any) {






    this.editando = true;
    this.id_maquinaria = c.id_maquinaria;

    this.id_tipo_de_adquisicion = c.id_tipo_de_adquisicion;
    console.log('TIPO ADQ:', this.id_tipo_de_adquisicion, typeof this.id_tipo_de_adquisicion);
    this.numero_activo = c.numero_activo;
    this.numero_serie = c.numero_serie;
    this.descripcion = c.descripcion;
    this.nombre = c.nombre ?? '';
    this.tipo_maquinaria_id = c.tipo_maquinaria_id ?? 0;
    this.placas = c.placas ?? '';
    this.especificacion = c.especificacion ?? '';
    this.ubicacion = c.ubicacion ?? '';
    this.id_marca = c.id_marca;
    this.anio = c.anio;
    this.numero_de_contrato = c.numero_de_contrato ?? '';
    this.documentos = c.documentos;
    console.log('valor_compra RECIBIDO (crudo):', c.valor_compra);
    this.valor_compra = c.valor_compra;
    console.log('this.valor_compra justo después de asignar:', this.valor_compra);
    this.fecha_de_adquisicion = c.fecha_de_adquisicion
      ? c.fecha_de_adquisicion.toString().split('T')[0]
      : null;


    this.plazo = c.plazo;
    this.pago_mensual = c.pago_mensual;
    this.id_arrendador = c.id_arrendador;
    this.monto_renta_mensual = c.monto_renta_mensual;

    this.documentosExistentes = this.parseDocumentosFrontend(c.documentos);
    this.documentosNuevos = [];

    // 👇 clave: carga modelos y AL FINAL asigna id_modelo

    this.loadModelosParaEditar(c.id_marca, c.id_modelo);
    this.loadTiposMaquinaria();

    this.onTipoAdquisicionChange(false);

    this.showModal = true;
    console.log('this.valor_compra FINAL antes de mostrar:', this.valor_compra);

  }

  // ===== PÓLIZA DE SEGURO =====
  tienePoliza(c: any): boolean {
    return !!(c.numero_poliza || c.aseguradora);
  }

  polizaVencida(c: any): boolean {
    if (!c.fecha_fin_poliza) return false;
    const fin = c.fecha_fin_poliza.toString().split('T')[0];
    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    return fin < hoyStr;
  }

  abrirPoliza(c: any) {
    // Formulario aparte: solo datos de la póliza, no abre el de nuevo/editar
    this.activoPoliza = c;
    this.aseguradora = c.aseguradora ?? '';
    this.numero_poliza = c.numero_poliza ?? '';
    this.costo_poliza = c.costo_poliza ?? '';
    this.fecha_inicio_poliza = c.fecha_inicio_poliza
      ? c.fecha_inicio_poliza.toString().split('T')[0]
      : '';
    this.fecha_fin_poliza = c.fecha_fin_poliza
      ? c.fecha_fin_poliza.toString().split('T')[0]
      : '';
    this.documento_poliza = c.documento_poliza ?? '';
    this.archivoPoliza = null;
    this.dragoverPoliza = false;
    this.mostrarPoliza = true;
  }

  cerrarPoliza() {
    this.mostrarPoliza = false;
    this.activoPoliza = null;
    this.dragoverPoliza = false;
    this.aseguradora = '';
    this.numero_poliza = '';
    this.costo_poliza = '';
    this.fecha_inicio_poliza = '';
    this.fecha_fin_poliza = '';
    this.documento_poliza = '';
    this.archivoPoliza = null;
  }

  async savePoliza() {
    if (!this.activoPoliza) return;

    const formData = new FormData();
    formData.append('id_maquinaria', this.activoPoliza.id_maquinaria.toString());
    formData.append('numero_serie', this.activoPoliza.numero_serie);
    formData.append('aseguradora', (this.aseguradora || '').trim().toUpperCase());
    formData.append('numero_poliza', (this.numero_poliza || '').trim().toUpperCase());
    formData.append('costo_poliza', (this.costo_poliza || '').trim());
    formData.append('fecha_inicio_poliza', this.fecha_inicio_poliza || '');
    formData.append('fecha_fin_poliza', this.fecha_fin_poliza || '');
    formData.append('documento_poliza', this.documento_poliza || '');
    if (this.archivoPoliza) {
      formData.append('archivo_poliza', this.archivoPoliza);
    }

    await this.maquinariaService.updatePoliza(formData);

    this.maquinariaService.getMaquinaria().subscribe(res => {
      this.maquinaria = res as any[];
      this.filtrarMaquinaria();
    });

    this.cerrarPoliza();
  }

  onDragOverPoliza(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragoverPoliza = true;
  }

  onDragLeavePoliza(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragoverPoliza = false;
  }

  onDropPoliza(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragoverPoliza = false;

    const archivos = event.dataTransfer?.files;
    if (archivos && archivos.length > 0) {
      this.procesarArchivoPoliza(archivos[0]);
    }
  }

  private procesarArchivoPoliza(archivo: File) {
    if (archivo.type !== 'application/pdf') {
      alert(`"${archivo.name}" no es válido. Solo se permite PDF.`);
      return;
    }
    this.archivoPoliza = archivo;
  }

  onPolizaSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    this.procesarArchivoPoliza(archivo);
  }

  quitarPoliza() {
    this.archivoPoliza = null;
    this.documento_poliza = '';
  }

  verPolizaPdf() {
    if (!this.documento_poliza) return;
    const serie = this.activoPoliza?.numero_serie || this.numero_serie;
    window.open(`http://localhost:3000/uploads/activos/${serie}/${this.documento_poliza}`, '_blank');
  }

  // ===== EXPORTAR EXCEL (reporte de maquinaria, 21 columnas en 4 grupos: activo, leasing, servicio y seguro) =====
  abrirExportar() {
    this.exportLeasing = true;
    this.exportServicio = true;
    this.exportSeguro = true;
    this.mostrarExportar = true;
  }

  cerrarExportar() {
    this.mostrarExportar = false;
  }

  exportarExcel() {
    this.mostrarExportar = false;
    const MESES_ABR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    // Dato que falta -> guion, como pidió Ivo
    const GUION = '-';
    const fmtFecha = (f: any): string => {
      if (!f) return GUION;
      const soloFecha = f.toString().split('T')[0].split(' ')[0];
      const partes = soloFecha.split('-');
      if (partes.length !== 3) return soloFecha;
      const [y, m, d] = partes;
      return `${d}-${MESES_ABR[Number(m) - 1] || m}-${y.slice(2)}`;
    };
    // Monto como número para Excel (guion si no aplica); el formato $ se pone en la celda.
    // Si el valor es texto no numérico (ej. "Financiado en letra") se deja el texto tal cual.
    const montoCelda = (v: any): number | string => {
      if (v === null || v === undefined || v === '') return GUION;
      const n = Number(v);
      // El 0 es el valor por default cuando no se capturó nada (igual que en
      // horómetro y servicio programado), así que también es guion.
      if (isFinite(n)) return n === 0 ? GUION : n;
      const t = String(v).trim();
      return t || GUION;
    };
    // Hrs o km del último servicio: si el horómetro es 0 se usa el
    // kilometraje con "kms"; si el kilometraje también es 0, guion.
    const fmtHrsKm = (c: any): string => {
      const num = (v: any): string => {
        const n = Number(v);
        return isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '';
      };
      const h = Number(c.ultimo_horometro_servicio);
      if (isFinite(h) && h !== 0) return `${num(c.ultimo_horometro_servicio)} HR`;
      const k = Number(c.ultimo_kilometraje);
      if (isFinite(k) && k !== 0) return `${num(c.ultimo_kilometraje)} kms`;
      return GUION;
    };

    // TIPO DE SERVICIO derivado del último servicio: si trae servicio programado
    // (horas) se muestra solo "{valor} {unidad}" (ej. "2000 HR"); si no trae,
    // van los comentarios del servicio; guion solo si tampoco hay comentarios.
    // OJO: las horas por default se guardan como 0, así que el 0 NO es programado
    // y también va a comentarios (no "0 HR").
    const fmtTipoServicio = (c: any): string => {
      const prog = c.ultimo_servicio_programado;
      const n = Number(prog);
      if (prog !== null && prog !== undefined && prog !== '' && isFinite(n) && n !== 0) {
        const valor = String(n);
        const unidad = (c.ultimo_unidad_servicio || '').trim();
        return unidad ? `${valor} ${unidad}` : `${valor}`;
      }
      return (c.ultimo_comentarios || '').trim() || GUION;
    };

    // ASEGURADORA: nombre si lo tiene; "No Asegurado" si no tiene póliza;
    // guion si tiene número de póliza pero no capturaron la aseguradora.
    const fmtAseguradora = (c: any): string => {
      if ((c.aseguradora || '').trim()) return c.aseguradora;
      if ((c.numero_poliza || '').trim()) return GUION;
      return 'No Asegurado';
    };

    // Columnas en el orden de los grupos: activo (1-9), leasing (10-13),
    // servicio (14-16) y seguro (17-21). UBICACIÓN ACTUAL se mueve junto
    // a los datos del activo para que los grupos queden corridos.
    const headersCompletos = ['No.', 'MAQUINARIA / VEHÍCULO', 'NOMBRE', 'MARCA', 'MODELO', 'NO. DE SERIE', 'AÑO', 'NÚMERO DE PLACAS', 'UBICACIÓN ACTUAL', 'VALOR DE COMPRA (MX) (PRECIOS INCLUYEN IVA)', 'PAGO MENSUAL (PRECIOS INCLUYEN IVA)', 'FECHA DE ADQUISICIÓN', 'TIPO DE ADQUISICIÓN', 'TIPO DE SERVICIO', 'FECHA ÚLTIMO SERVICIO', 'HRS O KM AL ÚLTIMO SERVICIO', 'ASEGURADORA', 'NO. PÓLIZA DE SEGURO', 'FECHA DE INICIO', 'FECHA DE TÉRMINO', 'COSTO DE LA PÓLIZA (PRECIOS INCLUYEN IVA)'];

    const filasCompletas = this.maquinariaFiltrada.map((c: any, i: number) => {
      const pagoMensual = (c.monto_renta_mensual != null && c.monto_renta_mensual !== '')
        ? c.monto_renta_mensual
        : c.pago_mensual;
      return [
        i + 1,
        c.tipo_maquinaria || GUION,
        c.nombre || GUION,
        c.b_marca || GUION,
        c.m_modelo || GUION,
        c.numero_serie || GUION,
        c.anio || GUION,
        c.placas || GUION,
        c.ubicacion || GUION,
        montoCelda(c.valor_compra),
        montoCelda(pagoMensual),
        fmtFecha(c.fecha_de_adquisicion),
        c.tipo_adquisicion || GUION,
        fmtTipoServicio(c),
        fmtFecha(c.ultimo_fecha_servicio),
        fmtHrsKm(c),
        fmtAseguradora(c),
        c.numero_poliza || GUION,
        fmtFecha(c.fecha_inicio_poliza),
        fmtFecha(c.fecha_fin_poliza),
        montoCelda(c.costo_poliza)
      ];
    });

    // ===== QUÉ GRUPOS SALEN (según el modal): Activo siempre; Leasing,
    // Servicio y Seguro solo si se marcaron. Sin marcar ninguno salen solo
    // los 9 datos del activo. Los índices se recorren al quitar un grupo.
    const incluidos: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    if (this.exportLeasing) incluidos.push(9, 10, 11, 12);
    if (this.exportServicio) incluidos.push(13, 14, 15);
    if (this.exportSeguro) incluidos.push(16, 17, 18, 19, 20);
    const headers = incluidos.map(i => headersCompletos[i]);
    const rows = filasCompletas.map((f: any[]) => incluidos.map(i => f[i]));
    // Columnas de montos con formato $ (índices originales 9, 10 y 20),
    // ya recorridas a su posición nueva; solo las que sí se exportan.
    const colsMonto = [9, 10, 20].filter(i => incluidos.includes(i)).map(i => incluidos.indexOf(i));

    // ===== AGRUPACIÓN Y COLORES: encabezado en 2 niveles =====
    // Fila 1: título de cada grupo (combinado, color fuerte, texto blanco).
    // Fila 2: nombres de columna (tinte claro del color de su grupo).
    const GRUPOS_BASE = [
      { titulo: 'DATOS DEL ACTIVO', desde: 0, hasta: 8, color: 'FF1F4E79', claro: 'FFD9E2F3' },
      { titulo: 'DATOS DEL LEASING', desde: 9, hasta: 12, color: 'FF2E75B6', claro: 'FFDDEBF7' },
      { titulo: 'DATOS DEL SERVICIO', desde: 13, hasta: 15, color: 'FF548235', claro: 'FFE2EFDA' },
      { titulo: 'DATOS DEL SEGURO', desde: 16, hasta: 20, color: 'FFBF8F00', claro: 'FFFFF2CC' },
    ];
    const GRUPOS = GRUPOS_BASE
      .map(g => {
        const cols = incluidos.filter(i => i >= g.desde && i <= g.hasta);
        if (!cols.length) return null;
        return { titulo: g.titulo, desde: incluidos.indexOf(cols[0]), hasta: incluidos.indexOf(cols[cols.length - 1]), color: g.color, claro: g.claro };
      })
      .filter(g => g !== null) as { titulo: string; desde: number; hasta: number; color: string; claro: string }[];
    const grupoDe = (col: number) => GRUPOS.find(g => col >= g.desde && col <= g.hasta)!;
    const filaGrupos: any[] = new Array(headers.length).fill('');
    GRUPOS.forEach(g => { filaGrupos[g.desde] = g.titulo; });

    const sheetData = [filaGrupos, headers, ...rows];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const anchosCompletos = [
      { wch: 5 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
      { wch: 20 }, { wch: 8 }, { wch: 14 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 },
      { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
      { wch: 20 }
    ];
    worksheet['!cols'] = incluidos.map(i => anchosCompletos[i]);
    worksheet['!merges'] = GRUPOS.map(g => ({ s: { r: 0, c: g.desde }, e: { r: 0, c: g.hasta } }));
    worksheet['!rows'] = [{ hpt: 22 }, { hpt: 30 }];

    const colLetra = (c: number): string => XLSX.utils.encode_col(c);
    const bordeFino = {
      top: { style: 'thin', color: { rgb: 'FFBFBFBF' } },
      bottom: { style: 'thin', color: { rgb: 'FFBFBFBF' } },
      left: { style: 'thin', color: { rgb: 'FFBFBFBF' } },
      right: { style: 'thin', color: { rgb: 'FFBFBFBF' } },
    };
    // Fila 1: títulos de grupo
    GRUPOS.forEach(g => {
      for (let c = g.desde; c <= g.hasta; c++) {
        const cell = worksheet[`${colLetra(c)}1`];
        if (!cell) continue;
        cell.s = {
          fill: { patternType: 'solid', fgColor: { rgb: g.color } },
          font: { bold: true, sz: 12, color: { rgb: 'FFFFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: bordeFino,
        };
      }
    });
    // Fila 2: nombres de columna
    for (let c = 0; c < headers.length; c++) {
      const g = grupoDe(c);
      const cell = worksheet[`${colLetra(c)}2`];
      if (!cell) continue;
      cell.s = {
        fill: { patternType: 'solid', fgColor: { rgb: g.claro } },
        font: { bold: true, sz: 11, color: { rgb: 'FF1F1F1F' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: bordeFino,
      };
    }
    // Formato $ a las columnas de montos que sí se exportan (Valor de compra,
    // Pago mensual y Costo de la póliza); los datos empiezan en la fila 3
    for (let r = 0; r < rows.length; r++) {
      for (const col of colsMonto) {
        const cell = worksheet[`${colLetra(col)}${r + 3}`];
        if (cell && typeof cell.v === 'number') { cell.t = 'n'; cell.z = '"$"#,##0.00'; }
      }
    }
    // Datos: bordes finos y renglón sí / renglón no en gris muy claro
    for (let r = 0; r < rows.length; r++) {
      const fila = r + 3;
      for (let c = 0; c < headers.length; c++) {
        const cell = worksheet[`${colLetra(c)}${fila}`];
        if (!cell) continue;
        cell.s = {
          ...(cell.s || {}),
          fill: { patternType: 'solid', fgColor: { rgb: r % 2 === 1 ? 'FFF2F2F2' : 'FFFFFFFF' } },
          font: { sz: 11, color: { rgb: 'FF1F1F1F' } },
          alignment: { vertical: 'center' },
          border: bordeFino,
        };
      }
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maquinaria');

    const hoy = new Date();
    const fechaArchivo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    saveAs(blob, `Maquinaria ${fechaArchivo}.xlsx`);
  }

  // ===== ELIMINAR =====
  async deleteMaquinaria(id: any) {
    const confirmado = confirm('¿Seguro que deseas eliminar esta maquinaria?');
    if (!confirmado) return;

    await this.maquinariaService.deleteMaquinaria(id);

    this.maquinariaService.getMaquinaria().subscribe(res => {
      this.maquinaria = res as any[];
    });
  }

  // ===== GUARDAR (crear o actualizar) =====
  async saveMaquinaria() {

    const formData = new FormData();

    formData.append('id_tipo_de_adquisicion', this.id_tipo_de_adquisicion.toString());
    formData.append('numero_activo', this.numero_activo);
    formData.append('numero_serie', this.numero_serie.toUpperCase());
    formData.append('descripcion', this.descripcion.toUpperCase());
    formData.append('nombre', (this.nombre || '').trim().toUpperCase());
    formData.append('tipo_maquinaria_id', this.tipo_maquinaria_id > 0 ? this.tipo_maquinaria_id.toString() : '');
    formData.append('placas', (this.placas || '').trim().toUpperCase());
    formData.append('especificacion', (this.especificacion || '').trim().toUpperCase());
    formData.append('ubicacion', (this.ubicacion || '').trim());
    formData.append('id_marca', this.id_marca.toString());
    formData.append('id_modelo', this.id_modelo.toString());
    formData.append('anio', this.anio.toString());

    // documentos que ya existían y no se quitaron (solo aplica en edición)
    formData.append('documentos', JSON.stringify(this.documentosExistentes));

    // archivos nuevos
    this.documentosNuevos.forEach(file => {
      formData.append('archivo_documento', file);
    });

    const llevaContrato = [2, 3].includes(Number(this.id_tipo_de_adquisicion));
    formData.append(
      'numero_de_contrato',
      llevaContrato ? (this.numero_de_contrato || '').trim().toUpperCase() : ''
    );

    switch (Number(this.id_tipo_de_adquisicion)) {
      case 1:
        formData.append('valor_compra', this.valor_compra);
        formData.append('fecha_de_adquisicion', this.fecha_de_adquisicion);
        break;
      case 2:
        formData.append('valor_compra', this.valor_compra);
        formData.append('fecha_de_adquisicion', this.fecha_de_adquisicion);
        formData.append('plazo', this.plazo.toString());
        formData.append('pago_mensual', this.pago_mensual.toString());
        break;
      case 3:
        formData.append('id_arrendador', this.id_arrendador.toString());
        formData.append('monto_renta_mensual', this.monto_renta_mensual.toString());
        formData.append('plazo', this.plazo.toString());
        break;
    }

    if (this.editando) {
      formData.append('id_maquinaria', this.id_maquinaria.toString());
      await this.maquinariaService.updateMaquinaria(formData);
    } else {
      await this.maquinariaService.saveMaquinaria(formData);
    }

    this.maquinariaService.getMaquinaria().subscribe(res => {
      this.maquinaria = res as any[];
      this.filtrarMaquinaria();
    });

    this.closeModal();
  }

  onTipoAdquisicionChange(resetCampos: boolean = true) {

    switch (+this.id_tipo_de_adquisicion) {
      case 1:
        this.tituloAdquisicion = 'Datos de Compra';
        break;
      case 2:
        this.tituloAdquisicion = 'Datos de Leasing';
        break;
      case 3:
        this.tituloAdquisicion = 'Datos de Arrendamiento';
        this.loadArrendadoresMaquinaria()
        break;
      default:
        this.tituloAdquisicion = '';
    }

    if (!resetCampos) return; // 👈 en modo edición no borra nada

    this.valor_compra = '';
    this.numero_de_contrato = '';
    this.importe_con_iva = '';
    this.importe_sin_iva = '';
    this.fecha_de_adquisicion = '';
    this.plazo = 0;
    this.pago_mensual = 0;
    this.id_arrendador = 0;
    this.monto_renta_mensual = 0;
  }
}
