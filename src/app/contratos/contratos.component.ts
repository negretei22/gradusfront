import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ContratosService } from '../services/contratos.service';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';
import { AlertsService } from '../core/alerts.service';



@Component({
  selector: 'app-contratos',
  imports: [CommonModule, FormsModule, NgxMaskDirective],
  templateUrl: './contratos.component.html',
  styleUrl: './contratos.component.css'
})
export class ContratosComponent {
  
  constructor(private contratoService: ContratosService, private alert: AlertsService) { }

  contratos: any[] = [];
  c: number = 0
  showModal = false
  nuevoContrato: any = {};
  contratoNew: any = ''
  placeHolderContrato = 'Número de contrato'
  filtroContrato: string = ''
  contratosFiltrados: any[] = []
  mostrarBuscador: boolean = false // controla visibilidad
  id_categoria: number = 0
  id_contratante: number = 0
  numero_contrato: string = ''
  descripcion: string = ''
  importe_contratado_sin_iva: any = []
  importe_ejercido_sin_iva: any = []
  id_tipo_participacion: number = 0
  id_empresas_participantes: string = ''
  fecha_de_terminacion: string = ''
  fecha_de_inicio: string = ''
  empresaPrincipal: number | null = null;

  participacionConjunta = false;

  categorias: { id_categoria_contrato: number, nombre_categoria_contrato: string }[] = [];
  estados: { id: number, nombre: string }[] = [];
  municipios: { id: number, nombre: string }[] = [];
  colonias: { id: number, nombre: string }[] = [];
  contratante: { id_contratante: number, razon_social: string }[] = [];

  empresasDisponibles: { id_empresa_participante: number, razon_social: string }[] = [];
  empresasSeleccionadas: {
    id_empresa: number | null,
    razon_social: string
  }[] = [];


  


  ngOnInit() {
    this.contratoService.getContratos().subscribe(res => {
      this.contratos = res as any[];
      this.contratosFiltrados = [...this.contratos];
    });

  }


  traeEmpresasParticipantes() {
    this.contratoService.getEmpresasParticipantes().subscribe(res => {
      this.empresasDisponibles = res;
    });
  }

  onParticipacionChange() {
    if (this.participacionConjunta) {
      this.empresasSeleccionadas = [
        { id_empresa: null, razon_social: '' }
      ];
    } else {
      this.empresasSeleccionadas = [];
    }
  }

  // Agregar nuevo select
  agregarEmpresa() {
    this.empresasSeleccionadas.push({
      id_empresa: null,
      razon_social: ''
    });
  }

  // Eliminar select (solo a partir de la 3ra empresa)
  eliminarEmpresa(i: number) {
    this.empresasSeleccionadas.splice(i, 1);
    this.empresasSeleccionadas = [...this.empresasSeleccionadas]; // refresh DOM
  }

  loadCategorias() {
    this.contratoService.getCategorias().subscribe(res => this.categorias = res);
  }


  loadContratantes() {
    this.contratoService.getContratantes().subscribe(res => this.contratante = res);

  }


  loadEstados() {
    this.contratoService.getEstados().subscribe(res => this.estados = res);
  }

 



  editContrato(contrato: any) {

  }

  
  


  filtrarContratos() {
    const filtro = this.filtroContrato.toUpperCase();
    this.contratosFiltrados = this.contratos.filter(c =>
      c.numero_contrato.toUpperCase().includes(filtro) || c.monto_contrato.toUpperCase().includes(filtro) || c.objeto.toUpperCase().includes(filtro)
    );
  }

  deleteContrato(id: number) {

  }

  openModal() {
    this.showModal = true;
    this.loadCategorias();
    this.loadEstados();
    this.loadContratantes();
    this.traeEmpresasParticipantes();
  }

  closeModal() {
    this.showModal = false;
    this.vaciaCampos()

  }

  async saveContrato() {

    // Categoria
    if (this.id_categoria == 0) {
      this.alert.AlertaRoja('ERROR', 'Campo Categoría obligatorio');
      return;
    }

    // Número de contrato
    if (!this.numero_contrato || this.numero_contrato.trim() === '') {
      this.alert.AlertaRoja('ERROR', 'Número de contrato obligatorio');
      return;
    }

    // Descripción
    if (!this.descripcion || this.descripcion.trim() === '') {
      this.alert.AlertaRoja('ERROR', 'Descripción obligatoria');
      return;
    }

    // Importe contratado
    
    if (!this.importe_contratado_sin_iva || this.importe_contratado_sin_iva <= 0) {
      this.alert.AlertaRoja('ERROR', 'Importe contratado obligatorio');
      return;
    }

    // Importe ejercido
    
    if (!this.importe_ejercido_sin_iva || this.importe_ejercido_sin_iva <= 0) {
      this.alert.AlertaRoja('ERROR', 'Importe ejercido obligatorio');
      return;
    }

    // Empresa principal
    if (!this.empresaPrincipal) {
      this.alert.AlertaRoja('ERROR', 'Empresa contratante obligatoria');
      return;
    }

    // Participación conjunta → debe tener empresas
    if (this.participacionConjunta) {
      const invalidas = this.empresasSeleccionadas.some(e => !e.id_empresa);
      if (invalidas) {
        this.alert.AlertaRoja('ERROR', 'Seleccione al menos una empresa participante en conjunto');
        return;
      }
    }

    // Fecha inicio
    if (!this.fecha_de_inicio) {
      this.alert.AlertaRoja('ERROR', 'Fecha de inicio obligatoria');
      return;
    }

    // Fecha terminación
    if (!this.fecha_de_terminacion) {
      this.alert.AlertaRoja('ERROR', 'Fecha de terminación obligatoria');
      return;
    }

    // Validar fechas (inicio < terminación)
    if (this.fecha_de_inicio > this.fecha_de_terminacion) {
      this.alert.AlertaRoja('ERROR', 'La fecha de inicio no puede ser mayor a la de terminación');
      return;
    }


    

    const contrato = {
      id_categoria: this.id_categoria,
      numero_contrato: this.numero_contrato.toUpperCase(),
      descripcion: this.descripcion.toUpperCase(),
      importe_contratado_sin_iva: this.importe_contratado_sin_iva,
      importe_ejercido_sin_iva: this.importe_ejercido_sin_iva,
      id_contratante: this.id_contratante,
      id_empresa_principal: this.empresaPrincipal,
      id_tipo_participacion: this.participacionConjunta ? 1 : 0,
      empresasSeleccionadas: this.empresasSeleccionadas,
      fecha_de_inicio: this.fecha_de_inicio,
      fecha_de_terminacion: this.fecha_de_terminacion
    };
    
    
    try {
      const res = await this.contratoService.saveContrato(contrato);
      console.log(res);

      this.vaciaCampos()
      this.showModal = false;
      this.alert.AlertaVerde('', 'Se agregó el contrato exitosamente.')

      this.contratoService.getContratos().subscribe(res => {
      this.contratos = res as any[];
      this.contratosFiltrados = [...this.contratos];
    });



    } catch (err: any) {
      console.log(err);
      this.numero_contrato = ''
      this.placeHolderContrato = err.error.numero_contrato
      this.alert.AlertaRoja('Contrato duplicado', `El número de contrato <b>"${err.error.numero_contrato}</b>" ya existe en la base de datos.`);

    }








  }

  parseNumber(value: string) {
    return parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
  }

  vaciaCampos() {
    /* this.numero_contrato = ''
     this.importe_contratado_sin_iva = 0
     this.objeto = ''
     this.placeHolderContrato = 'Número de contrato'*/

  }






}
