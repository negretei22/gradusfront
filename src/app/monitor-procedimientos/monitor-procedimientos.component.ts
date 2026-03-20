import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { ProcedimientosService } from '../services/procedimientos.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface Evento {
  name: string;
  fecha: Date;
}

interface DiaCalendario {
  fecha: string;
  eventos: any[]; // o mejor tipado si quieres
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
  modoVista: 'normal' | 'fechas' | 'calendario' = 'normal';
  eventosProximos: any[] = [];
  tiempoRestante: number = 0; // en segundos
  proximoNombre: string = '';
  calendario: DiaCalendario[] = [];



  constructor(private procedimientoService: ProcedimientosService) { }

  toggleDesc() {
    this.descVisible = !this.descVisible;
  }

  formatoSoloFecha(fecha: string) {

    const [year, month, day] = fecha.split('-').map(Number);

    const f = new Date(year, month - 1, day); // 👈 LOCAL, no UTC

    return f.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  formatoHora(fecha: string) {
    const f = new Date(fecha);

    return f.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }


  cambiarVista(v: 'normal' | 'fechas' | 'calendario') {

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

    if (v === 'calendario') {
      this.generarCalendario();
    }


  }


  claseEvento(fecha: any) {

    const ahora = new Date().getTime();

    const eventoOriginal = new Date(fecha);

    // 🔥 AJUSTE: restar 1 hora para convertir a CDMX → Hermosillo
    const evento = eventoOriginal.getTime() - (60 * 60 * 1000);

    const hoy = new Date().toDateString();
    const eventoDia = new Date(evento).toDateString();

    const esHoy = hoy === eventoDia;

    if (esHoy && evento <= ahora) return 'rojo';       // 🔴 ya pasó
    if (esHoy && evento > ahora) return 'amarillo';    // 🟡 hoy pendiente
    if (evento < ahora) return 'rojo';                 // 🔴 pasado

    return 'verde';                                    // 🟢 futuro
  }

  generarCalendario() {

    const mapa: Record<string, any[]> = {};

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const limite = new Date();
    limite.setDate(limite.getDate() + 7);
    limite.setHours(23, 59, 59, 999);

    this.procedimientos.forEach(p => {

      if (!p) return;

      const eventos = [];

      if (p.visita) eventos.push({ tipo: 'VISITA', fecha: p.visita });
      if (p.aclar) eventos.push({ tipo: 'ACLARACIONES', fecha: p.aclar });
      if (p.apertura) eventos.push({ tipo: 'APERTURA', fecha: p.apertura });
      if (p.fallo) eventos.push({ tipo: 'FALLO', fecha: p.fallo });

      eventos.forEach(e => {

        if (!e.fecha) return;

        const f = new Date(e.fecha);
        if (isNaN(f.getTime())) return;

        // ✅ FILTRO
        if (f < hoy || f > limite) return;

        // 🔥 KEY CORRECTA (AQUÍ ESTABA TODO EL PROBLEMA)
        const key = new Date(e.fecha).toLocaleDateString('en-CA');

        if (!mapa[key]) {
          mapa[key] = [];
        }

        mapa[key].push({
          uid: p.uid,
          proc: p.proc,
          evento: e.tipo,
          fecha: f,
          estado: p.estado
        });

      });

    });

    this.calendario = Object.keys(mapa)
      .sort()
      .map(fecha => ({
        fecha,
        eventos: mapa[fecha].sort(
          (a, b) => a.fecha.getTime() - b.fecha.getTime()
        )
      }));

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
        fechaComparar.setHours(0, 0, 0, 0);

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
    const ahora = new Date().getTime();
    lista = lista
      .filter(e => new Date(e.fecha).getTime() > ahora) // 👉 quita los que ya pasaron
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()); // 👉 ordena

    this.eventosProximos = lista;


  }


  abrirProcedimiento(uuid: string) {

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

  formatoTiempo(): string {

    const dias = Math.floor(this.tiempoRestante / 86400);
    const horas = Math.floor((this.tiempoRestante % 86400) / 3600);
    const minutos = Math.floor((this.tiempoRestante % 3600) / 60);
    const segundos = this.tiempoRestante % 60;

    const partes = [];

    if (dias > 0) {
      partes.push(`${dias} día${dias !== 1 ? 's' : ''}`);
    }

    if (horas > 0) {
      partes.push(`${horas} hora${horas !== 1 ? 's' : ''}`);
    }

    if (minutos > 0) {
      partes.push(`${minutos} minuto${minutos !== 1 ? 's' : ''}`);
    }


    return partes.join(', ');
  }


  formatoTiempoRestante(fecha: string | Date): string {

    const ahora = new Date().getTime();

    const eventoOriginal = new Date(fecha).getTime();

    // 🔥 ajuste CDMX → Hermosillo (-1 hora)
    const evento = eventoOriginal - (60 * 60 * 1000);

    let diff = Math.floor((evento - ahora) / 1000);

    if (diff <= 0) return 'FINALIZADO';

    const dias = Math.floor(diff / 86400);
    const horas = Math.floor((diff % 86400) / 3600);
    const minutos = Math.floor((diff % 3600) / 60);

    const partes = [];

    if (dias > 0) {
      partes.push(`${dias} día${dias !== 1 ? 's' : ''}`);
    }

    if (horas > 0) {
      partes.push(`${horas} hora${horas !== 1 ? 's' : ''}`);
    }

    if (minutos > 0) {
      partes.push(`${minutos} minuto${minutos !== 1 ? 's' : ''}`);
    }

    return partes.join(', ');
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

    const eventos = [
      { name: "VISITA", fecha: new Date(p.visita) },
      { name: "ACLARACIONES", fecha: new Date(p.aclar) },
      { name: "APERTURA", fecha: new Date(p.apertura) },
      { name: "FALLO", fecha: new Date(p.fallo) }
    ];

    let proximo: any = null;

    eventos.forEach(e => {
      if (e.fecha > hoy) {
        if (!proximo || e.fecha < proximo.fecha) {
          proximo = e;
        }
      }
    });

    if (proximo) {
      this.proximoNombre = proximo.name;

      let diff = proximo.fecha.getTime() - hoy.getTime();
      this.tiempoRestante = Math.floor(diff / 1000); // segundos

      this.iniciarContador();
    }
  }

  iniciarContador() {

    clearInterval(this.intervalo);

    this.intervalo = setInterval(() => {
      if (this.tiempoRestante > 0) {
        this.tiempoRestante--;
      } else {
        clearInterval(this.intervalo);
      }
    }, 1000);

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