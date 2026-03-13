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
  modoVista: 'normal' | 'fechas' = 'normal';
  eventosProximos: any[] = [];



  constructor(private procedimientoService: ProcedimientosService) { }

  toggleDesc() {
    this.descVisible = !this.descVisible;
  }


  cambiarVista(v: 'normal' | 'fechas') {

    this.modoVista = v;

    if (v === 'fechas') {
      clearInterval(this.intervalo);
      this.intervalo = null;
      this.calcularEventosProximos();
    }

    if (v === 'normal') {
      if (!this.intervalo) {
        this.intervalo = setInterval(() => this.rotar(), 5000);
      }
    }

  }

  calcularEventosProximos() {

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const limite = new Date();
  limite.setDate(hoy.getDate() + 10);

  let lista: any[] = [];

  this.procedimientos.forEach(p => {

    const eventos = [
      { nombre: 'VISITA', fecha: p.visita },
      { nombre: 'ACLARACIONES', fecha: p.aclar },
      { nombre: 'APERTURA', fecha: p.apertura },
      { nombre: 'FALLO', fecha: p.fallo }
    ];

    eventos.forEach(e => {

      if (!e.fecha || e.fecha === '0000-00-00') return;

      let fechaEvento = new Date(e.fecha);
      if (isNaN(fechaEvento.getTime())) return;

      // copia SOLO para comparar
      let fechaComparar = new Date(fechaEvento);
      fechaComparar.setHours(0,0,0,0);

      if (fechaComparar >= hoy && fechaComparar <= limite) {

        const diff = fechaComparar.getTime() - hoy.getTime();
        const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
        console.log(p)
        lista.push({
          proc: p.proc,
          estado: p.estado,
          evento: e.nombre,
          fecha: fechaEvento, // ← conserva la hora real
          dias: dias,
          uuid: p.uid
        });

      }

    });

  });

  lista.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  this.eventosProximos = lista;

}


abrirProcedimiento(uuid: string){

  const url = `https://comprasmx.buengobierno.gob.mx/sitiopublico/#/sitiopublico/detalle/${uuid}/procedimiento`;

  window.open(url, '_blank');

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

    if (!f || f === '0000-00-00') return "SIN FECHA";

    let fecha = new Date(f);

    if (isNaN(fecha.getTime())) return "SIN FECHA";

    let opciones: any = {
      day: "numeric",
      month: "long",
      year: "numeric"
    };

    let fechaTxt = fecha.toLocaleDateString("es-MX", opciones);

    // revisar si la hora realmente existe
    let horas = fecha.getHours();
    let minutos = fecha.getMinutes();

    if (horas === 0 && minutos === 0) {
      return fechaTxt;
    }

    let hora = fecha.toLocaleTimeString("es-MX", {
      hour: "numeric",
      minute: "2-digit"
    });

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