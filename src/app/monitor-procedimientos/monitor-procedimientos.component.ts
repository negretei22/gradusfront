import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { ProcedimientosService } from '../services/procedimientos.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface Evento {
  name: string;
  fecha: Date;
}


@Component({
  selector: 'app-monitor-procedimientos',
  imports: [CommonModule, FormsModule],
  templateUrl: './monitor-procedimientos.component.html',
  styleUrls: ['./monitor-procedimientos.component.css']
})
export class MonitorProcedimientosComponent implements OnInit {

  map: any;
  marker: any;
  index = 0;
  procedimientos: any[] = [];
  procedimientoActual: any;
  proximoEvento: any;
  procedimientosFiltrados: any[] = [];
  estados: string[] = [];
  estadoSeleccionado = 'TODOS';
  intervalo: any;
  descVisible = false;



  constructor(private procedimientoService: ProcedimientosService) { }

  toggleDesc() {
    this.descVisible = !this.descVisible;
  }


  ngOnInit() {


    this.procedimientoService.getProcedimientos().subscribe((data: any) => {
      this.procedimientos = data;

      this.procedimientosFiltrados = this.procedimientos;
      console.log(this.procedimientosFiltrados)
      this.estados = [...new Set(this.procedimientos.map(p => p.estado))];
      this.mostrar();
      this.intervalo = setInterval(() => this.rotar(), 5000);

    });


  }

  filtrar(estado: string) {

    this.estadoSeleccionado = estado;
    if (!this.intervalo) {
      this.intervalo = setInterval(() => this.rotar(), 5000);
    }
    

    if (estado === 'TODOS') {
      this.procedimientosFiltrados = this.procedimientos;

    } else {
      this.procedimientosFiltrados = this.procedimientos.filter(p => p.estado === estado);
    }

    this.index = 0;
    this.mostrar();

  }

  ir(i: number) {

    this.index = i;
    this.mostrar();
    clearInterval(this.intervalo);
    this.intervalo = null;

  }

  rotar() {

    this.index++;

    if (this.index >= this.procedimientosFiltrados.length)
      this.index = 0;

    this.mostrar();

  }

  mostrar() {

    this.procedimientoActual = this.procedimientosFiltrados[this.index];
    this.calcularProximo();

  }

  formatoFecha(f: any) {

    if (!f) return "SIN FECHA";

    let fecha = new Date(f);

    let opciones: any = {
      day: "numeric",
      month: "long",
      year: "numeric"
    };

    let fechaTxt = fecha.toLocaleDateString("es-MX", opciones);

    let hora = fecha.toLocaleTimeString("es-MX",
      { hour: "numeric", minute: "2-digit" });

    return fechaTxt + "<br>" + hora;

  }

  calcularProximo() {

    const hoy = new Date();

    const p = this.procedimientoActual;

    const eventos: Evento[] = [
      { name: "VISITA", fecha: new Date(p.visita) },
      { name: "ACLARACIONES", fecha: new Date(p.aclar) },
      { name: "APERTURA", fecha: new Date(p.apertura) }
    ];

    let proximo: Evento | null = null;

    eventos.forEach(e => {
      if (e.fecha > hoy) {
        if (!proximo || e.fecha < proximo.fecha) {
          proximo = e;
        }
      }
    });

    if (proximo !== null) {

      const evento = proximo as Evento;

      let diff = evento.fecha.getTime() - hoy.getTime();

      let dias = Math.ceil(diff / (1000 * 60 * 60 * 24));

      this.proximoEvento = {
        nombre: evento.name,
        dias: dias
      };

    }

  }

  claseCirculo(index: number) {

    const hoy = new Date();

    const p = this.procedimientoActual;

    const fechas = [
      new Date(p.visita),
      new Date(p.aclar),
      new Date(p.apertura)
    ];

    let f = fechas[index];

    if (f < hoy) return 'done';

    if (this.proximoEvento &&
      this.proximoEvento.nombre === ["VISITA", "ACLARACIONES", "APERTURA"][index])
      return 'next';

    return 'future';

  }

}