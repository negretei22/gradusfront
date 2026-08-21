import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const moduloGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🛡️ moduloGuard ejecutado para ruta:', route.routeConfig?.path);
  console.log('🔑 isAuthenticated:', authService.isAuthenticated());

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const ruta = '/' + route.routeConfig?.path; // ej: "/finanzas"
  const modulos = authService.getModulosGuardados();
  
  // Si no hay módulos cargados, intentar validar por rol como fallback
  if (modulos.length === 0) {
    // Recargar módulos y dejar pasar por ahora (se validará en próxima navegación)
    authService.cargarModulos().subscribe();
  }

  const tieneAcceso = modulos.some((m: any) => m.ruta === ruta);

  if (!tieneAcceso) {
    router.navigate(['/unauthorized']);
    return false;
  }

  return true;
};