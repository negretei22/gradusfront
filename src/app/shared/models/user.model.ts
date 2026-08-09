export enum UserRole {
  ADMIN = 'admin',
  GERENTE = 'gerente',
  CONTADOR = 'contador',
  USUARIO = 'usuario',
}

export interface User {
  id: string;
  email: string;
  nombre: string;
  role: UserRole;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}