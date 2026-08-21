import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { moduloGuard } from './core/guards/modulo.guard';
import { LoginComponent } from './login/login.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { UserRole } from './shared/models/user.model';

import { UsersComponent } from './users/users.component';
import { ContratosComponent } from './contratos/contratos.component';
import { LicitacionesComponent } from './licitaciones/licitaciones.component';
import { MaquinariaComponent } from './maquinaria/maquinaria.component';
import { FinanzasComponent } from './finanzas/finanzas.component';
import { MonitorProcedimientosComponent } from './monitor-procedimientos/monitor-procedimientos.component';
import { CajaChicaComponent } from './caja-chica/caja-chica.component';
import { ObraPuertoPenascoComponent } from './obra-puerto-penasco/obra-puerto-penasco.component';
import { ServicioComponent } from './servicios/servicio.component';

export const routes: Route[] = [
  // 🔓 PÚBLICO — sin menú lateral
  { path: 'login', component: LoginComponent },

  // 🔒 PROTEGIDO — con menú lateral
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard], // El auth va aquí, antes de entrar al layout
    children: [
      {
        path: 'users',
        component: UsersComponent,
        canActivate: [moduloGuard],
      },
      {
        path: 'maquinaria',
        component: MaquinariaComponent,
        canActivate: [moduloGuard],
      },
      {
        path: 'caja-chica',
        component: CajaChicaComponent,
        canActivate: [moduloGuard],
      },
      {
        path: 'contratos',
        component: ContratosComponent,
        canActivate: [moduloGuard],
      },
      {
        path: 'finanzas',
        component: FinanzasComponent,
        canActivate: [moduloGuard],
      },
      {
        path: 'licitaciones',
        component: LicitacionesComponent,
        canActivate: [moduloGuard],
      },
      {
        path: 'monitor-procedimientos',
        component: MonitorProcedimientosComponent,
        canActivate: [moduloGuard],
      },
      {
        path: 'obra-puerto-penasco',
        component: ObraPuertoPenascoComponent,
        canActivate: [moduloGuard],
      },
      {
        path: 'servicios',
        component: ServicioComponent,
        canActivate: [moduloGuard],
      },
      {
        path: 'modulos',
        loadComponent: () => import('./modulos/modulos.component').then(m => m.ModulosComponent),
      //  canActivate: [authGuard, moduloGuard],
      },
      {
        path: '',
        redirectTo: 'finanzas',
        pathMatch: 'full',
      },
    ],
  },

  {
    path: 'unauthorized',
    loadComponent: () => import('./unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },

  { path: '**', redirectTo: '/login' },
];