import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';

@Injectable({
providedIn:'root'
})
export class ProcedimientosService{

api="http://localhost:3000";

constructor(private http:HttpClient){}

getProcedimientos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/procedimientos`);
  }

}