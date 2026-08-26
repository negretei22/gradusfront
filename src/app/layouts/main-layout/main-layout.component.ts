import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

interface Modulo {
  id: number;
  nombre: string;
  ruta: string;
  icono: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout" [class.sidebar-closed]="!sidebarOpen">

      <!-- Overlay solo en móvil -->
      @if (sidebarOpen && isMobile()) {
        <div class="sidebar-overlay" (click)="toggleSidebar()"></div>
      }

      <!-- SIDEBAR -->
      <aside class="sidebar" [class.open]="sidebarOpen">
        <button class="sidebar-close" (click)="toggleSidebar()">✕</button>

        <div class="sidebar-logo">
          <img src="https://gradus.com.mx/wp-content/uploads/2024/07/LOGO-BLANCO-1080x.png" />
        </div>

        <ul class="menu">
          @for (modulo of modulos; track modulo.id) {
            <li>
              <a [routerLink]="modulo.ruta" routerLinkActive="active" (click)="onNavigate()">
                {{ modulo.icono }} {{ modulo.nombre }}
              </a>
            </li>
          }
        </ul>
      </aside>

      <!-- MAIN -->
      <div class="main">
        <header class="topbar">
          <div class="left">
            <button class="menu-btn" (click)="toggleSidebar()">☰</button>
            <span>Sistema GRADUS</span>
          </div>

          <div class="right">
            <div class="user-dropdown">
              <button class="user-btn" (click)="toggleMenu()">
                <span class="user-name">{{ authService.getCurrentUser()?.nombre || 'Usuario' }}</span>
                <span class="arrow" [class.open]="menuOpen">▼</span>
              </button>
              @if (menuOpen) {
                <div class="dropdown-menu">
                  <button (click)="logout()" class="dropdown-item">⏻ Cerrar sesión</button>
                </div>
              }
            </div>
          </div>
        </header>

        <div class="content">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  sidebarOpen = true;
  menuOpen = false;
  modulos: Modulo[] = [];

  constructor(
    public authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {
    this.sidebarOpen = !this.isMobile();
  }

  ngOnInit() {
    this.cargarModulos();
  }

  cargarModulos() {
    // Primero intentar cargar de localStorage
    this.modulos = this.authService.getModulosGuardados();
    
    // Si no hay, pedir al backend
    if (this.modulos.length === 0) {
      this.authService.cargarModulos().subscribe({
        next: (mods) => this.modulos = mods,
        error: (err) => console.error('Error cargando módulos:', err)
      });
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (this.isMobile()) {
      this.sidebarOpen = false;
    }
  }

  isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  onNavigate() {
    if (this.isMobile()) {
      this.sidebarOpen = false;
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}