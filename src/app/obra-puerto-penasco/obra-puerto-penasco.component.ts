import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanzasService } from '../services/finanzas.service';

@Component({
  selector: 'app-obra-puerto-penasco',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './obra-puerto-penasco.component.html',
  styleUrl: './obra-puerto-penasco.component.css'
})
export class ObraPuertoPenascoComponent implements OnInit {

  movimientos: any[] = [];

  filtroAnio: number = new Date().getFullYear();
  filtroMes: number = new Date().getMonth() + 1; // mes actual por defecto

    meses = [
    { value: 1, text: 'ENERO' },
    { value: 2, text: 'FEBRERO' },
    { value: 3, text: 'MARZO' },
    { value: 4, text: 'ABRIL' },
    { value: 5, text: 'MAYO' },
    { value: 6, text: 'JUNIO' },
    { value: 7, text: 'JULIO' },
    { value: 8, text: 'AGOSTO' },
    { value: 9, text: 'SEPTIEMBRE' },
    { value: 10, text: 'OCTUBRE' },
    { value: 11, text: 'NOVIEMBRE' },
    { value: 12, text: 'DICIEMBRE' }
  ];

  get mesesVisibles() {
  const mesActual = new Date().getMonth() + 1; // 1-12
  return this.meses.filter(m => m.value === 0 || m.value <= mesActual);
}
  constructor(private finanzasService: FinanzasService) {}

  ngOnInit(): void {
    this.cargarMovimientos();
  }

  seleccionarMes(mesValue: number): void {
    this.filtroMes = mesValue;
    this.cargarMovimientos();
  }

  cargarMovimientos(): void {
    this.finanzasService
      .getMovimientosPorCategoria(27, 2, this.filtroAnio, this.filtroMes)
      .subscribe({
        next: (data) => this.movimientos = data,
        error: (err) => console.error('Error cargando movimientos de Puerto Peñasco:', err)
      });
  }

  get gastoPenasco(): number {
    return this.movimientos
      .reduce((sum, m) => sum + Number(m.importe_sin_iva || 0), 0);
  }
}