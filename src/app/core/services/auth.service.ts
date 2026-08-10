import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, switchMap, map } from 'rxjs';
import { Router } from '@angular/router';
import { LoginResponse, User, UserRole } from '../../shared/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/auth';
  private baseUrl = 'http://localhost:3000';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  private permisosSubject = new BehaviorSubject<any>(null);
  public permisos$ = this.permisosSubject.asObservable();

  // Obtener permisos del backend para la ruta actual
  getPermisos(ruta: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/modulos/permisos/${ruta}`).pipe(
      tap(p => this.permisosSubject.next(p))
    );
  }

  // Verificar rápido si tiene un permiso (sin llamar al backend)
  hasPermiso(accion: string): boolean {
    const permisos = this.permisosSubject.value?.permisos || [];
    return permisos.includes(accion);
  }

  private loadUserFromStorage() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const modulos = localStorage.getItem('modulos');
    if (token && user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap(res => this.setSession(res)),
        switchMap(res => this.cargarModulos().pipe(
          map(() => res) // Devuelve la respuesta original después de cargar módulos
        ))
      );
  }

  private setSession(res: LoginResponse) {
    localStorage.setItem('token', res.access_token);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.currentUserSubject.next(res.user);
  }

  cargarModulos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/modulos`).pipe(
      tap(modulos => {
        localStorage.setItem('modulos', JSON.stringify(modulos));
      })
    );
  }

  getModulosGuardados(): any[] {
    const modulos = localStorage.getItem('modulos');
    return modulos ? JSON.parse(modulos) : [];
  }

  // 👈 NUEVO: Verifica si tiene acceso a una ruta específica
  canAccess(ruta: string): boolean {
    const modulos = this.getModulosGuardados();
    return modulos.some((m: any) => m.ruta === ruta);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('modulos');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: UserRole): boolean {
    return this.currentUserSubject.value?.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const userRole = this.currentUserSubject.value?.role;
    return userRole ? roles.includes(userRole) : false;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}