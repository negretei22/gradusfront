import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:3000/bancos-caja-chica';

@Injectable({ providedIn: 'root' })
export class BancosCajaChicaService {
    constructor(private http: HttpClient) { }

    getMes(anio: number, mes: number): Observable<any> {
        return this.http.get<any>(`${API_URL}/${anio}/${mes}`);
    }

    guardarSaldo(anio: number, mes: number, data: any): Observable<any> {
        return this.http.post(`${API_URL}/saldo/${anio}/${mes}`, data);
    }

    cerrarMes(anio: number, mes: number): Observable<any> {
        return this.http.post(`${API_URL}/cerrar/${anio}/${mes}`, {});
    }
}