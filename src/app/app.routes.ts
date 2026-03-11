import { Route } from '@angular/router';
import { UsersComponent } from './users/users.component';
import { ContratosComponent } from './contratos/contratos.component';
import { LicitacionesComponent } from './licitaciones/licitaciones.component';
import { MaquinariaComponent } from './maquinaria/maquinaria.component';
import { FinanzasComponent } from './finanzas/finanzas.component';
import { MonitorProcedimientosComponent } from './monitor-procedimientos/monitor-procedimientos.component';


export const routes: Route[] = [
  { path: 'users', component: UsersComponent },
  { path: 'contratos', component: ContratosComponent },
  { path: 'licitaciones', component: LicitacionesComponent },
  { path: 'maquinaria', component: MaquinariaComponent },
  { path: 'finanzas', component: FinanzasComponent },
  { path: 'monitor-procedimientos', component: MonitorProcedimientosComponent },
];
