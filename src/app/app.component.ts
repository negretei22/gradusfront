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
  sidebarOpen = false;

  constructor(
    public router: Router,
    public authService: AuthService
  ) {
    // Detecta cambios de ruta en tiempo real
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isLogin = event.url === '/login' || event.urlAfterRedirects === '/login';
        this.sidebarOpen = false;
      });
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

  toggleSidebar() { // 👈 NUEVO
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout() {
    this.menuOpen = false;
    this.authService.logout();
  }
}