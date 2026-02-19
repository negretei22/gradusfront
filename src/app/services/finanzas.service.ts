import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FinanzasService {

  private api = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  getMovimientos() {
    return this.http.get(`${this.api}/finanzas`);
  }

  getCatalogo(catalogo: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/finanzas/${catalogo}`);
  }

  getSaldo() {
    return this.http.get(`${this.api}/finanzas/saldo`);
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
