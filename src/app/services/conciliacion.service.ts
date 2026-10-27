import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = 'http://localhost:3000/conciliacion';

@Injectable({ providedIn: 'root' })
export class ConciliacionService {
  constructor(private http: HttpClient) { }

  cargar(anio: number, mes: number): Observable<any> {
    return this.http.get<any>(`${API}/${anio}/${mes}`);
  }

  conciliar(archivo: File, reemplazar = false): Observable<any> {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return this.http.post(`${API}/pdf${reemplazar ? '?reemplazar=1' : ''}`, fd);
  }

    unir(id: number, banco_ids: number[], sistema_ids: number[], comentario: string): Observable<any> {
    return this.http.post<any>(`${API}/${id}/unir`, { banco_ids, sistema_ids, comentario });
  }

  quitarUnion(grupoId: number): Observable<any> {
    return this.http.delete<any>(`${API}/grupo/${grupoId}`);
  }

  agregarNota(id: number, lado: 'banco' | 'sistema', ref_id: number, comentario: string): Observable<any> {
    return this.http.post<any>(`${API}/${id}/nota`, { lado, ref_id, comentario });
  }

  quitarNota(notaId: number): Observable<any> {
    return this.http.delete<any>(`${API}/nota/${notaId}`);
  }
}