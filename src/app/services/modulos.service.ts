import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

export interface Modulo {
  id: string;
  nombre: string;
  ruta: string;
  icono: string;
  permisos: Record<string, string[]>;
  activo: number;
}

@Injectable({
  providedIn: 'root'
})
export class ModulosService {

  private api = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  getMenu(): Observable<Modulo[]> {
    return this.http.get<Modulo[]>(`${this.api}/modulos`);
  }

  getAll(): Observable<Modulo[]> {
    return this.http.get<Modulo[]>(`${this.api}/modulos/all`);
  }

  getPermisos(ruta: string): Observable<any> {
    const rutaLimpia = ruta.replace(/^\//, '');
    return this.http.get<any>(`${this.api}/modulos/permisos/${rutaLimpia}`);
  }

  create(data: Partial<Modulo>): Observable<any> {
    return this.http.post(`${this.api}/modulos`, data);
  }

  update(id: string, data: Partial<Modulo>): Observable<any> {
    return this.http.put(`${this.api}/modulos/${id}`, data);
  }

  updatePermisos(id: string, permisos: Record<string, string[]>) {
    return firstValueFrom(
      this.http.put(`${this.api}/modulos/${id}/permisos`, { permisos })
    );
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.api}/modulos/${id}`);
  }
}