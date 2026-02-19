import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';
import { AlertsService } from '../core/alerts.service';
import { MaquinariaService } from '../services/maquinaria.service';

@Component({
  selector: 'app-maquinaria',
  imports: [CommonModule, FormsModule, NgxMaskDirective],
  templateUrl: './maquinaria.component.html',
  styleUrl: './maquinaria.component.css'
})
export class MaquinariaComponent {

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
  id_documentos = '';

  valor_compra : any  =  [];
  importe_con_iva: any  =  [];
  importe_sin_iva: any  =  [];
  fecha_de_adquisicion = '';

  plazo = 0;
  pago_mensual = 0;

  id_arrendador = 0;
  monto_renta_mensual = 0;

  marcas: any[] = [];
  modelos: any[] = [];
  arrendadores: any[] = [];


  openModal() {
    this.showModal = true;
    this.loadMarcas();

  }


  ngOnInit() {
    this.maquinariaService.getMaquinaria().subscribe(res => {
      console.log(res)
      this.maquinaria = res as any[];
      this.maquinariaFiltrada = [...this.maquinaria];
    });

  }

  filtrarMaquinaria() {

  }

  editMaquinaria(maquinaria: any) {

  }

  deleteMaquinaria(id: number) {

  }

  loadMarcas() {
    this.maquinariaService.getMarcas()
      .subscribe(res => this.marcas = res);

  }

  loadModelos() {
    this.modelos = [];
    this.id_modelo = 0;

    if (!this.id_marca) return;

    this.maquinariaService.getModelos(this.id_marca)
      .subscribe(res => this.modelos = res);
  }

  closeModal() {
    this.showModal = false


  }

  loadArrendadoresMaquinaria() {
    this.maquinariaService.getArreandadores()
      .subscribe(res => this.arrendadores = res);


  }

  async saveMaquinaria() {

    // ===== CAMPOS FIJOS =====
    const payload: any = {
      id_tipo_de_adquisicion: this.id_tipo_de_adquisicion,
      numero_activo: this.numero_activo,
      numero_serie: this.numero_serie.toUpperCase(),
      descripcion: this.descripcion.toUpperCase(),
      id_marca: this.id_marca,
      id_modelo: this.id_modelo,
      anio: this.anio,
      id_documentos: this.id_documentos
    };

    // ===== CAMPOS CONDICIONALES =====
    switch (Number(this.id_tipo_de_adquisicion)) {

      // 🟢 1 = PROPIO
      case 1:
        payload.valor_compra = this.valor_compra;
        payload.importe_con_iva = this.importe_con_iva;
        payload.importe_sin_iva = this.importe_sin_iva;
        payload.fecha_de_adquisicion = this.fecha_de_adquisicion;
        break;

      // 🟡 2 = LEASING
      case 2:
        payload.valor_compra = this.valor_compra;
        payload.fecha_de_adquisicion = this.fecha_de_adquisicion;
        payload.plazo = this.plazo;
        payload.pago_mensual = this.pago_mensual;
        break;

      // 🔵 3 = ARRENDADA
      case 3:
        payload.id_arrendador = this.id_arrendador;
        payload.monto_renta_mensual = this.monto_renta_mensual;
        payload.plazo = this.plazo;
        break;
    }

    //console.log('PAYLOAD', payload);
    const res = await this.maquinariaService.saveMaquinaria(payload);

    this.maquinariaService.getMaquinaria().subscribe(res => {
        this.maquinaria = res as any[];
      });

  }

  onTipoAdquisicionChange() {

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

    console.log(this.tituloAdquisicion)
    this.valor_compra = '';
    this.importe_con_iva= '';
    this.importe_sin_iva= '';
    this.fecha_de_adquisicion = '';
    this.plazo = 0;
    this.pago_mensual = 0;
    this.id_arrendador = 0;
    this.monto_renta_mensual = 0;
  }
}
