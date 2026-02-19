import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';
import { FinanzasService } from '../services/finanzas.service';
import { AlertsService } from '../core/alerts.service';
@Component({
  selector: 'app-finanzas',
  imports: [CommonModule, FormsModule, NgxMaskDirective],
  templateUrl: './finanzas.component.html',
  styleUrl: './finanzas.component.css'
})
export class FinanzasComponent {

  constructor(private finanzasService: FinanzasService, private alert: AlertsService) { }


  movimientos: any[] = []
  titulo: string = 'Nuevo Movimento Financiero'
  id: number = 0;
  textoBoton: string = 'Guardar'
  razon_social: string = ''
  folio: string = ''
  editing: boolean = false
  mostrarBuscador: boolean = false // controla visibilidad
  filtroMovimiento: string = ''
  movimientosFiltrados: any[] = []
  showModal = false
  tipo_movimiento_id: any[] = []
  fecha: any[] = []
  concepto: string = ''
  descripcion: string = ''
  monto: any[] = []
  monto2: any[] = []
  monto3: any[] = []
  monto4: any[] = []
  granTotal: number = 0
  montoMasIva: number = 0
  categoria_id: any[] = []
  categorias: any[] = []
  cuenta_id: any[] = []
  cuentas: any[] = []
  metodo_pago_id: any[] = []
  metodosPago: any[] = []
  referencia: string = ''
  ingresos = 0;
  egresos = 0;
  saldo = 0;
  iva: number = 16; // default
  total: number = 0;


  openModal() {
    this.showModal = true
    this.getCategorias()
    this.getMetodosPago()
  }

  calcularTotal() {
    const m = Number(this.monto) || 0;
    const ivaNum = Number(this.iva) || 0;
    const m2 = Number(this.monto2) || 0;
    const m3 = Number(this.monto3) || 0;
    const m4 = Number(this.monto4) || 0;

    const ivaCalc = m * ivaNum / 100;
    
    this.montoMasIva = m + ivaCalc;

    this.granTotal = this.montoMasIva + m2 + m3 + m4;
  }
  filtrarMovimientos() {

  }


  ngOnInit() {

    this.getSaldo();

    this.finanzasService.getMovimientos().subscribe(res => {
      this.movimientos = res as any[];
      this.movimientosFiltrados = [...this.movimientos];
    });

  }


  editMovimiento(movimiento: any) {

    console.log(movimiento)

    this.editing = true
    this.id = movimiento.id
    this.titulo = 'Editar Movimiento Financiero'
    this.textoBoton = 'Actualizar'
    this.getCategorias()
    this.getMetodosPago()
    this.tipo_movimiento_id = movimiento.tipo_movimiento_id;
    this.fecha = movimiento.fecha;
    this.folio = movimiento.folio;
    this.razon_social = movimiento.razon_social;
    this.concepto = movimiento.concepto;
    this.descripcion = movimiento.descripcion;
    this.monto = movimiento.monto;
    this.monto2 = movimiento.monto2;
    this.monto3 = movimiento.monto3;
    this.monto4 = movimiento.monto4;
    this.categoria_id = movimiento.categoria_id;
    this.metodo_pago_id = movimiento.metodo_pago_id;
    

    this.showModal = true; // abre modal




  }


  deleteMovimiento(id: number) {

  }

  async getCategorias() {

    await this.finanzasService.getCatalogo('categorias').subscribe(res => {
      this.categorias = res;
    });
  }


  async getSaldo() {
    await this.finanzasService.getSaldo().subscribe((res: any) => {
      this.ingresos = res.ingresos;
      this.egresos = res.egresos;
      this.saldo = res.saldo;
    });
  }

  async getMetodosPago() {
    await this.finanzasService.getCatalogo('metodos_pago').subscribe(res => {
      this.metodosPago = res;
    });
  }

  closeModal() {

    this.showModal = false
  }

  async saveMovimiento() {


    const movimiento = {
      id: this.id,
      tipo_movimiento_id: this.tipo_movimiento_id,
      fecha: this.fecha,
      concepto: this.concepto.toUpperCase(),
      razon_social: this.razon_social.toUpperCase(),
      monto: this.monto,
      iva: this.iva,
      monto_mas_iva: this.montoMasIva,
      monto2: this.monto2,
      monto3: this.monto3,
      monto4: this.monto4,
      gran_total: this.granTotal,
      categoria_id: this.categoria_id,
      cuenta_id: 1,
      metodo_pago_id: this.metodo_pago_id,
      folio: this.folio.toUpperCase(),
    };

    console.log(movimiento)
  
    try {
      const res = this.editing
        ? await this.finanzasService.updateMovimiento(this.id, movimiento)
        : await this.finanzasService.saveMovimiento(movimiento);
      console.log(res);

      this.showModal = false;
      this.alert.AlertaVerde('', 'Se agregó el contrato exitosamente.')
      this.getSaldo();
      this.finanzasService.getMovimientos().subscribe(res => {
        this.movimientos = res as any[];
        this.movimientosFiltrados = [...this.movimientos];
      });



    } catch (err: any) {


    }


  }


}
