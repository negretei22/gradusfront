import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModulosService,Modulo } from '../services/modulos.service';
import { RolesService, Role } from '../core/services/roles.service';

const ACCIONES = ['ver', 'editar', 'eliminar'];

@Component({
  selector: 'app-modulos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modulos.component.html',
  styleUrl: './modulos.component.css'
})
export class ModulosComponent implements OnInit {
  modulos: Modulo[] = [];
  roles: Role[] = [];  // 👈 Ahora dinámico
  acciones = ACCIONES;
  expandido: Record<string, boolean> = {};
  cargando = false;
  mensaje = '';

  // Modal nuevo modulo
  showModal = false;
  nuevoNombre = '';
  nuevaRuta = '';
  nuevoIcono = '';
  mostrarSelectorIconos = false;
  guardando = false;

  constructor(
    private modulosService: ModulosService,
    private rolesService: RolesService  // 👈 Inyectado
  ) { }

  ngOnInit() {
    this.cargarRoles();  // 👈 Carga roles primero
    this.cargarModulos();
  }

  cargarRoles() {
    this.rolesService.getRoles().subscribe({
      next: (data) => {
        this.roles = data;
      },
      error: (err) => {
        console.error('Error cargando roles:', err);
      }
    });
  }

  cargarModulos() {
    this.cargando = true;
    this.modulosService.getAll().subscribe({
      next: (data) => {
        this.modulos = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando modulos:', err);
        this.cargando = false;
      }
    });
  }

  openModal() {
    this.nuevoNombre = '';
    this.nuevaRuta = '';
    this.nuevoIcono = '';
    this.mostrarSelectorIconos = false;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.mostrarSelectorIconos = false;
  }

  seleccionarIcono(icono: string) {
    this.nuevoIcono = icono;
    this.mostrarSelectorIconos = false;
  }

  guardarNuevoModulo() {
    if (!this.nuevoNombre.trim() || !this.nuevaRuta.trim()) {
      this.mensaje = 'Error: Nombre y ruta son obligatorios';
      setTimeout(() => this.mensaje = '', 3000);
      return;
    }

    let ruta = this.nuevaRuta.trim();
    if (!ruta.startsWith('/')) {
      ruta = '/' + ruta;
    }

    const payload = {
      nombre: this.nuevoNombre.trim(),
      ruta: ruta,
      icono: this.nuevoIcono.trim() || '📦',
      permisos: {
        superadmin: ['ver', 'editar', 'eliminar']
      }
    };

    this.guardando = true;
    this.modulosService.create(payload).subscribe({
      next: () => {
        this.mensaje = `Modulo "${payload.nombre}" creado exitosamente`;
        this.guardando = false;
        this.closeModal();
        this.cargarModulos();
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: (err) => {
        this.mensaje = `Error: ${err.error?.message || err.message}`;
        this.guardando = false;
        setTimeout(() => this.mensaje = '', 3000);
      }
    });
  }

  toggleExpand(id: string) {
    this.expandido[id] = !this.expandido[id];
  }

  tienePermiso(modulo: Modulo, rol: string, accion: string): boolean {
    const perms = modulo.permisos || {};
    return perms[rol]?.includes(accion) ?? false;
  }

  togglePermiso(modulo: Modulo, rol: string, accion: string) {
    if (!modulo.permisos) modulo.permisos = {};
    if (!modulo.permisos[rol]) modulo.permisos[rol] = [];

    const idx = modulo.permisos[rol].indexOf(accion);
    if (idx >= 0) {
      modulo.permisos[rol].splice(idx, 1);
    } else {
      modulo.permisos[rol].push(accion);
    }
  }

  guardarPermisos(modulo: Modulo) {
    this.modulosService.updatePermisos(modulo.id, modulo.permisos).then(() => {
      this.mensaje = `Permisos de "${modulo.nombre}" guardados`;
      setTimeout(() => this.mensaje = '', 3000);
    }).catch((err) => {
      this.mensaje = `Error: ${err.message}`;
      setTimeout(() => this.mensaje = '', 3000);
    });
  }
}