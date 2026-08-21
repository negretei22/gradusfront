import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();


    console.log('🌐 Interceptor - Petición a:', req.url);
  console.log('🔑 Token presente:', !!token);

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el backend responde 401 (token expirado o inválido)
      if (error.status === 401) {
        authService.logout(); // o limpia manualmente
        router.navigate(['/login'], {
          queryParams: { sesion: 'expirada' }
        });
      }
      return throwError(() => error);
    })
  );
};