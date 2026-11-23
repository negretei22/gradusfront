import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface PagoRecurrenteDto {
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
}

export interface ReportePagos {
  filas: ReporteFila[];
  totales: { fiscal: number; no_fiscal: number };
}

@Injectable({
  providedIn: 'root'
})
export class PagosRecurrentesService {

  private api = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/pagos-recurrentes`);
  }

  get(id: number): Observable<any> {
    return this.http.get(`${this.api}/pagos-recurrentes/${id}`);
  }

  create(dto: PagoRecurrenteDto): Observable<any> {
    return this.http.post(`${this.api}/pagos-recurrentes`, dto);
  }

  update(id: number, dto: PagoRecurrenteDto): Observable<any> {
    return this.http.put(`${this.api}/pagos-recurrentes/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.api}/pagos-recurrentes/${id}`);
  }

  reporte(anio: number, mes: number): Observable<ReportePagos> {
    return this.http.get<ReportePagos>(`${this.api}/pagos-recurrentes/reporte/${anio}/${mes}`);
  }

  buscarFacturas(texto: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/pagos-recurrentes/buscar-facturas`, {
      params: { texto }
    });
  }
}
