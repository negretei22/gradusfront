import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-obra-puerto-penasco',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h1>🏗️ Puerto Peñasco</h1>
      <p>Módulo en construcción.</p>
    </div>
  `,
  styles: [`
    .container {
      padding: 40px;
      text-align: center;
    }
    h1 {
      color: #006341;
      margin-bottom: 20px;
    }
    p {
      color: #64748b;
      font-size: 18px;
    }
  `]
})
export class ObraPuertoPenascoComponent {}