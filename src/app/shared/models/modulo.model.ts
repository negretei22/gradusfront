import { UserRole } from './user.model';

export interface Modulo {
  nombre: string;
  ruta: string;
  icono: string;
  roles: UserRole[];
}

export const MODULOS_CONFIG: Modulo[] = [
  { nombre: 'Activos', ruta: '/maquinaria', icono: '🚜', roles: [UserRole.ADMIN, UserRole.GERENTE, UserRole.USUARIO, UserRole.CONTADOR] },
  { nombre: 'Caja Chica', ruta: '/caja-chica', icono: '💵', roles: [UserRole.ADMIN, UserRole.GERENTE, UserRole.CONTADOR] },
  { nombre: 'Contratos', ruta: '/contratos', icono: '📑', roles: [UserRole.ADMIN, UserRole.GERENTE, UserRole.USUARIO, UserRole.CONTADOR] },
  { nombre: 'Finanzas', ruta: '/finanzas', icono: '💰', roles: [UserRole.ADMIN, UserRole.GERENTE, UserRole.CONTADOR] },
  { nombre: 'Puerto Peñasco', ruta: '/obra-puerto-penasco', icono: '🏗️', roles: [UserRole.ADMIN, UserRole.GERENTE, UserRole.USUARIO, UserRole.CONTADOR] },
  { nombre: 'Usuarios', ruta: '/users', icono: '👤', roles: [UserRole.ADMIN] },
];