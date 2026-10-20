import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


const API_URL = 'http://localhost:3000/caja-chica';

@Injectable({ providedIn: 'root' })
export class CajaChicaService {

  constructor(private http: HttpClient) { }

  // Lista de movimientos (con saldo corrido), opcionalmente filtrados por año/mes
  getMovimientos(anio?: number, mes?: number): Observable<any[]> {
    let url = API_URL;
    const params: string[] = [];
    if (anio) params.push(`anio=${anio}`);
    if (mes) params.push(`mes=${mes}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<any[]>(url);
  }

  getMovimientoById(id: number): Observable<any> {
    return this.http.get<any>(`${API_URL}/movimiento/${id}`);
  }

  getMovimientoFinanciero(id: number): Observable<any> {
    return this.http.get<any>(`${API_URL}/movimiento-financiero/${id}`);
  }

  // Totales para las cards: total_gasto y total_ingreso del periodo, saldo_actual global
  getSaldo(anio: number, mes: number): Observable<{ total_gasto: number; total_ingreso: number; saldo_actual: number }> {
    return this.http.get<{ total_gasto: number; total_ingreso: number; saldo_actual: number }>(
      `${API_URL}/saldo/${anio}/${mes}`
    );
  }







}