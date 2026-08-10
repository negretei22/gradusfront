import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { moduloGuard } from './core/guards/modulo.guard';
import { LoginComponent } from './login/login.component';
import { UserRole } from './shared/models/user.model';

import { UsersComponent } from './users/users.component';
import { ContratosComponent } from './contratos/contratos.component';
import { LicitacionesComponent } from './licitaciones/licitaciones.component';
import { MaquinariaComponent } from './maquinaria/maquinaria.component';
import { FinanzasComponent } from './finanzas/finanzas.component';
import { MonitorProcedimientosComponent } from './monitor-procedimientos/monitor-procedimientos.component';
import { CajaChicaComponent } from './caja-chica/caja-chica.component';
import { ObraPuertoPenascoComponent } from './obra-puerto-penasco/obra-puerto-penasco.component';


export const routes: Route[] = [
  { path: 'login', component: LoginComponent },

  // 👤 Usuarios — Solo Admin
  {
    path: 'users',
    component: UsersComponent,
    canActivate: [authGuard, moduloGuard],
  },

  // 🚜 Activos — Admin, Gerente, Contador, Usuario
  {
    path: 'maquinaria',
    component: MaquinariaComponent,
    canActivate: [authGuard, moduloGuard],
  },

  // 💵 Caja Chica — Admin, Gerente, Contador
  {
    path: 'caja-chica',
    component: CajaChicaComponent,
    canActivate: [authGuard, moduloGuard],
  },

  // 📑 Contratos — Admin, Gerente, Contador, Usuario
  {
    path: 'contratos',
    component: ContratosComponent,
    canActivate: [authGuard, moduloGuard],
  },

  // 💰 Finanzas — Admin, Gerente, Contador
  {
    path: 'finanzas',
    component: FinanzasComponent,
    canActivate: [authGuard, moduloGuard],
  },


  // 🏗️ Licitaciones — Admin, Gerente
  {
    path: 'licitaciones',
    component: LicitacionesComponent,
    canActivate: [authGuard, moduloGuard],
  },

  // 📊 Monitor Procedimientos — Admin, Gerente, Usuario
  {
    path: 'monitor-procedimientos',
    component: MonitorProcedimientosComponent,
    canActivate: [authGuard, moduloGuard],
  },
  {
    path: 'obra-puerto-penasco',
    component: ObraPuertoPenascoComponent, // 👈 Importar directo, no lazy
    canActivate: [authGuard, moduloGuard],
  },

  // ❌ Página de "No autorizado"
  {
    path: 'unauthorized',
    loadComponent: () => import('./unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },

  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];