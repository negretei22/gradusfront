import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertsService {

  AlertaRoja(titulo: string, mensaje: string) {
    Swal.fire({
      icon: 'error',
      title: titulo,
      html: mensaje,
      confirmButtonColor: '#00a36c'
    });
  }

  AlertaVerde(titulo: string, mensaje: string) {
    Swal.fire({
      icon: 'success',
      title: titulo,
      html: mensaje,
      confirmButtonColor: '#00a36c'
    });
  }

  AlertaWarning(titulo: string, mensaje: string) {
    Swal.fire({
      icon: 'warning',
      title: titulo,
      html: mensaje
    });
  }
}
