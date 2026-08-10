import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'frontend';
  isLogin = false;
  menuOpen = false;
  sidebarOpen = true;
  modulos: any[] = [];

  constructor(
    public router: Router,
    public authService: AuthService
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isLogin = event.url === '/login' || event.urlAfterRedirects === '/login';
        
        if (!this.isLogin && this.authService.isAuthenticated()) {
          this.cargarModulos();
        }
        
        if (window.innerWidth <= 768) {
          this.sidebarOpen = false;
        }
      });
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

  isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  onNavigate() {
    if (this.isMobile()) {
      this.sidebarOpen = false;
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout() {
    this.menuOpen = false;
    this.modulos = [];
    this.authService.logout();
  }
}