import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConciliacionService {
  constructor(private http: HttpClient) { }

  conciliar(archivo: File): Observable<any> {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return this.http.post('http://localhost:3000/conciliacion/pdf', fd);
  }
}