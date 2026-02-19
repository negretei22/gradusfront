import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MaquinariaService {

  private api = 'http://localhost:3000';
  constructor(private http: HttpClient) { }

  getMaquinaria() {
    return this.http.get(`${this.api}/maquinaria`);
  }

  getMarcas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/maquinaria/marcas`);
  }

  getModelos(idMarca: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/maquinaria/modelos/${idMarca}`);
  }
  getArreandadores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/maquinaria/arrendadores`);
  }


  saveMaquinaria(data: any) {
    return firstValueFrom(this.http.post(`${this.api}/maquinaria/save`, data));
  }
}
