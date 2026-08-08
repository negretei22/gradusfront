import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';
import { AlertsService } from '../core/alerts.service';
import { MaquinariaService } from '../services/maquinaria.service';
import { HostListener } from '@angular/core';
import { Component, ElementRef, ViewChild } from '@angular/core';



@Component({
  selector: 'app-maquinaria',
  imports: [CommonModule, FormsModule, NgxMaskDirective],
  templateUrl: './maquinaria.component.html',
  styleUrl: './maquinaria.component.css'
})
export class MaquinariaComponent {

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(private maquinariaService: MaquinariaService) { }

  maquinaria: any[] = [];
  mostrarBuscador: boolean = true // controla visibilidad
  filtroMaquinaria: string = ''
  maquinariaFiltrada: any[] = []

  showModal = false
  tituloAdquisicion = '';

  id_tipo_de_adquisicion = 0;
  numero_activo = '';
  numero_serie = '';
  descripcion = '';
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

  plazo = 0;
  pago_mensual = 0;

  id_arrendador = 0;
  monto_renta_mensual = 0;

  marcas: any[] = [];
  modelos: any[] = [];
  arrendadores: any[] = [];
  dragoverActivo = false;


  openModal() {
    this.showModal = true;
    this.loadMarcas();

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


  contarArchivos(m: any): number {
    if (!m.documentos) return 0;
    return m.documentos.split(',').filter((x: string) => x.trim()).length;
  }

  documentosDeMaquinaria(m: any): string[] {
    if (!m.documentos) return [];
    return m.documentos.split(',').filter((x: string) => x.trim());
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
      this.maquinariaFiltrada = [...this.maquinaria];
    });

  }

  filtrarMaquinaria() {

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
    this.numero_activo = '';
    this.numero_serie = '';
    this.descripcion = '';
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
    this.id_marca = c.id_marca;
    this.anio = c.anio;
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

    this.documentosExistentes = c.documentos
      ? c.documentos.split(',').filter((d: string) => d)
      : [];
    this.documentosNuevos = [];

    // 👇 clave: carga modelos y AL FINAL asigna id_modelo

    this.loadModelosParaEditar(c.id_marca, c.id_modelo);

    this.onTipoAdquisicionChange(false);

    this.showModal = true;
    console.log('this.valor_compra FINAL antes de mostrar:', this.valor_compra);

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
    formData.append('id_marca', this.id_marca.toString());
    formData.append('id_modelo', this.id_modelo.toString());
    formData.append('anio', this.anio.toString());

    // documentos que ya existían y no se quitaron (solo aplica en edición)
    formData.append('documentos', this.documentosExistentes.join(','));

    // archivos nuevos
    this.documentosNuevos.forEach(file => {
      formData.append('archivo_documento', file);
    });

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
      this.maquinariaFiltrada = [...this.maquinaria];
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
    this.importe_con_iva = '';
    this.importe_sin_iva = '';
    this.fecha_de_adquisicion = '';
    this.plazo = 0;
    this.pago_mensual = 0;
    this.id_arrendador = 0;
    this.monto_renta_mensual = 0;
  }
}
