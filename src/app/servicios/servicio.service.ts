import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ServicioService {
  private api = 'http://localhost:3000';
  constructor(private http: HttpClient) {}

  getServicios() {
    return this.http.get(`${this.api}/servicio`);
  }

  getTiposServicio(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/servicio/tipos`);
  }

  saveServicio(data: FormData) {
    return firstValueFrom(this.http.post(`${this.api}/servicio/save`, data));
  }

  updateServicio(data: FormData) {
    return firstValueFrom(this.http.put(`${this.api}/servicio/update`, data));
  }

  deleteServicio(id: number) {
    return firstValueFrom(this.http.delete(`${this.api}/servicio/delete/${id}`));
  }
}