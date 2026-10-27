import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BancosCajaChicaService } from '../services/bancos-caja-chica.service';
import { NgxMaskDirective } from 'ngx-mask';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';

@Component({
    selector: 'app-bancos-caja-chica',
    standalone: true,
    imports: [CommonModule, FormsModule, NgxMaskDirective],
    templateUrl: './bancos-caja-chica.component.html',
    styleUrls: ['../caja-chica/caja-chica.component.css', './bancos-caja-chica.component.css']
})
export class BancosCajaChicaComponent implements OnInit {

    constructor(private service: BancosCajaChicaService) { }

    filtroAnio = new Date().getFullYear();
    filtroMes = new Date().getMonth() + 1;
    mesesVisibles: any[] = [];
    showExportar = false;
    exportarConCaja = true;

    meses = [
        { value: 1, text: 'ENERO' }, { value: 2, text: 'FEBRERO' }, { value: 3, text: 'MARZO' },
        { value: 4, text: 'ABRIL' }, { value: 5, text: 'MAYO' }, { value: 6, text: 'JUNIO' },
        { value: 7, text: 'JULIO' }, { value: 8, text: 'AGOSTO' }, { value: 9, text: 'SEPTIEMBRE' },
        { value: 10, text: 'OCTUBRE' }, { value: 11, text: 'NOVIEMBRE' }, { value: 12, text: 'DICIEMBRE' }
    ];

    data: any = null;
    cargando = false;
    showSaldo = false;
    form = { banco_gasto: 0, banco_ingreso: 0, caja_gasto: 0, caja_ingreso: 0 };

    ngOnInit() {
        this.mesesVisibles = this.meses.filter(m => m.value <= this.filtroMes);
        this.cargar();
    }

    get nombreMes() {
        return this.meses.find(m => m.value === this.filtroMes)?.text;
    }

    confirmarExportar() {
        this.showExportar = false;
        this.exportarExcel(this.exportarConCaja);
    }

    seleccionarMes(mes: number) {
        this.filtroMes = mes;
        this.cargar();
    }

    cargar() {
        this.cargando = true;
        this.service.getMes(this.filtroAnio, this.filtroMes).subscribe({
            next: res => { this.data = res; this.cargando = false; },
            error: () => { this.cargando = false; }
        });
    }

    abrirSaldo() {
        this.form = { ...this.data.saldo_anterior };
        this.showSaldo = true;
    }

    guardarSaldo() {
        const data = {
            banco_gasto: Number(this.form.banco_gasto) || 0,
            banco_ingreso: Number(this.form.banco_ingreso) || 0,
            caja_gasto: Number(this.form.caja_gasto) || 0,
            caja_ingreso: Number(this.form.caja_ingreso) || 0,
        };
        this.service.guardarSaldo(this.filtroAnio, this.filtroMes, data).subscribe(() => {
            this.showSaldo = false;
            this.cargar();
        });
    }

    cerrarMes() {
        if (!confirm(`¿Guardar el saldo final de ${this.nombreMes} como saldo anterior del mes siguiente?`)) return;
        this.service.cerrarMes(this.filtroAnio, this.filtroMes).subscribe(() => {
            alert('Saldo del mes siguiente guardado.');
        });
    }

    exportarExcel(conCaja: boolean = true) {
        if (!this.data) return;
        const d = this.data;

        const MESES_ABR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const fmtFecha = (f: string) => {
            const [y, m, dd] = f.split('-');
            return `${dd}-${MESES_ABR[Number(m) - 1]}-${y}`;
        };
        const r = (n: any) => Math.round(Number(n) || 0);
        const v = (n: number) => (n > 0 ? r(n) : '');


        const movs = conCaja
            ? d.movimientos
            : d.movimientos.filter((m: any) => m.banco_gasto > 0 || m.banco_ingreso > 0);

        const formaPago = (m: any) => {
            if (conCaja) return m.forma_pago;
            return (m.forma_pago || '')
                .split(' + ')
                .filter((p: string) => p !== 'Efectivo')
                .join(' + ');
        };
        // Hoja completa (10 columnas)



        const completa: any[][] = [
            ['BANCOS Y CAJA CHICA', '', '', '', '', '', '', '', '', ''],
            [this.nombreMes, '', '', '', '', '', '', '', '', ''],
            [],
            ['', '', '', 'BANORTE', '', '', 'CAJA CHICA', '', '', ''],
            ['', '', 'TOTALES:', r(d.totales.banco_gasto), r(d.totales.banco_ingreso), '',
                r(d.totales.caja_gasto), r(d.totales.caja_ingreso), '', ''],
            ['No.', 'FECHA', 'CONCEPTO', 'Gasto (-)', 'Ingreso (+)', 'SALDO',
                'Gasto (-)', 'Ingreso (+)', 'SALDO', 'Forma de pago'],
            ['', '', 'SALDO ANTERIOR', r(d.saldo_anterior.banco_gasto), r(d.saldo_anterior.banco_ingreso), '',
                r(d.saldo_anterior.caja_gasto), r(d.saldo_anterior.caja_ingreso), '', ''],
            ...movs.map((m: any, i: number) => [
                i + 1, fmtFecha(m.fecha), m.concepto,
                v(m.banco_gasto), v(m.banco_ingreso), r(m.saldo_banco),
                v(m.caja_gasto), v(m.caja_ingreso), r(m.saldo_caja),
                formaPago(m),
            ]),
            ['', '', 'SALDO FINAL', '', '', r(d.saldo_final.banco), '', '', r(d.saldo_final.caja), ''],
        ];

        // Columnas que se exportan (índices de la hoja completa)
        const cols: number[] = conCaja
            ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
            : [0, 1, 2, 3, 4, 5, 9];
        const pos = (orig: number) => cols.indexOf(orig);   // posición nueva
        const filas = completa.map(f => f.length ? cols.map(c => f[c]) : f);

        const anchosOrig = [6, 13, 52, 14, 14, 15, 14, 14, 15, 34];
        const ultimaCol = cols.length - 1;

        // 👇 tipado como any para que TypeScript no marque error en ws[...]
        const ws: any = XLSX.utils.aoa_to_sheet(filas);

        ws['!cols'] = cols.map(c => ({ wch: anchosOrig[c] }));
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: ultimaCol } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: ultimaCol } },
            { s: { r: 3, c: 3 }, e: { r: 3, c: 5 } },
            ...(conCaja ? [{ s: { r: 3, c: 6 }, e: { r: 3, c: 8 } }] : []),
        ];

        // ===== Estilos =====
        const ROJO = 'B85C57', VERDE = '3F8F66', NEGRO = '333333';
        const borde = { style: 'thin', color: { rgb: 'D9DEE2' } };
        const bordes = { top: borde, bottom: borde, left: borde, right: borde };
        const ultimaFila = filas.length - 1;

        const estilo = (r: number, c: number, s: any) => {
            const ref = XLSX.utils.encode_cell({ r, c });
            if (!ws[ref]) ws[ref] = { t: 's', v: '' };
            ws[ref].s = { ...(ws[ref].s || {}), ...s };
        };

        for (let r = 0; r <= ultimaFila; r++) {
            for (let cNuevo = 0; cNuevo <= ultimaCol; cNuevo++) {
                const c = cols[cNuevo];                 // índice original
                const esMonto = c >= 3 && c <= 8;
                const esSaldo = c === 5 || c === 8;
                const esGasto = c === 3 || c === 6;

                for (let c = 0; c <= 9; c++) {
                    const esMonto = c >= 3 && c <= 8;
                    const esSaldo = c === 5 || c === 8;
                    const esGasto = c === 3 || c === 6;
                    const base: any = { font: { name: 'Arial', sz: 10 }, alignment: { vertical: 'center' } };

                    if (r === 0) {
                        Object.assign(base, { font: { name: 'Arial', sz: 14, bold: true }, alignment: { horizontal: 'center' } });
                    } else if (r === 1) {
                        Object.assign(base, { font: { name: 'Arial', sz: 12, bold: true }, alignment: { horizontal: 'center' } });
                    } else if (r === 3) {
                        Object.assign(base, {
                            font: { name: 'Arial', sz: 10, bold: true, color: { rgb: c <= 5 ? '2B5D8A' : '7A5C1E' } },
                            alignment: { horizontal: 'center' },
                        });
                        if (c >= 3 && c <= 8) base.border = bordes;
                    } else if (r === 4) {
                        Object.assign(base, { font: { name: 'Arial', sz: 10, bold: true }, fill: { fgColor: { rgb: 'F2F6FA' } }, border: bordes });
                    } else if (r === 5) {
                        Object.assign(base, {
                            font: { name: 'Arial', sz: 10, bold: true },
                            fill: { fgColor: { rgb: 'EEEEEE' } },
                            alignment: { horizontal: esMonto ? 'right' : 'center', vertical: 'center' },
                            border: bordes,
                        });
                    } else if (r === 6) {
                        Object.assign(base, { font: { name: 'Arial', sz: 10, bold: true }, border: bordes });
                    } else if (r === ultimaFila) {
                        Object.assign(base, { font: { name: 'Arial', sz: 10, bold: true }, fill: { fgColor: { rgb: 'F2F6FA' } }, border: bordes });
                    } else {
                        base.border = bordes;
                        if (c === 0 || c === 1 || c === 9) base.alignment = { horizontal: 'center', vertical: 'center' };
                    }

                    // Formato y color de los montos
                    if (esMonto && r >= 4) {
                        base.alignment = { horizontal: 'right', vertical: 'center' };
                        if (r !== 5) {
                            base.numFmt = '$#,##0';
                            const ref = XLSX.utils.encode_cell({ r, c });
                            const valor = ws[ref]?.v;

                            if (esSaldo || r === ultimaFila) {
                                // Saldos: negro y negrita, rojo solo si es negativo
                                base.font = {
                                    ...base.font, bold: true,
                                    color: { rgb: typeof valor === 'number' && valor < 0 ? ROJO : NEGRO }
                                };
                            } else {
                                base.font = { ...base.font, color: { rgb: esGasto ? ROJO : VERDE } };
                            }
                        }
                    }

                    estilo(r, c, base);
                }
            }
        }

        // Formato de moneda en las celdas numéricas
        for (let r = 4; r <= ultimaFila; r++) {
            if (r === 5) continue;
            for (let cNuevo = 0; cNuevo <= ultimaCol; cNuevo++) {
                const c = cols[cNuevo];
                if (c < 3 || c > 8) continue;
                const ref = XLSX.utils.encode_cell({ r, c: cNuevo });
                if (ws[ref] && typeof ws[ref].v === 'number') ws[ref].z = '$#,##0';
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bancos y Caja Chica');

        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }),
            `Bancos y Caja Chica ${this.nombreMes} ${this.filtroAnio}.xlsx`);
    }


    obtenerTipoMovimiento(tipo: number | string): string {
        switch (Number(tipo)) {
            case 1: return 'INGRESO';
            case 2: return 'EGRESO';
            case 4: return 'PRÉSTAMO';
            default: return 'OTRO';
        }
    }
}