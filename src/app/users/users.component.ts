import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UsersService, CreateUserDto } from '../core/services/users.service';
import { UserRole } from '../shared/models/user.model';
import { RolesService, Role } from '../core/services/roles.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  roles: Role[] = []; 
  loading = false;
  error = '';
  showForm = false;
  editingId: string | null = null;

  userForm: FormGroup;
  

  constructor(
    private usersService: UsersService,
    private fb: FormBuilder,
    private rolesService: RolesService,
  ) {
    this.userForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]],
      role: ['', Validators.required],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadRoles(); 
    this.loadUsers();
  }

  loadRoles() {
    this.rolesService.getRoles().subscribe({
      next: (data) => {
        this.roles = data;
        // Si hay roles, poner el primero como default
        if (data.length > 0 && !this.editingId) {
          this.userForm.patchValue({ role: data[0].nombre });
        }
      },
      error: (err) => console.error('Error cargando roles:', err)
    });
  }


  loadUsers() {
    this.loading = true;
    this.usersService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al cargar usuarios';
        this.loading = false;
      }
    });
  }

  onSubmit() {
    if (this.userForm.invalid) return;

    const data: CreateUserDto = this.userForm.value;

    if (this.editingId) {
      // Si estamos editando, no enviamos password si está vacío
      if (!data.password) {
        delete (data as any).password;
      }
      this.usersService.updateUser(this.editingId, data).subscribe({
        next: () => {
          this.loadUsers();
          this.cancelEdit();
        },
        error: (err) => this.error = err.error?.message || 'Error al actualizar'
      });
    } else {
      this.usersService.createUser(data).subscribe({
        next: () => {
          this.loadUsers();
          this.cancelEdit();
        },
        error: (err) => this.error = err.error?.message || 'Error al crear usuario'
      });
    }
  }

  editUser(user: any) {
    this.editingId = user.id;
    this.showForm = true;
    this.userForm.patchValue({
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    // Quitar validación de password al editar
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
  }

  deleteUser(id: string) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    this.usersService.deleteUser(id).subscribe({
      next: () => this.loadUsers(),
      error: (err) => this.error = err.error?.message || 'Error al eliminar'
    });
  }

  cancelEdit() {
    this.showForm = false;
    this.editingId = null;
    this.userForm.reset({
      role: UserRole.USUARIO,
      isActive: true
    });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(4)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.error = '';
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      admin: 'Administrador',
      gerente: 'Gerente',
      contador: 'Contador',
      usuario: 'Usuario'
    };
    return labels[role] || role;
  }
}