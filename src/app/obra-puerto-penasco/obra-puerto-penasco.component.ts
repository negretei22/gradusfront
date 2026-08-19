import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanzasService } from '../services/finanzas.service';
import { AuthService } from '../core/services/auth.service';
import { Router } from '@angular/router';
import { HostListener } from '@angular/core';

@Component({
  selector: 'app-obra-puerto-penasco',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './obra-puerto-penasco.component.html',
  styleUrl: './obra-puerto-penasco.component.css'
})
export class ObraPuertoPenascoComponent implements OnInit {

  movimientos: any[] = [];
  mostrarDetalle: boolean = false;
  metodoPagoFiltro: number = 0;

  puedeVer = false;

  tiposArchivo = [
    { key: 'factura', label: 'Factura' },
    { key: 'pago', label: 'Comprobante de Pago' },
  ];

  mostrarMenuArchivos: number | null = null;

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

  @HostListener('document:keydown.escape')
  onEscapePress() {
    this.mostrarMenuArchivos = null;
    
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.mostrarMenuArchivos === null) return;

    const target = event.target as HTMLElement;
    if (!target.closest('.archivos-indicador')) {
      this.mostrarMenuArchivos = null;
    }
  }



  constructor(private finanzasService: FinanzasService,
    private authService: AuthService,
    private router: Router

  ) { }

  ngOnInit(): void {
    this.cargarMovimientos();
        this.authService.getPermisos('finanzas').subscribe({
      next: (permisos) => {
        this.puedeVer = permisos.puedeVer;
        
      },
      error: () => {
        this.router.navigate(['/unauthorized']);
      }
    });

  }

  seleccionarMes(mesValue: number): void {
    this.filtroMes = mesValue;
    this.cargarMovimientos();
  }

  cargarMovimientos(): void {
    this.finanzasService
      .getMovimientosPorCategoria(17, 2, this.filtroAnio, this.filtroMes)
      .subscribe({
        next: (data) => this.movimientos = data,
        error: (err) => console.error('Error cargando movimientos de Puerto Peñasco:', err)
      });
  }

  toggleDetalle(): void {
    this.mostrarDetalle = !this.mostrarDetalle;
  }

  movimientosVisibles(): any[] {
    if (this.metodoPagoFiltro === 0) return this.movimientos;
    return this.movimientos.filter(m => m.metodo_pago_id === this.metodoPagoFiltro);
  }

  get gastoPenasco(): number {
    return this.movimientos
      .reduce((sum, m) => sum + Number(m.importe_sin_iva || 0), 0);
  }

  private parseArchivosCampo(val: string): string[] {
    if (!val) return [];
    try {
      const arr = JSON.parse(val);
      return Array.isArray(arr) ? arr : [];
    } catch {
      // Fallback para registros viejos guardados como texto separado por comas
      return val.split(',').map(x => x.trim()).filter(Boolean);
    }
  }

  contarArchivos(m: any): number {
    return this.tiposArchivo.reduce((acc, t) => {
      const val = m[`archivo_${t.key}`];
      if (!val) return acc;
      const arr = this.parseArchivosCampo(val);
      return acc + arr.length;
    }, 0);
  }

  archivosDeMovimiento(m: any) {
    const result: { label: string, archivo: string }[] = [];

    this.tiposArchivo.forEach(t => {
      const val = m[`archivo_${t.key}`];
      if (!val) return;
      const arr = this.parseArchivosCampo(val);

      arr.forEach((a: string, index: number) => {
        result.push({ label: `${t.label} ${index + 1}`, archivo: a });
      });
    });

    return result;
  }

  toggleMenuArchivos(id: number) {
    this.mostrarMenuArchivos = this.mostrarMenuArchivos === id ? null : id;
  }

  verArchivo(nombre: string) {
    window.open(`http://localhost:3000/uploads/movimientos/${nombre}`, '_blank');
  }

  esPDF(nombre: string): boolean {
    return nombre?.toLowerCase().endsWith('.pdf');
  }

  esImagen(nombre: string): boolean {
    return !!nombre?.match(/\.(jpg|jpeg|png|gif)$/i);
  }
}