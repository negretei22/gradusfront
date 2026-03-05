import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FinanzasService {

  private api = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  getMovimientos(anio?: number, mes?: number) {
  let params: any = {};
  if (anio) params.anio = anio;
  if (mes) params.mes = mes;

  return this.http.get<any[]>(`${this.api}/finanzas/`,{params});

  }
  getCatalogo(catalogo: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/finanzas/${catalogo}`);
  }

  getRazonSocial(rfc : any): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/finanzas/razon_social/${rfc}`);
    
  }

  getCategorias(id_categoria : any): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/finanzas/categorias/${id_categoria}`);
  }

  getSaldo(anio: number, mes: number) {
    return this.http.get(`${this.api}/finanzas/saldo/${anio}/${mes}`);
  }

  saveMovimiento(data : any) {
      return firstValueFrom(this.http.post(`${this.api}/finanzas/save`, data));
  }

  updateMovimiento(id: any,data : any){


  
      return firstValueFrom(this.http.post(`${this.api}/finanzas/update/${id}`, data));
  }
  
  
  getMovimientoById(id : number ){

    return this.http.get<any>(`${this.api}/finanzas/movimiento/${id}`);

  }

  

}
