import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserRole } from '../../shared/models/user.model';

export interface CreateUserDto {
  email: string;
  password: string;
  nombre: string;
  role: UserRole;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = 'http://localhost:3000/users';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  createUser(data: CreateUserDto): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateUser(id: string, data: Partial<CreateUserDto>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}