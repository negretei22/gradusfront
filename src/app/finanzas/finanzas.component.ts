import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';
import { FinanzasService } from '../services/finanzas.service';
import { AlertsService } from '../core/alerts.service';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import JSZip from "jszip";


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
  rfc: string = ''
  folio_fiscal: string = ''
  editing: boolean = false
  mostrarBuscador: boolean = false // controla visibilidad
  filtroMovimiento: string = ''
  movimientosFiltrados: any[] = []
  showModal = false
  bloquearRazon = false
  tipo_movimiento_id: number = 0
  fecha_pago: string = '0000-00-00'
  fecha_factura: string = '0000-00-00'
  concepto: string = ''
  descripcion: string = ''
  importe_sin_iva: number | null = null;
  iva_acreditable: number | null = null;
  iva_traslado: number | null = null;
  isr_retenido: number | null = null;
  iva_retenido: number | null = null;
  granTotal: number | null = null;
  filtroAnio: number = 2026;
  filtroMes: number = 2;
  categoria_id: any = '';
  categorias: any[] = []
  cuenta_id: any[] = []
  cuentas: any[] = []
  metodo_pago_id: any = '';
  metodosPago: any[] = []
  referencia: string = ''
  ingresos = 0;
  egresos = 0;
  inversiones = 0;
  saldo = 0;
  iva: number = 16; // default
  total: number = 0;
  archivo: File | null = null;
  archivoNombre: string = '';
  archivoActual: string = '';
  isDragging = false;


  mostrarArchivo = false;

  toggleArchivo() {
    this.mostrarArchivo = !this.mostrarArchivo;
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

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {

    event.preventDefault();
    this.isDragging = false;

    if (event.dataTransfer?.files.length) {

      const file = event.dataTransfer.files[0];

      this.archivo = file;
      this.archivoNombre = file.name;

    }

  }

  esImagen(nombre: string) {
    return nombre?.match(/\.(jpg|jpeg|png|gif)$/i);
  }

  verArchivo(nombre: string) {
    window.open(`http://localhost:3000/uploads/movimientos/${nombre}`, '_blank');
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivo = file;
      console.log("Archivo seleccionado:", this.archivo);
    }
  }


  openModal() {
    this.showModal = true
    //this.getCategorias()
    this.getMetodosPago()
  }

  cargaCategorias(id_categoria: number) {
    this.resetForm()
    this.getCategorias(id_categoria)
  }


  cargarMovimientos() {
    this.getSaldo(this.filtroAnio, this.filtroMes)
    this.finanzasService.getMovimientos(this.filtroAnio, this.filtroMes).subscribe(res => {
      this.movimientos = res as any[];
      this.movimientosFiltrados = [...this.movimientos];
    });
  }
  calcularTotal() {
    //console.log("entro")
    const m = Number(this.importe_sin_iva) || 0;
    const ivaNum = Number(this.iva) || 0;
    const m2 = Number(this.iva_acreditable) || 0;
    const m3 = Number(this.iva_traslado) || 0;
    const m4 = Number(this.isr_retenido) || 0;
    const m5 = Number(this.iva_retenido) || 0;

    const ivaCalc = m * ivaNum / 100;

    //console.log(this.tipo_movimiento_id, typeof this.tipo_movimiento_id);

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

    //this.tipo_movimiento_id = 1;
    this.categoria_id = '';
    this.fecha_pago = '';
    this.fecha_factura = '';

    this.folio_fiscal = '';
    this.rfc = '';
    this.razon_social = '';
    this.concepto = '';

    this.metodo_pago_id = '';
    this.importe_sin_iva = null
    this.iva = 16;
    this.iva_acreditable = null
    this.iva_traslado = null
    this.isr_retenido = null
    this.iva_retenido = null

    this.granTotal = null
  }

  ngAfterViewInit() {
    const hoy = new Date();

    this.filtroAnio = hoy.getFullYear();
    this.filtroMes = (hoy.getMonth() + 1);

    setTimeout(() => {
      this.cargarMovimientos();
      this.getSaldo(this.filtroAnio, this.filtroMes);
    });
  }


  ngOnInit() {

    this.getSaldo(this.filtroAnio, this.filtroMes)


    this.finanzasService.getMovimientos().subscribe(res => {
      this.movimientos = res as any[];
      this.movimientosFiltrados = [...this.movimientos];
    });

  }


  editMovimiento(movimiento: any) {



    this.editing = true
    this.id = movimiento.id
    this.titulo = 'Editar Movimiento Financiero'
    this.textoBoton = 'Actualizar'
    this.getMetodosPago()
    this.tipo_movimiento_id = +movimiento.tipo_movimiento_id;
    this.getCategorias(this.tipo_movimiento_id)
    this.categoria_id = movimiento.categoria_id;
    this.fecha_pago = movimiento.fecha_pago.split('T')[0];;
    this.fecha_factura = movimiento.fecha_factura.split('T')[0];;
    this.folio_fiscal = movimiento.folio_fiscal;
    this.rfc = movimiento.rfc;
    this.razon_social = movimiento.razon_social;
    this.concepto = movimiento.concepto;
    this.descripcion = movimiento.descripcion;
    this.importe_sin_iva = movimiento.importe_sin_iva;
    this.iva_acreditable = movimiento.iva_acreditable;
    this.iva_traslado = movimiento.iva_traslado;
    this.isr_retenido = movimiento.isr_retenido;
    this.metodo_pago_id = movimiento.metodo_pago_id;

    if (movimiento.archivo) {
      this.archivoActual = movimiento.archivo;
      this.archivoNombre = movimiento.archivo;
      this.mostrarArchivo = true;
    }

    this.showModal = true; // abre modal




  }


  deleteMovimiento(id: number) {

  }

  async getCategorias(id_categoria: number) {

    await this.finanzasService.getCategorias(id_categoria).subscribe(res => {
      this.categorias = res;
    });
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
      "FOLIO FISCAL", "RFC EMISOR", "NOMBRE O RAZÓN SOCIAL DEL EMISOR",
      "CONCEPTO", "IMPORTE SIN IVA (BASE ISR)", "IVA Acreditable (Pagado)",
      "IVA Trasladado (Cobrado)", "ISR Retenido", "IVA Retenido", "MÉTODO DE PAGO", "TOTAL"
    ];

    const formatRow = (m: any, index: number) => {
      const importe = Number(m.importe_sin_iva || 0);
      const ivaAcred = Number(m.iva_acreditable || 0);
      const ivaTras = Number(m.iva_traslado || 0);
      const isr = Number(m.isr_retenido || 0);
      const ivaRet = Number(m.iva_retenido || 0);
      const total = importe + ivaAcred + ivaTras - isr - ivaRet;
      //console.log(total)


      return [
        index + 1,
        m.tipo_movimiento_id == 1 ? 'INGRESO' :
          m.tipo_movimiento_id == 2 ? 'EGRESO' : 'INVERSIÓN',
        m.fecha_pago?.split('T')[0],
        (!m.fecha_factura || m.fecha_factura.startsWith('1899')) ? '' : m.fecha_factura.split('T')[0],
        m.folio_fiscal,
        m.rfc,
        m.razon_social,
        m.concepto,
        importe,
        ivaAcred,
        ivaTras,
        isr,
        ivaRet,
        m.metodo_pago,
        total
      ];
    };

    // FILTROS
    const ingresos = this.movimientosFiltrados.filter((m: any) => m.tipo_movimiento_id == 1);
    const egresos = this.movimientosFiltrados.filter((m: any) => m.tipo_movimiento_id == 2);
    const egresosSinNomina = egresos.filter((m: any) =>
      !m.concepto?.toUpperCase().includes('NÓMINA')
    );
    const nomina = egresos.filter((m: any) =>
      m.concepto?.toUpperCase().includes('NÓMINA')
    );
    const inversiones = this.movimientosFiltrados.filter((m: any) => m.tipo_movimiento_id == 3);

    // SUMAS
    const sum = (arr: any[], field: string) =>
      arr.reduce((t, m) => t + Number(m[field] || 0), 0);

    const calcTotales = (arr: any[]) => {
      const importe = sum(arr, 'importe_sin_iva');
      const ivaAcred = sum(arr, 'iva_acreditable');
      const ivaTras = sum(arr, 'iva_traslado');
      const isr = sum(arr, 'isr_retenido');
      const ivaRet = sum(arr, 'iva_retenido');
      const total = importe + ivaAcred + ivaTras - isr - ivaRet;
      //console.log(total)
      return { importe, ivaAcred, ivaTras, isr, ivaRet, total };
    };

    const totalIngresos = sum(ingresos, 'importe_sin_iva');
    const totalGastos = sum(egresos, 'importe_sin_iva');

    const gastosConIVA = egresos
      .filter((m: any) => Number(m.iva_acreditable) > 0)
      .reduce((t, m) => t + Number(m.importe_sin_iva || 0), 0);

    const ivaTrasladado = sum(ingresos, 'iva_traslado');
    const ivaAcreditable = sum(egresos, 'iva_acreditable');
    const ivaPorPagar = ivaTrasladado - ivaAcreditable;

    const isrRetenido = sum(egresos, 'isr_retenido');
    const ivaRetenido = sum(egresos, 'iva_retenido');

    // ARMAR EXCEL
    const sheetData: any[][] = [];
    const emptyRow = () => Array(headers.length).fill("");

    const addSection = (title: string, data: any[]) => {
      sheetData.push([title]);
      sheetData.push(headers);

      data.forEach((m, i) => sheetData.push(formatRow(m, i)));

      // ---- TOTALES DEL BLOQUE ----
      const t = calcTotales(data);
      sheetData.push([
        ...emptyRow().slice(0, 7),
        "TOTALES",
        t.importe,
        t.ivaAcred,
        t.ivaTras,
        t.isr,
        t.ivaRet,
        "",
        t.total
      ]);

      sheetData.push([]);
      sheetData.push([]);
    };

    addSection("INGRESOS", ingresos);
    addSection("EGRESOS", egresosSinNomina);
    addSection("NÓMINA", nomina);

    addSection("INVERSIONES", inversiones);

    // ===== TOTALES GENERALES =====
    sheetData.push(emptyRow());
    sheetData.push(["", "", "", "", "", "", "", "TOTALES GENERALES"]);

    sheetData.push([...emptyRow().slice(0, 8), "INGRESOS (+)", totalIngresos]);
    sheetData.push([...emptyRow().slice(0, 8), "GASTOS (-)", totalGastos]);

    sheetData.push(emptyRow());
    sheetData.push([...emptyRow().slice(0, 8), "GASTOS QUE GENERARON IVA", gastosConIVA]);

    sheetData.push(emptyRow());
    sheetData.push(["", "", "", "", "", "", "", "IVA"]);

    sheetData.push([...emptyRow().slice(0, 8), "IVA TRASLADADO", ivaTrasladado]);
    sheetData.push([...emptyRow().slice(0, 8), "IVA ACREDITABLE (-)", ivaAcreditable]);
    sheetData.push([...emptyRow().slice(0, 8), "IVA POR PAGAR", ivaPorPagar]);

    sheetData.push(emptyRow());
    sheetData.push(["", "", "", "", "", "", "", "RETENCIONES"]);

    sheetData.push([...emptyRow().slice(0, 8), "ISR RETENIDO", isrRetenido]);
    sheetData.push([...emptyRow().slice(0, 8), "IVA RETENIDO", ivaRetenido]);

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Finanzas');

    // FORMATO MONEDA
    const ref = worksheet['!ref'];
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      const moneyCols = [8, 9, 10, 11, 12, 14];

      for (let R = range.s.r; R <= range.e.r; R++) {
        moneyCols.forEach(C => {
          const cell = XLSX.utils.encode_cell({ r: R, c: C });
          if (worksheet[cell] && typeof worksheet[cell].v === 'number') {
            worksheet[cell].z = '$#,##0.00';
          }
        });
      }

      // CALIBRI 8
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

    // 1️⃣ agregar el excel que ya generas
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    zip.file("finanzas.xlsx", excelBuffer);

    // 2️⃣ descargar adjuntos
    for (const m of this.movimientosFiltrados) {

      if (m.archivo) {

        const url = `http://localhost:3000/uploads/movimientos/${m.archivo}`;

        const response = await fetch(url);
        const blob = await response.blob();

        zip.file(`comprobantes/${m.archivo}`, blob);

      }

    }

    // 3️⃣ generar zip
    const zipBlob = await zip.generateAsync({ type: "blob" });

    saveAs(zipBlob, "finanzas.zip");

  }


  closeModal() {

    this.showModal = false
    this.resetForm()
  }


  forzarConsulta() {
    this.traeRazonSocial();
  }

  async traeRazonSocial() {



    if (this.rfc && this.rfc.length >= 12) {

      await this.finanzasService.getRazonSocial(this.rfc).subscribe(res => {
        if (res.length > 0) {

          this.bloquearRazon = true

          this.razon_social = res[0].razon_social;
        } else {
          this.bloquearRazon = false
          this.razon_social = ''
        }
      });
    } else {
      this.razon_social = ''
    }

  }

  getPrimerDiaMes(): string {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const yyyy = primerDia.getFullYear();
    const mm = String(primerDia.getMonth() + 1).padStart(2, '0');
    const dd = '01';

    return `${yyyy}-${mm}-${dd}`;
  }

  async saveMovimiento() {

    const formData = new FormData();

    formData.append('id', String(this.id) ?? '');
    formData.append('tipo_movimiento_id', String(this.tipo_movimiento_id));
    formData.append('fecha_pago', this.fecha_pago ? this.fecha_pago : '0000-00-00');
    formData.append('fecha_factura', this.fecha_factura ? this.fecha_factura : this.getPrimerDiaMes());
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

    if (this.archivo) {

      formData.append('archivo', this.archivo);
    }

    // console.log("Data",formData)
    try {

      const res = this.editing
        ? await this.finanzasService.updateMovimiento(this.id, formData)
        : await this.finanzasService.saveMovimiento(formData);

      console.log(res);

      this.showModal = false;

      this.alert.AlertaVerde('', 'Se agregó el contrato exitosamente.');

      this.getSaldo(this.filtroAnio, this.filtroMes);

      this.cargarMovimientos();

    } catch (err: any) {

      console.log(err);

    }

  }


}
