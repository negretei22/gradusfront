import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="unauthorized-container">
      <h1>🚫 Acceso denegado</h1>
      <p>No tienes permisos para ver este módulo.</p>
      <button (click)="volver()">← Volver al inicio</button>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      font-family: system-ui, sans-serif;
      background: #f8fafc;
    }
    h1 { color: #dc2626; margin-bottom: 10px; }
    p { color: #64748b; margin-bottom: 24px; font-size: 16px; }
    button {
      padding: 12px 24px;
      background: #006341;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      font-weight: 600;
    }
    button:hover { background: #008f5d; }
  `]
})
export class UnauthorizedComponent {
  constructor(private router: Router) {}

  volver() {
    this.router.navigate(['/contratos']);
  }
}