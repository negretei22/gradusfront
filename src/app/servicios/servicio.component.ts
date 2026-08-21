import { Component, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicioService } from './servicio.service';
import { MaquinariaService } from '../services/maquinaria.service';
import { AlertsService } from '../core/alerts.service';

@Component({
  selector: 'app-servicio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './servicio.component.html',
  styleUrl: './servicio.component.css'
})
export class ServicioComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;


  // ===== CARRUSEL DE FOTOS =====
  showCarousel: boolean = false;
  carouselImages: string[] = [];
  carouselIndex: number = 0;
  carouselCodigo: string = '';

  openCarousel(s: any) {
    this.carouselCodigo = s.codigo;
    this.carouselImages = this.fotosDeServicio(s).map(f =>
      `http://localhost:3000/uploads/servicios/${s.codigo}/${f}`
    );
    this.carouselIndex = 0;
    this.showCarousel = true;
  }

  closeCarousel() {
    this.showCarousel = false;
    this.carouselImages = [];
    this.carouselIndex = 0;
  }

  nextImage() {
    if (this.carouselIndex < this.carouselImages.length - 1) {
      this.carouselIndex++;
    }
  }

  prevImage() {
    if (this.carouselIndex > 0) {
      this.carouselIndex--;
    }
  }

  // Para detectar teclas izquierda/derecha en el carrusel
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this.showCarousel) return;
    if (event.key === 'Escape') this.closeCarousel();
    if (event.key === 'ArrowRight') this.nextImage();
    if (event.key === 'ArrowLeft') this.prevImage();
  }

  constructor(
    private servicioService: ServicioService,
    private maquinariaService: MaquinariaService,
    private alerts: AlertsService
  ) { }

  servicios: any[] = [];
  serviciosFiltrados: any[] = [];
  filtroServicio: string = '';
  mostrarBuscador: boolean = true;
  nuevoDetalle: string = '';

  showModal: boolean = false;
  editando: boolean = false;
  id_servicio: number | null = null;

  id_tipo_servicio: number = 0;
  fecha_servicio: string = '';
  id_activo: number = 0;
  activoSeleccionado: any = null;
  codigo: string = '';

  // buscador de activos
  textoBusquedaActivo: string = '';
  activos: any[] = [];
  activosFiltrados: any[] = [];
  mostrarDropdownActivos: boolean = false;

  // detalles: solo descripción
  detalles: { descripcion: string }[] = [];
  total: number = 0;
  iva: number = 0;

  // fotos
  fotosNuevas: File[] = [];
  fotosExistentes: string[] = [];
  panelFotosAbierto: boolean = false;
  dragoverActivo: boolean = false;

  tiposServicio: any[] = [];

  private readonly CONCEPTOS_PREVENTIVO = [
    'Filtros',
    'Aceite',
    'Materiales',
    'Insumos necesarios',
    'Mano de obra técnica especializada',
    'Gastos de salida'
  ];

  ngOnInit() {
    this.cargarServicios();
    this.cargarTiposServicio();
    this.cargarActivos();
  }

  cargarServicios() {
    this.servicioService.getServicios().subscribe((res: any) => {
      this.servicios = res;
      this.serviciosFiltrados = [...res];
    });
  }

  agregarDetalleDesdeInput() {
    if (!this.nuevoDetalle.trim()) return;
    this.detalles.push({ descripcion: this.nuevoDetalle.trim() });
    this.nuevoDetalle = '';
  }

  cargarTiposServicio() {
    this.tiposServicio = [
      { id_tipo_servicio: 1, tipo_servicio: 'Preventivo' },
      { id_tipo_servicio: 2, tipo_servicio: 'Correctivo' }
    ];
  }

  cargarActivos() {
    this.maquinariaService.getMaquinaria().subscribe((res: any) => {
      this.activos = res as any[];
    });
  }

  filtrarServicios() {
    const f = this.filtroServicio.toLowerCase();
    this.serviciosFiltrados = this.servicios.filter(s =>
      (s.activo?.numero_serie ?? '').toLowerCase().includes(f) ||
      (s.tipoServicio?.tipo_servicio ?? '').toLowerCase().includes(f)
    );
  }

  // ===== BUSCADOR DE ACTIVOS =====
  onBuscarActivoInput() {
    const txt = this.textoBusquedaActivo.toLowerCase().trim();
    if (!txt) {
      this.activosFiltrados = [];
      this.mostrarDropdownActivos = false;
      return;
    }
    this.activosFiltrados = this.activos.filter(a =>
      (a.numero_serie ?? '').toLowerCase().includes(txt) ||
      (a.descripcion ?? '').toLowerCase().includes(txt)
    );
    this.mostrarDropdownActivos = true;
  }

  seleccionarActivo(a: any) {
    this.id_activo = a.id_maquinaria;
    this.activoSeleccionado = a;
    this.textoBusquedaActivo = `${a.numero_serie} — ${a.descripcion}`;
    this.mostrarDropdownActivos = false;
  }

  // ===== DETALLES =====
  onTipoServicioChange() {
    this.detalles = [];
    if (Number(this.id_tipo_servicio) === 1) {
      // Preventivo: carga los 6 conceptos fijos
      this.detalles = this.CONCEPTOS_PREVENTIVO.map(d => ({ descripcion: d }));
    }
    // Correctivo: empieza vacío, el usuario agrega manualmente
  }

  agregarDetalle() {
    this.detalles.push({ descripcion: '' });
  }

  eliminarDetalle(index: number) {
    this.detalles.splice(index, 1);
  }

  // ===== FOTOS =====
  onDragOverPanel(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragoverActivo = true;
  }
  onDragLeavePanel(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragoverActivo = false;
  }
  onDropPanel(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragoverActivo = false;
    this.panelFotosAbierto = true;
    const files = e.dataTransfer?.files;
    if (files) this.procesarFotos(files);
  }
  onPanelBodyClick(e: Event) {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('li')) return;
    this.fileInput.nativeElement.click();
  }
  onFotosSeleccionadas(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.procesarFotos(input.files);
    }
    input.value = '';
  }
  procesarFotos(files: FileList) {
    const permitidos = ['image/jpeg', 'image/jpg', 'image/png'];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!permitidos.includes(f.type)) {
        alert(`"${f.name}" no es válido. Solo JPG/PNG.`);
        continue;
      }
      const yaExiste = this.fotosNuevas.some(x => x.name === f.name && x.size === f.size)
        || this.fotosExistentes.includes(f.name);
      if (!yaExiste) this.fotosNuevas.push(f);
    }
    this.panelFotosAbierto = true;
  }
  quitarFotoExistente(nombre: string) {
    this.fotosExistentes = this.fotosExistentes.filter(f => f !== nombre);
  }

  // ===== MODAL =====
  openModal() {
    this.resetForm();
    this.showModal = true;
  }
  closeModal() {
    this.showModal = false;
    this.editando = false;
    this.id_servicio = null;
    this.resetForm();
  }
  resetForm() {
    this.id_tipo_servicio = 0;
    this.fecha_servicio = '';
    this.id_activo = 0;
    this.activoSeleccionado = null;
    this.textoBusquedaActivo = '';
    this.codigo = '';
    this.mostrarDropdownActivos = false;
    this.detalles = [];
    this.total = 0;
    this.iva = 0;
    this.fotosNuevas = [];
    this.fotosExistentes = [];
    this.panelFotosAbierto = false;
  }

  // ===== GUARDAR / EDITAR =====
  async saveServicio() {
    if (!this.id_activo || !this.fecha_servicio || !this.id_tipo_servicio) {
      alert('Completa tipo de servicio, fecha y activo.');
      return;
    }

    const formData = new FormData();
    formData.append('id_tipo_servicio', this.id_tipo_servicio.toString());
    formData.append('id_activo', this.id_activo.toString());
    formData.append('fecha_servicio', this.fecha_servicio);
    formData.append('total', this.total.toString());
    formData.append('iva', this.iva.toString());
    formData.append('detalles', JSON.stringify(this.detalles));
    formData.append('fotos_existentes', this.fotosExistentes.join(','));

    this.fotosNuevas.forEach(f => formData.append('fotos', f));

    if (this.editando && this.id_servicio) {
      formData.append('id_servicio', this.id_servicio.toString());
      await this.servicioService.updateServicio(formData);
    } else {
      await this.servicioService.saveServicio(formData);
    }

    this.alerts.AlertaVerde('', 'Servicio guardado correctamente');
    this.cargarServicios();
    this.closeModal();
  }

  editServicio(s: any) {
    this.editando = true;
    this.id_servicio = s.id_servicio;
    this.codigo = s.codigo;
    this.id_tipo_servicio = s.id_tipo_servicio;
    this.fecha_servicio = s.fecha_servicio ? s.fecha_servicio.toString().split('T')[0] : '';
    this.id_activo = s.id_activo;

    // Usa la relación del backend o busca en el array local
    this.activoSeleccionado = s.activo ?? this.activos.find(a => a.id_maquinaria === s.id_activo);
    this.textoBusquedaActivo = this.activoSeleccionado
      ? `${this.activoSeleccionado.numero_serie} — ${this.activoSeleccionado.descripcion}`
      : '';

    this.total = s.total;
    this.iva = s.iva;
    this.detalles = s.detalles?.length ? s.detalles.map((d: any) => ({ descripcion: d.descripcion })) : [];
    this.fotosExistentes = s.fotos ? s.fotos.split(',').filter((x: string) => x) : [];
    this.fotosNuevas = [];
    this.showModal = true;
  }

  async deleteServicio(id: number) {
    if (!confirm('¿Eliminar este servicio?')) return;
    await this.servicioService.deleteServicio(id);
    this.cargarServicios();
  }

  fotosDeServicio(s: any): string[] {
    if (!s.fotos) return [];
    return s.fotos.split(',').filter((x: string) => x);
  }
  contarFotos(s: any): number {
    return this.fotosDeServicio(s).length;
  }
  verFoto(nombre: string, codigo: string) {
    window.open(`http://localhost:3000/uploads/servicios/${codigo}/${nombre}`, '_blank');
  }
}