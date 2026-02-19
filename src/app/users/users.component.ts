import { Component, OnInit } from '@angular/core';
import { UsersService } from '../services/users.service';
import { CommonModule } from '@angular/common';

@Component({
  imports: [CommonModule],
  selector: 'app-users',
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {

  users: any[] = [];

  constructor(private usersService: UsersService) {}

  ngOnInit() {
    this.usersService.getUsers().subscribe(res => {
      console.log(res);
      this.users = res as any[];
    });
  }
}
