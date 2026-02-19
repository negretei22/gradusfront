import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';




@Injectable({
  providedIn: 'root'
})
export class ContratosService {

  private api = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  getContratos() {
    return this.http.get(`${this.api}/contratos`);
  }


  saveContrato(data: any) {
    return firstValueFrom(this.http.post(`${this.api}/contratos/save`, data));
  }

  // Trae todas las categorías
  getCategorias(): Observable<any[]> {
    
    return this.http.get<any[]>(`${this.api}/contratos/categorias`);
  }

  // Trae todas las categorías
  getEmpresasParticipantes(): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/contratos/empresas-participantes`);
  }

  // Trae todos los estados
  getEstados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/contratos/estados`);
  }

  // Trae los municipios filtrados por estado
  getMunicipios(idEstado: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/contratos/municipios/${idEstado}`);
  }

  // Trae todas las colonias
  getColonias(idMunicipio: number,codigoPostal: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/contratos/colonias/${idMunicipio}/${codigoPostal}`);
  }

  getContratantes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/contratos/contratantes`);
  }

  getInfoContratante(idContratante: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/contratos/contratante/${idContratante}`);
  }

 

}
