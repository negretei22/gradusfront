import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  private api = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  getUsers() {
    return this.http.get(`${this.api}/users`);
  }
}
