import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CobroRecurrenteDto {
  concepto: string;
  beneficiario: string;
  fiscal: number;
  no_fiscal: number;
  dia_pago: number | null;
  activo: boolean;
  monto_factura: boolean;
  movimiento_id?: number | null;
  factura_ids: number[];
  facturas?: any[];
}

export interface ReporteFila {
  concepto: string;
  beneficiario: string;
  fiscal: number;
  no_fiscal: number;
  fecha_pago: string | null;
  pagado: boolean;
  origen?: string;
  pago_recurrente_id?: number;
  movimiento_id?: number;
  incluido?: boolean;
  // Facturas ligadas (cobros, v13): cada una trae folio_fiscal; las usa el
  // formulario de cobros. El FOLIO del Excel ya NO sale de aquí (v14: sale
  // de fila.factura, ver abajo).
  facturas?: any[];
  // Factura del movimiento (v14): sale de archivo_factura
  // (["518_87.pdf","518_89.pdf"] -> "F87 y F89"); la trae el back en el
  // reporte y se muestra en la columna FACTURA de la Programación.
  factura?: string;
}

export interface ReportePagos {
  filas: ReporteFila[];
  totales: { fiscal: number; no_fiscal: number };
}

@Injectable({
  providedIn: 'root'
})
export class CobrosRecurrentesService {

  private api = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/cobros-recurrentes`);
  }

  get(id: number): Observable<any> {
    return this.http.get(`${this.api}/cobros-recurrentes/${id}`);
  }

  create(dto: CobroRecurrenteDto): Observable<any> {
    return this.http.post(`${this.api}/cobros-recurrentes`, dto);
  }

  update(id: number, dto: CobroRecurrenteDto): Observable<any> {
    return this.http.put(`${this.api}/cobros-recurrentes/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.api}/cobros-recurrentes/${id}`);
  }

  reporte(anio: number, mes: number): Observable<ReportePagos> {
    return this.http.get<ReportePagos>(`${this.api}/cobros-recurrentes/reporte/${anio}/${mes}`);
  }

  buscarFacturas(texto: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/cobros-recurrentes/buscar-facturas`, {
      params: { texto }
    });
  }

  marcarPagado(id: number, anio: number, mes: number, pagado: boolean): Observable<any> {
    return this.http.put(`${this.api}/cobros-recurrentes/${id}/pagado`, { anio, mes, pagado });
  }

  guardarSeleccion(anio: number, mes: number, movimiento_id: number, incluido: boolean): Observable<any> {
    return this.http.put(`${this.api}/cobros-recurrentes/seleccion`, { anio, mes, movimiento_id, incluido });
  }

  guardarSeleccionMes(anio: number, mes: number, incluido: boolean): Observable<any> {
    return this.http.put(`${this.api}/cobros-recurrentes/seleccion-mes`, { anio, mes, incluido });
  }
}
