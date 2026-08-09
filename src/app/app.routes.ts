import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserRole } from './shared/models/user.model';

import { LoginComponent } from './login/login.component';
import { UsersComponent } from './users/users.component';
import { ContratosComponent } from './contratos/contratos.component';
import { LicitacionesComponent } from './licitaciones/licitaciones.component';
import { MaquinariaComponent } from './maquinaria/maquinaria.component';
import { FinanzasComponent } from './finanzas/finanzas.component';
import { MonitorProcedimientosComponent } from './monitor-procedimientos/monitor-procedimientos.component';
import { CajaChicaComponent } from './caja-chica/caja-chica.component';

export const routes: Route[] = [
  { path: 'login', component: LoginComponent },

  {
    path: 'users',
    component: UsersComponent,
    canActivate: [authGuard, roleGuard([UserRole.ADMIN])],
  },
  {
    path: 'contratos',
    component: ContratosComponent,
    canActivate: [authGuard, roleGuard([UserRole.ADMIN, UserRole.GERENTE])],
  },
  {
    path: 'licitaciones',
    component: LicitacionesComponent,
    canActivate: [authGuard, roleGuard([UserRole.ADMIN, UserRole.GERENTE])],
  },
  {
    path: 'maquinaria',
    component: MaquinariaComponent,
    canActivate: [authGuard],
  },
  {
    path: 'finanzas',
    component: FinanzasComponent,
    canActivate: [authGuard, roleGuard([UserRole.ADMIN, UserRole.GERENTE, UserRole.CONTADOR])],
  },
  {
    path: 'monitor-procedimientos',
    component: MonitorProcedimientosComponent,
    canActivate: [authGuard, roleGuard([UserRole.ADMIN, UserRole.GERENTE, UserRole.USUARIO])],
  },
  {
    path: 'caja-chica',
    component: CajaChicaComponent,
    canActivate: [authGuard, roleGuard([UserRole.ADMIN, UserRole.GERENTE, UserRole.CONTADOR])],
  },

  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];