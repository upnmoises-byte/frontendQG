import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PedidoService, RegistrarPagoPayload } from '../../services/pedido.service';
import { Pedido, PedidoDetalle, PedidoVistaDetalle } from '../../models/pedido.model';
import { Cliente } from '../../models/cliente.model';
import { AuthService } from '../../services/auth.service';
import { ClienteService, ClientePayload } from '../../services/cliente.service';
import { UsuarioSesion } from '../../models/auth.model';
import { PermissionsService } from '../../services/permissions.service';
import { ALL_NAV_IDS, APP_ROLES, NavId, navLabel, roleLabel } from '../../config/nav-permissions';
import { AppConfigService } from '../../services/app-config.service';
import { AdminService, UsuarioAdmin } from '../../services/admin.service';
import { NotificationService } from '../../services/notification.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReporteService, ReportePedidosPdfParams } from '../../services/reporte.service';
import { FactilizaDocumentoResponse, FactilizaService } from '../../services/factiliza.service';

const COLUMNAS_POR_VISTA: Record<string, readonly string[]> = {
  PEDIDOS: [
    'prioridad', 'estado', 'numeroOrden', 'cliente', 'cantidad',
    'colores', 'vendedora', 'cortes', 'ranuras', 'especiales',
    'perforaciones', 'fechaIngreso', 'fechaEntrega', 'horaEntrega', 'pagos', 'acciones'
  ],
  PAGOS: [
    'prioridad', 'estado', 'numeroOrden', 'cliente', 'cantidad',
    'colores', 'vendedora',
    'fechaIngreso', 'fechaEntrega', 'horaEntrega', 'pagos'
  ],
  CORTE: [
    'prioridad', 'estado', 'numeroOrden', 'cliente', 'cantidad',
    'colores', 'cortes', 'ranuras', 'perforaciones', 'observaciones', 'maquina',
    'fechaIngreso', 'fechaEntrega', 'horaEntrega', 'acciones'
  ],
  CANTEADO: [
    'prioridad', 'estado', 'numeroOrden', 'cliente', 'cantidad',
    'colores', 'cortes', 'vendedora', 'cantoDelgado', 'cantoGrueso',
    'cantoDelgado36mm', 'cantoGrueso36mm', 'especiales',
    'fechaIngreso', 'fechaEntrega', 'acciones'
  ],
  ESPECIALES: [
    'prioridad', 'estado', 'numeroOrden', 'cliente', 'colores',
    'vendedora', 'especiales', 'fechaIngreso', 'fechaEntrega',
    'horaEntrega', 'acciones'
  ],
  DESPACHO: [
    'prioridad', 'estado', 'numeroOrden', 'cliente', 'colores',
    'cortes', 'ranuras', 'perforaciones', 'vendedora',
    'fechaIngreso', 'fechaEntrega', 'horaEntrega', 'observaciones', 'pagos', 'acciones'
  ],
  ENTREGADO: [
    'prioridad', 'estado', 'numeroOrden', 'cliente', 'cantidad',
    'colores', 'cortes', 'vendedora', 'fechaIngreso',
    'fechaEntrega', 'horaEntrega', 'observaciones', 'pagos', 'acciones'
  ]
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class DashboardComponent implements OnInit, OnDestroy {

  pedidos: Pedido[] = [];
  vistaActual = 'DASHBOARD';
  subVistaCorte = 'ESCUADRADORA';

  /** Filas por material/detalle (una fila = un material o pedido sin detalles). */
  pedidosVistaRows: PedidoVistaDetalle[] = [];
  /** Columnas visibles en la vista actual. */
  columnKeys = new Set<string>();

  mostrarModal = false;
  modoEdicion = false;
  mostrarAuditoria = false;
  auditoriaSeleccionada: any[] = [];
  pedidoAuditoria: Pedido | null = null;
  mostrarConfirmacion = false;
  tituloConfirmacion = '';
  mensajeConfirmacion = '';
  accionConfirmacion: (() => void) | null = null;
  mostrarModalCliente = false;
  modoEdicionCliente = false;
  clienteEditandoId: number | null = null;
  nuevoCliente: any = {
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombre: '',
    telefono: '',
    direccion: '',
    correo: ''
  };
  clienteDocumentoError = '';
  consultandoDocumentoCliente = false;
  clientes: any[] = [];
  clientesFiltrados: Cliente[] = [];
  filtroClienteTexto = '';

  totalPedidos = 0;
  totalCorte = 0;
  totalCanteado = 0;
  totalDespacho = 0;
  totalEntregados = 0;

  /** KPIs dashboard (recalculados en `recalcularDashboard`; evita getters en plantilla). */
  totalEscuadradora = 0;
  totalSeccionadora = 0;
  planchasPendientesEscuadradora = 0;
  planchasPendientesSeccionadora = 0;
  totalDiana = 0;
  totalAnabel = 0;
  totalIsamar = 0;
  pedidosDiana = 0;
  pedidosAnabel = 0;
  pedidosIsamar = 0;
  pedidosMelissa = 0;
  totalPedidosProduccion = 0;
  porcentajeCorte = 0;
  porcentajeCanteado = 0;
  porcentajeDespacho = 0;
  porcentajeEntregados = 0;
  totalVendedoras = 0;
  totalEspeciales = 0;
  pedidosVencidos = 0;
  promedioDiasEntrega = 0;

  filtroCliente = '';
  filtroVendedora = '';
  filtroEstado = '';
  filtroMaquina = '';
  filtroFechaIngresoDesde = '';
  filtroFechaIngresoHasta = '';

  /** Filtros extra solo en vista Pagos */
  filtroPagoSaldo = '';
  filtroPagoFechaIngresoDesde = '';
  filtroPagoFechaIngresoHasta = '';

  /** Filtros de la vista Reportes (independientes del listado general) */
  filtroRepCliente = '';
  filtroRepVendedora = '';
  filtroRepEstado = '';
  filtroRepMaquina = '';
  filtroRepSaldo = '';
  filtroRepFiDesde = '';
  filtroRepFiHasta = '';
  filtroRepFeDesde = '';
  filtroRepFeHasta = '';

  reportResumen = { pedidos: 0, total: 0, saldo: 0 };

  /** Vista previa del PDF de reportes (blob en iframe). */
  reportePdfUrl: SafeResourceUrl | null = null;
  reportePdfGenerando = false;
  private pdfObjectUrl: string | null = null;
  private pdfRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  nuevoPedido!: Pedido;

  /** Matriz editable en «Roles y permisos» (solo admin). */
  rolesMatrix: Record<string, NavId[]> = {};

  /** Filas de la matriz = built-in + roles del catálogo en servidor. */
  rolesMatrixRoles: string[] = [...APP_ROLES];

  readonly navIdsLista = ALL_NAV_IDS;

  configMapa: Record<string, string> = {};
  /** Claves de configuración ordenadas (evita `Object.keys` en cada ciclo de detección de cambios). */
  configKeysOrdenadas: string[] = [];

  usuariosAdmin: UsuarioAdmin[] = [];
  nuevoRolNombre = '';

  mostrarModalPago = false;
  mostrarHistorialPagos = false;
  pedidoPagoSeleccion: Pedido | null = null;
  historialPagos: any[] = [];
  formPago: RegistrarPagoPayload = { monto: 0, metodoPago: 'BCP', codigoPago: '', nota: '' };
  codigoPagoError = '';
  guardandoPago = false;
  entregaError = '';
  readonly fechaMinimaEntrega = new Date().toISOString().slice(0, 10);

  mostrarModalUsuario = false;
  modoEdicionUsuario = false;
  usuarioForm: {
    id?: number;
    nombre: string;
    correo: string;
    rol: string;
    password: string;
    activo: boolean;
  } = {
    nombre: '',
    correo: '',
    rol: 'PRODUCCION',
    password: '',
    activo: true
  };

  readonly rolesNoEliminarEnCatalogo = new Set<string>([...APP_ROLES]);

  constructor(
    private pedidoService: PedidoService,
    private clienteService: ClienteService,
    readonly auth: AuthService,
    private perms: PermissionsService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private appConfig: AppConfigService,
    private admin: AdminService,
    private notify: NotificationService,
    private sanitizer: DomSanitizer,
    private reporte: ReporteService,
    private factiliza: FactilizaService
  ) {
    this.nuevoPedido = this.pedidoVacio();
  }

  ngOnInit(): void {
    this.rolesMatrix = { ...this.perms.getFullMatrix() };
    this.asegurarVistaPermitida();
    this.cargarPedidos();
    this.cargarClientes();
  }

  /** Indica si el rol fija una sola vendedora (ventas 1–4). */
  tieneVendedoraFijadaPorRol(): boolean {
    return this.vendedoraAsignadaPorRol() !== null;
  }

  private vendedoraAsignadaPorRol(): string | null {
    const r = (this.auth.usuario()?.rol ?? '').toUpperCase();
    if (['VENTAS_1', 'VENTAS_2', 'VENTAS_3', 'VENTAS_4', 'VENDEDORA'].includes(r)) {
      return this.auth.usuario()?.nombre?.trim() || null;
    }
    return null;
  }

  opcionesVendedoraSelect(): { value: string; label: string }[] {
    const todas = [
      { value: 'DIANA', label: 'DIANA' },
      { value: 'ANABEL', label: 'ANABEL' },
      { value: 'ISAMAR', label: 'ISAMAR' },
      { value: 'MELISSA', label: 'MELISSA' }
    ];
    const fija = this.vendedoraAsignadaPorRol();
    if (fija) {
      const existe = todas.some((o) => o.value.toUpperCase() === fija.toUpperCase());
      return existe
        ? todas.filter((o) => o.value.toUpperCase() === fija.toUpperCase())
        : [{ value: fija, label: fija }];
    }
    return todas;
  }

  private aplicarFiltroRolPedidos(lista: Pedido[]): Pedido[] {
    const v = this.vendedoraAsignadaPorRol();
    if (!v) {
      return lista;
    }
    return lista.filter((p) => (p.vendedora || '').toUpperCase() === v.toUpperCase());
  }

  private timestampIngreso(p: Pedido): number {
    const fecha = p.fechaIngreso || '1900-01-01';
    const hora = p.horaIngreso || '00:00:00';
    const t = new Date(`${fecha}T${hora}`).getTime();
    return Number.isFinite(t) ? t : 0;
  }

  private ordenarPedidosProduccion(lista: Pedido[]): Pedido[] {
    return [...lista].sort((a, b) => {
      const pa = a.prioridad ?? 0;
      const pb = b.prioridad ?? 0;
      if (pa !== pb) {
        return pb - pa;
      }
      return this.timestampIngreso(b) - this.timestampIngreso(a);
    });
  }

  private ordenarFilasProduccion(lista: PedidoVistaDetalle[]): PedidoVistaDetalle[] {
    return [...lista].sort((a, b) => {
      const pa = a.prioridad ?? 0;
      const pb = b.prioridad ?? 0;
      if (pa !== pb) {
        return pb - pa;
      }
      return this.timestampIngreso(b.pedidoOriginal) - this.timestampIngreso(a.pedidoOriginal);
    });
  }

  private sessionUsuario(): UsuarioSesion | null {
    return this.auth.usuario();
  }

  private usuarioParaAuditoria(): { nombre: string; correo: string; rol: string } {
    const u = this.sessionUsuario();
    return {
      nombre: u?.nombre ?? '',
      correo: u?.correo ?? '',
      rol: u?.rol ?? ''
    };
  }

  /** Mensaje legible desde respuestas de error HTTP (Spring / red). */
  private mensajeHttp(err: unknown, fallback: string): string {
    const e = err as {
      error?: { mensaje?: string } | string;
      status?: number;
      message?: string;
    };
    if (e?.error && typeof e.error === 'object' && e.error !== null && 'mensaje' in e.error) {
      const m = (e.error as { mensaje?: string }).mensaje;
      if (m) {
        return String(m);
      }
    }
    if (e?.status === 0) {
      return 'No hay conexión con el servidor. Compruebe su red y que el API esté disponible (URL configurada en el entorno).';
    }
    if (e?.status === 404) {
      return 'No se encontró el recurso solicitado.';
    }
    if (e?.status === 403) {
      return 'No tiene permiso para esta acción. Para registrar pagos se requiere rol Administración, Producción o Caja.';
    }
    if (e?.status === 401) {
      return 'Sesión caducada. Vuelva a iniciar sesión.';
    }
    if (typeof e?.error === 'string' && e.error.length > 0 && e.error.length < 600) {
      return e.error;
    }
    if (e?.message) {
      return e.message;
    }
    return fallback;
  }

  private saldoPedido(p: Pedido): number {
    return Math.max(Number(p.total || 0) - Number(p.adelanto || 0), 0);
  }

  private totalPagadoPedido(p: Pedido): number {
    const total = Number(p.total || 0);
    const adelanto = Number(p.adelanto || 0);
    return Math.min(Math.max(adelanto, 0), Math.max(total, 0));
  }

  private textoMayusculas(valor: unknown): string {
    return String(valor || '').trim().toUpperCase();
  }

  private materialesPedido(p: Pedido): string[] {
    const materiales = (p.detalles || [])
      .map((d) => this.textoMayusculas(d.material))
      .filter((m) => !!m);
    if (materiales.length > 0) {
      return materiales;
    }
    const principal = this.textoMayusculas(p.colorPrincipal);
    return principal ? [principal] : [];
  }

  private resumenMaterialesPedido(p: Pedido): string {
    const materiales = this.materialesPedido(p);
    return materiales.length ? materiales.join(', ') : '-';
  }

  /** Compara solo la parte fecha (yyyy-mm-dd) con rango inclusive. */
  private fechaEnRango(fecha: string | null | undefined, desde: string, hasta: string): boolean {
    const d = (desde || '').trim();
    const h = (hasta || '').trim();
    if (!d && !h) {
      return true;
    }
    const v = (fecha != null ? String(fecha) : '').slice(0, 10);
    if (!v) {
      return false;
    }
    if (d && v < d) {
      return false;
    }
    if (h && v > h) {
      return false;
    }
    return true;
  }

  coincideFiltrosPagos(p: Pedido): boolean {
    const saldo = this.saldoPedido(p);
    if (this.filtroPagoSaldo === 'DEBE' && saldo <= 0) {
      return false;
    }
    if (this.filtroPagoSaldo === 'CANCELADO' && saldo > 0) {
      return false;
    }
    if (
      !this.fechaEnRango(
        p.fechaIngreso as string,
        this.filtroPagoFechaIngresoDesde,
        this.filtroPagoFechaIngresoHasta
      )
    ) {
      return false;
    }
    return true;
  }

  coincideFiltrosReporte(p: Pedido): boolean {
    const nombreCliente = p.cliente?.nombre?.toLowerCase() ?? '';
    if (
      this.filtroRepCliente &&
      !nombreCliente.includes(this.filtroRepCliente.trim().toLowerCase())
    ) {
      return false;
    }
    if (this.filtroRepVendedora && p.vendedora !== this.filtroRepVendedora) {
      return false;
    }
    if (
      this.filtroRepEstado &&
      p.estado !== this.filtroRepEstado &&
      !(p.detalles || []).some((d) => (d.estado ?? p.estado) === this.filtroRepEstado)
    ) {
      return false;
    }
    if (
      this.filtroRepMaquina &&
      p.maquina !== this.filtroRepMaquina &&
      !(p.detalles || []).some((d) => d.maquina === this.filtroRepMaquina)
    ) {
      return false;
    }
    const saldo = this.saldoPedido(p);
    if (this.filtroRepSaldo === 'DEBE' && saldo <= 0) {
      return false;
    }
    if (this.filtroRepSaldo === 'CANCELADO' && saldo > 0) {
      return false;
    }
    if (!this.fechaEnRango(p.fechaIngreso as string, this.filtroRepFiDesde, this.filtroRepFiHasta)) {
      return false;
    }
    if (!this.fechaEnRango(p.fechaEntrega as string, this.filtroRepFeDesde, this.filtroRepFeHasta)) {
      return false;
    }
    return true;
  }

  private calcularResumenPedidos(lista: Pedido[]): { pedidos: number; total: number; saldo: number } {
    let total = 0;
    let saldo = 0;
    for (const p of lista) {
      total += Number(p.total || 0);
      saldo += this.saldoPedido(p);
    }
    return { pedidos: lista.length, total, saldo };
  }

  limpiarFiltrosReporte(): void {
    this.filtroRepCliente = '';
    this.filtroRepVendedora = '';
    this.filtroRepEstado = '';
    this.filtroRepMaquina = '';
    this.filtroRepSaldo = '';
    this.filtroRepFiDesde = '';
    this.filtroRepFiHasta = '';
    this.filtroRepFeDesde = '';
    this.filtroRepFeHasta = '';
    this.rebuildVista();
  }

  private scheduleReportePdfRefresh(): void {
    if (this.pdfRefreshTimer != null) {
      clearTimeout(this.pdfRefreshTimer);
    }
    this.pdfRefreshTimer = setTimeout(() => {
      this.pdfRefreshTimer = null;
      this.actualizarVistaPreviaReportePdf();
    }, 550);
  }

  actualizarVistaPreviaReportePdf(): void {
    this.reportePdfGenerando = true;
    this.cdr.markForCheck();
    this.reporte.obtenerPedidosPdf(this.buildReportePdfParams()).subscribe({
      next: (blob) => {
        if (this.pdfObjectUrl) {
          URL.revokeObjectURL(this.pdfObjectUrl);
        }
        this.pdfObjectUrl = URL.createObjectURL(blob);
        this.reportePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfObjectUrl);
        this.reportePdfGenerando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.reportePdfGenerando = false;
        this.notify.error(this.mensajeHttp(err, 'No se pudo generar el PDF del reporte.'));
        this.cdr.markForCheck();
      }
    });
  }

  private buildReportePdfParams(): ReportePedidosPdfParams {
    return {
      cliente: this.filtroRepCliente,
      vendedora: this.filtroRepVendedora,
      estado: this.filtroRepEstado,
      maquina: this.filtroRepMaquina,
      saldo: this.filtroRepSaldo,
      fiDesde: this.filtroRepFiDesde,
      fiHasta: this.filtroRepFiHasta,
      feDesde: this.filtroRepFeDesde,
      feHasta: this.filtroRepFeHasta
    };
  }

  private revocarVistaPreviaPdf(): void {
    this.reportePdfUrl = null;
    if (this.pdfObjectUrl) {
      URL.revokeObjectURL(this.pdfObjectUrl);
      this.pdfObjectUrl = null;
    }
  }

  ngOnDestroy(): void {
    if (this.pdfRefreshTimer != null) {
      clearTimeout(this.pdfRefreshTimer);
    }
    this.revocarVistaPreviaPdf();
  }

  rebuildVista(): void {
    if (
      this.vistaActual === 'DASHBOARD' ||
      this.vistaActual === 'CONFIGURACION' ||
      this.vistaActual === 'ROLES_PERMISOS'
    ) {
      this.columnKeys = new Set();
      this.pedidosVistaRows = [];
      this.cdr.markForCheck();
      return;
    }

    if (this.vistaActual === 'REPORTES') {
      this.columnKeys = new Set();
      const ordenados = this.ordenarPedidosProduccion(this.pedidos);
      const base = this.aplicarFiltroRolPedidos(ordenados);
      const filtrados = base.filter((p) => this.coincideFiltrosReporte(p));
      this.reportResumen = this.calcularResumenPedidos(filtrados);
      this.pedidosVistaRows = [];
      this.scheduleReportePdfRefresh();
      this.cdr.markForCheck();
      return;
    }

    const definicion = COLUMNAS_POR_VISTA[this.vistaActual];
    this.columnKeys = new Set(definicion ?? COLUMNAS_POR_VISTA['PEDIDOS']);

    const ordenados = this.ordenarPedidosProduccion(this.pedidos);

    const filtrados = ordenados.filter((p) => {
      const nombreCliente = p.cliente?.nombre?.toLowerCase() ?? '';
      const coincideCliente =
        !this.filtroCliente || nombreCliente.includes(this.filtroCliente.toLowerCase());
      const coincideVendedora = !this.filtroVendedora || p.vendedora === this.filtroVendedora;
      const coincideEstado =
        !this.filtroEstado ||
        p.estado === this.filtroEstado ||
        (p.detalles || []).some((d) => (d.estado ?? p.estado) === this.filtroEstado);
      const coincideMaquina =
        !this.filtroMaquina ||
        p.maquina === this.filtroMaquina ||
        (p.detalles || []).some((d) => d.maquina === this.filtroMaquina);
      if (!(coincideCliente && coincideVendedora && coincideEstado && coincideMaquina)) {
        return false;
      }
      if (!this.fechaEnRango(p.fechaIngreso as string, this.filtroFechaIngresoDesde, this.filtroFechaIngresoHasta)) {
        return false;
      }
      if (this.vistaActual === 'PAGOS') {
        return this.coincideFiltrosPagos(p);
      }
      return true;
    });

    const filas = this.ordenarFilasProduccion(this.pedidosADetalleVista(filtrados));

    if (this.vistaActual === 'PAGOS') {
      this.pedidosVistaRows = this.ordenarFilasProduccion(filtrados.map((p) => this.filaUnicaPorPedido(p)));
    } else if (this.vistaActual === 'CORTE') {
      this.pedidosVistaRows = this.filtrarFilasPorZona(filas, 'CORTE', this.subVistaCorte);
    } else if (this.vistaActual === 'CANTEADO') {
      this.pedidosVistaRows = this.filtrarFilasPorZona(filas, 'CANTEADO');
    } else if (this.vistaActual === 'ESPECIALES') {
      this.pedidosVistaRows = this.filtrarFilasPorZona(filas, 'ESPECIALES');
    } else if (this.vistaActual === 'DESPACHO') {
      this.pedidosVistaRows = this.filtrarFilasPorZona(filas, 'DESPACHO');
    } else if (this.vistaActual === 'ENTREGADO') {
      this.pedidosVistaRows = this.filtrarFilasPorZona(filas, 'ENTREGADO');
    } else {
      this.pedidosVistaRows = filas;
    }

    this.cdr.markForCheck();
  }

  onFiltrosCambiaron(): void {
    this.rebuildVista();
  }

  trackByPedidoRow(_index: number, row: PedidoVistaDetalle): string {
    return `${row.pedidoId}-${row.detalleId ?? 'root'}`;
  }

  /** Estado efectivo de un material: detalle primero, luego pedido. */
  estadoLineaPedido(pedido: Pedido, detalle?: PedidoDetalle): string {
    return (detalle?.estado ?? pedido.estado ?? 'CORTE').toUpperCase();
  }

  pedidosADetalleVista(lista: Pedido[]): PedidoVistaDetalle[] {
    return lista.flatMap((pedido) => {
      if (!pedido.id) {
        return [];
      }
      if (!pedido.detalles?.length) {
        return [this.filaPedidoSinDetalles(pedido)];
      }
      return pedido.detalles.map((detalle) => this.filaDesdeDetalle(pedido, detalle));
    });
  }

  filtrarFilasPorZona(
    filas: PedidoVistaDetalle[],
    estadoZona: string,
    maquina?: string
  ): PedidoVistaDetalle[] {
    const zona = estadoZona.toUpperCase();
    return filas.filter((fila) => {
      if (fila.esFilaPedidoCompleto) {
        return false;
      }
      if (fila.estado !== zona) {
        return false;
      }
      if (maquina && fila.maquina?.toUpperCase() !== maquina.toUpperCase()) {
        return false;
      }
      return true;
    });
  }

  private filaDesdeDetalle(pedido: Pedido, detalle: PedidoDetalle): PedidoVistaDetalle {
    const especiales = detalle.especiales || [];
    const estado = this.estadoLineaPedido(pedido, detalle);
    const saldo = Math.max(Number(pedido.total || 0) - Number(pedido.adelanto || 0), 0);

    return {
      pedidoId: pedido.id!,
      detalleId: detalle.id,
      numeroOrden: pedido.numeroOrden,
      cliente: pedido.cliente?.nombre ?? '-',
      cantidad: Number(detalle.cantidad || 0),
      color: this.textoMayusculas(detalle.material) || '-',
      cortes: Number(detalle.cortes || 0),
      ranuras: Number(detalle.ranuras || 0),
      perforaciones: Number(detalle.perforaciones || 0),
      maquina: detalle.maquina || pedido.maquina || '-',
      observaciones: detalle.observaciones || pedido.observaciones || '-',
      estado,
      pedidoOriginal: pedido,
      detalleOriginal: detalle,
      id: pedido.id!,
      _pedido: pedido,
      prioridad: pedido.prioridad,
      vendedora: pedido.vendedora,
      fechaIngreso: pedido.fechaIngreso,
      horaIngreso: pedido.horaIngreso,
      fechaEntrega: pedido.fechaEntrega,
      horaEntrega: pedido.horaEntrega,
      colorPrincipal: this.textoMayusculas(detalle.material) || '-',
      colorSecundario: this.textoMayusculas(pedido.colorSecundario) || undefined,
      colorTercero: this.textoMayusculas(pedido.colorTercero) || undefined,
      totalPedido: Number(pedido.total || 0),
      totalPagado: this.totalPagadoPedido(pedido),
      cantoDelgado: detalle.cantoDelgado,
      cantoGrueso: detalle.cantoGrueso,
      cantoDelgado36mm: detalle.cantoDelgado36mm,
      cantoGrueso36mm: detalle.cantoGrueso36mm,
      cantidadEspeciales: especiales.reduce((t, e) => t + Number(e.cantidad || 0), 0),
      descripcionEspeciales: especiales.map((e) => `${e.cantidad} ${e.descripcion}`).join(' / '),
      saldoPendiente: saldo,
      esFilaPedidoCompleto: false
    };
  }

  private filaPedidoSinDetalles(pedido: Pedido): PedidoVistaDetalle {
    const estado = this.estadoLineaPedido(pedido);
    const saldo = Math.max(Number(pedido.total || 0) - Number(pedido.adelanto || 0), 0);

    return {
      pedidoId: pedido.id!,
      numeroOrden: pedido.numeroOrden,
      cliente: pedido.cliente?.nombre ?? '-',
      cantidad: Number(pedido.cantidad || 0),
      color: this.resumenMaterialesPedido(pedido),
      cortes: Number(pedido.cortes || 0),
      ranuras: Number(pedido.ranuras || 0),
      perforaciones: Number(pedido.perforaciones || 0),
      maquina: pedido.maquina || '-',
      observaciones: pedido.observaciones || '-',
      estado,
      pedidoOriginal: pedido,
      id: pedido.id!,
      _pedido: pedido,
      prioridad: pedido.prioridad,
      vendedora: pedido.vendedora,
      fechaIngreso: pedido.fechaIngreso,
      horaIngreso: pedido.horaIngreso,
      fechaEntrega: pedido.fechaEntrega,
      horaEntrega: pedido.horaEntrega,
      colorPrincipal: this.resumenMaterialesPedido(pedido),
      colorSecundario: undefined,
      colorTercero: undefined,
      totalPedido: Number(pedido.total || 0),
      totalPagado: this.totalPagadoPedido(pedido),
      saldoPendiente: saldo,
      esFilaPedidoCompleto: false
    };
  }

  trackByClienteId(_index: number, c: Cliente): number {
    return c.id ?? _index;
  }

  trackByIndex(_index: number, _item: unknown): number {
    return _index;
  }

  trackByUsuarioAdminId(_index: number, u: UsuarioAdmin): number {
    return u.id;
  }

  trackByString(_index: number, s: string): string {
    return s;
  }

  trackByNavId(_index: number, nav: NavId): string {
    return nav;
  }

  trackByConfigKey(_index: number, key: string): string {
    return key;
  }

  trackByVendedoraOpt(_index: number, ov: { value: string; label: string }): string {
    return ov.value;
  }

  trackByClienteOption(_index: number, c: Cliente): number {
    return c.id ?? _index;
  }

  trackByAuditoria(_index: number, a: { id?: number; fechaCambio?: string }): string {
    return String(a?.id ?? `${a.fechaCambio ?? 'x'}-${_index}`);
  }

  trackByPagoHistorial(_index: number, h: { id?: number }): string | number {
    return h?.id ?? _index;
  }

  /** Una fila por pedido (vista Pagos: totales y saldo a nivel pedido). */
  filaUnicaPorPedido(p: Pedido): PedidoVistaDetalle {
    const saldo = Math.max(Number(p.total || 0) - Number(p.adelanto || 0), 0);
    let cantidad = Number(p.cantidad || 0);
    let color = this.resumenMaterialesPedido(p);
    let cortes = Number(p.cortes || 0);
    let ranuras = Number(p.ranuras || 0);
    let perforaciones = Number(p.perforaciones || 0);

    if (p.detalles?.length) {
      cantidad = p.detalles.reduce((s, d) => s + Number(d.cantidad || 0), 0);
      cortes = p.detalles.reduce((s, d) => s + Number(d.cortes || 0), 0);
      ranuras = p.detalles.reduce((s, d) => s + Number(d.ranuras || 0), 0);
      perforaciones = p.detalles.reduce((s, d) => s + Number(d.perforaciones || 0), 0);
    }

    return {
      pedidoId: p.id!,
      numeroOrden: p.numeroOrden,
      cliente: p.cliente?.nombre ?? '-',
      cantidad,
      color,
      cortes,
      ranuras,
      perforaciones,
      maquina: p.maquina || '-',
      observaciones: p.observaciones || '-',
      estado: (p.estado ?? 'CORTE').toUpperCase(),
      pedidoOriginal: p,
      id: p.id!,
      _pedido: p,
      prioridad: p.prioridad,
      vendedora: p.vendedora,
      fechaIngreso: p.fechaIngreso,
      horaIngreso: p.horaIngreso,
      fechaEntrega: p.fechaEntrega,
      horaEntrega: p.horaEntrega,
      colorPrincipal: color,
      colorSecundario: undefined,
      colorTercero: undefined,
      totalPedido: Number(p.total || 0),
      totalPagado: this.totalPagadoPedido(p),
      saldoPendiente: saldo,
      esFilaPedidoCompleto: true
    };
  }

    pedidoVacio(): Pedido {
      const v = this.vendedoraAsignadaPorRol();
      return {
        numeroOrden: '',
        cliente: null,

        maquina: 'ESCUADRADORA',
        estado: 'CORTE',
        vendedora: v ?? '',

        observaciones: '',

        fechaEntrega: '',
        horaEntrega: '',
        prioridad: 0,
        total: 0,
        adelanto: 0,

        detalles: []
      };
    }

    nuevoDetalle() {
      return {
        cantidad: 0,
        material: '',
        maquina: 'ESCUADRADORA',
        estado: 'CORTE',

        cortes: 0,
        ranuras: 0,
        perforaciones: 0,

        cantoDelgado: 0,
        cantoGrueso: 0,
        cantoDelgado36mm: 0,
        cantoGrueso36mm: 0,

        observaciones: '',
        especiales: []
      };
    }

    agregarDetalle() {
      if (!this.nuevoPedido.detalles) {
        this.nuevoPedido.detalles = [];
      }

      this.nuevoPedido.detalles.push(this.nuevoDetalle());
    }

    abrirModalClienteDesdePedido() {
      this.modoEdicionCliente = false;
      this.clienteEditandoId = null;
      this.nuevoCliente = {
        tipoDocumento: 'DNI',
        numeroDocumento: '',
        nombre: '',
        telefono: '',
        direccion: '',
        correo: ''
      };
    this.clienteDocumentoError = '';
    this.consultandoDocumentoCliente = false;
      this.mostrarModalCliente = true;
    }

    eliminarDetalle(index: number) {
      this.nuevoPedido.detalles?.splice(index, 1);
    }

    agregarEspecial(detalle: any) {
      detalle.especiales.push({
        cantidad: 1,
        descripcion: ''
      });
    }

    eliminarEspecial(detalle: any, index: number) {
      detalle.especiales.splice(index, 1);
    }


  puedeVerNav(nav: string): boolean {
    return this.perms.canAccessNav(this.auth.usuario()?.rol, nav as NavId);
  }

  navEtiqueta(nav: NavId): string {
    return navLabel(nav);
  }

  rolEtiqueta(rol: string): string {
    return roleLabel(rol);
  }

  seleccionarVista(vista: string): void {
    const nav = vista as NavId;
    if (!this.perms.canAccessNav(this.auth.usuario()?.rol, nav)) {
      this.notify.warning('No tiene acceso a este apartado. Consulte con un administrador.');
      this.cdr.markForCheck();
      return;
    }

    if (this.vistaActual === 'REPORTES' && vista !== 'REPORTES') {
      if (this.pdfRefreshTimer != null) {
        clearTimeout(this.pdfRefreshTimer);
        this.pdfRefreshTimer = null;
      }
      this.revocarVistaPreviaPdf();
    }

    this.vistaActual = vista;
    this.filtroCliente = '';
    this.filtroVendedora = '';
    this.filtroEstado = '';
    this.filtroMaquina = '';
    this.filtroFechaIngresoDesde = '';
    this.filtroFechaIngresoHasta = '';

    if (nav === 'ROLES_PERMISOS') {
      this.rolesMatrix = { ...this.perms.getFullMatrix() };
      if (this.auth.hasRole('ADMIN')) {
        this.refrescarRolesYUsuariosAdmin();
      }
    }

    if (nav === 'CONFIGURACION') {
      this.cargarConfiguracion();
    }

    this.rebuildVista();
  }

  private asegurarVistaPermitida(): void {
    const rol = this.auth.usuario()?.rol;
    if (!this.perms.canAccessNav(rol, this.vistaActual as NavId)) {
      this.vistaActual = this.perms.firstAllowedNav(rol);
      this.rebuildVista();
    }
  }

  permisoNavActivo(rol: string, nav: NavId): boolean {
    return (this.rolesMatrix[rol] ?? []).includes(nav);
  }

  togglePermisoNav(rol: string, nav: NavId, activo: boolean): void {
    const actual = new Set(this.rolesMatrix[rol] ?? []);
    if (activo) {
      actual.add(nav);
    } else {
      actual.delete(nav);
    }
    this.rolesMatrix = {
      ...this.rolesMatrix,
      [rol]: ALL_NAV_IDS.filter((n) => actual.has(n))
    };
    this.cdr.markForCheck();
  }

  guardarMatrizPermisos(): void {
    if (!this.auth.hasRole('ADMIN')) {
      this.notify.warning('Solo un administrador puede guardar permisos.');
      return;
    }
    this.perms.saveFullMatrix(this.rolesMatrix);
    this.notify.success('Permisos guardados. Los cambios aplican en la próxima navegación o al recargar la página.');
    this.cdr.markForCheck();
  }

  restaurarMatrizPorDefecto(): void {
    if (!this.auth.hasRole('ADMIN')) {
      return;
    }
    if (!confirm('¿Restaurar permisos por defecto para todos los roles?')) {
      return;
    }
    this.perms.clearStoredMatrix();
    this.rolesMatrix = { ...this.perms.getFullMatrix() };
    this.notify.success('Se restauraron los valores por defecto.');
    if (this.auth.hasRole('ADMIN')) {
      this.refrescarRolesYUsuariosAdmin();
    }
    this.cdr.markForCheck();
  }

  private cargarConfiguracion(): void {
    this.appConfig.obtener().subscribe({
      next: (m) => {
        this.configMapa = { ...m };
        this.syncConfigKeysFromMap();
        this.cdr.markForCheck();
      },
      error: (err) => console.error(err)
    });
  }

  guardarConfiguracion(): void {
    if (!this.auth.hasRole('ADMIN')) {
      this.notify.warning('Solo un administrador puede guardar la configuración.');
      return;
    }
    this.appConfig.guardar(this.configMapa).subscribe({
      next: (m) => {
        this.configMapa = { ...m };
        this.syncConfigKeysFromMap();
        this.notify.success('Configuración guardada.');
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error(err);
        this.notify.error(this.mensajeHttp(err, 'No se pudo guardar la configuración'));
      }
    });
  }

  private refrescarRolesYUsuariosAdmin(): void {
    this.admin.listarRolesCatalogo().subscribe({
      next: (list) => {
        this.rolesMatrixRoles = this.perms.matrixRolesUnion(list);
        const m = { ...this.perms.getFullMatrix() };
        for (const r of this.rolesMatrixRoles) {
          if (!m[r]) {
            m[r] = this.perms.defaultNavForRole(r);
          }
        }
        this.rolesMatrix = m;
        this.cdr.markForCheck();
      },
      error: (err) => console.error(err)
    });
    this.admin.listarUsuarios().subscribe({
      next: (rows) => {
        this.usuariosAdmin = rows;
        this.cdr.markForCheck();
      },
      error: (err) => console.error(err)
    });
  }

  crearRolEnCatalogo(): void {
    const nombre = (this.nuevoRolNombre || '').trim();
    if (!nombre) {
      this.notify.warning('Escriba el nombre del rol (se guardará en MAYÚSCULAS).');
      return;
    }
    this.admin.crearRolCatalogo(nombre).subscribe({
      next: () => {
        this.nuevoRolNombre = '';
        this.refrescarRolesYUsuariosAdmin();
      },
      error: (err: any) => {
        console.error(err);
        this.notify.error(this.mensajeHttp(err, 'No se pudo crear el rol'));
      }
    });
  }

  eliminarRolCatalogo(rol: string): void {
    if (!confirm(`¿Eliminar el rol «${rol}» del catálogo? (No debe haber usuarios con ese rol.)`)) {
      return;
    }
    this.admin.eliminarRolCatalogo(rol).subscribe({
      next: () => this.refrescarRolesYUsuariosAdmin(),
      error: (err: any) => {
        console.error(err);
        this.notify.error(this.mensajeHttp(err, 'No se pudo eliminar el rol'));
      }
    });
  }

  abrirModalUsuarioNuevo(): void {
    this.modoEdicionUsuario = false;
    this.usuarioForm = {
      nombre: '',
      correo: '',
      rol: this.rolesMatrixRoles[0] ?? 'PRODUCCION',
      password: '',
      activo: true
    };
    this.mostrarModalUsuario = true;
    this.cdr.markForCheck();
  }

  abrirModalUsuarioEditar(u: UsuarioAdmin): void {
    this.modoEdicionUsuario = true;
    this.usuarioForm = {
      id: u.id,
      nombre: u.nombre,
      correo: u.correo,
      rol: u.rol,
      password: '',
      activo: u.activo
    };
    this.mostrarModalUsuario = true;
    this.cdr.markForCheck();
  }

  cerrarModalUsuario(): void {
    this.mostrarModalUsuario = false;
  }

  guardarUsuarioAdminForm(): void {
    if (!this.usuarioForm.nombre?.trim() || !this.usuarioForm.correo?.trim() || !this.usuarioForm.rol) {
      this.notify.warning('Complete nombre, correo y rol.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.usuarioForm.correo.trim())) {
      this.notify.warning('Ingrese un correo válido.');
      return;
    }
    if (this.usuarioForm.password?.trim() && this.usuarioForm.password.trim().length < 6) {
      this.notify.warning('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (this.modoEdicionUsuario && this.usuarioForm.id != null) {
      this.admin
        .actualizarUsuario(this.usuarioForm.id, {
          nombre: this.usuarioForm.nombre.trim(),
          correo: this.usuarioForm.correo.trim(),
          rol: this.usuarioForm.rol,
          password: this.usuarioForm.password?.trim() || undefined,
          activo: this.usuarioForm.activo
        })
        .subscribe({
          next: () => {
            this.cerrarModalUsuario();
            this.refrescarRolesYUsuariosAdmin();
          },
          error: (err: any) => {
            console.error(err);
            this.notify.error(this.mensajeHttp(err, 'Error al actualizar usuario'));
          }
        });
      return;
    }
    this.admin
      .crearUsuario({
        nombre: this.usuarioForm.nombre.trim(),
        correo: this.usuarioForm.correo.trim(),
        rol: this.usuarioForm.rol,
        password: this.usuarioForm.password?.trim() || undefined,
        activo: this.usuarioForm.activo
      })
      .subscribe({
        next: () => {
          this.cerrarModalUsuario();
          this.refrescarRolesYUsuariosAdmin();
        },
        error: (err: any) => {
          console.error(err);
          this.notify.error(this.mensajeHttp(err, 'Error al crear usuario'));
        }
      });
  }

  abrirModalRegistrarPago(row: PedidoVistaDetalle): void {
    const p = row.pedidoOriginal;
    this.pedidoPagoSeleccion = p;
    this.guardandoPago = false;
    this.codigoPagoError = '';
    this.formPago = { monto: 0, metodoPago: 'BCP', codigoPago: '', nota: '' };
    this.mostrarModalPago = true;
    this.cdr.markForCheck();
  }

  cerrarModalPago(): void {
    this.mostrarModalPago = false;
    this.guardandoPago = false;
    this.pedidoPagoSeleccion = null;
    this.codigoPagoError = '';
  }

  metodoPagoRequiereCodigo(): boolean {
    return (this.formPago.metodoPago || '').toUpperCase() !== 'EFECTIVO';
  }

  onMetodoPagoChange(): void {
    if (!this.metodoPagoRequiereCodigo()) {
      this.formPago.codigoPago = '';
    }
    this.validarCodigoPago();
    this.cdr.markForCheck();
  }

  onCodigoPagoChange(valor: unknown): void {
    const digitos = String(valor || '').replace(/\D/g, '');
    this.formPago.codigoPago = digitos.slice(0, 12);
    this.validarCodigoPago();
    if (digitos.length > 12) {
      this.codigoPagoError = 'El código de operación debe tener máximo 12 dígitos.';
    }
  }

  validarCodigoPago(): void {
    const codigo = String(this.formPago.codigoPago || '');
    this.codigoPagoError = '';
    if (!this.metodoPagoRequiereCodigo()) {
      return;
    }
    if (!codigo) {
      this.codigoPagoError = 'Ingrese el código de operación.';
      return;
    }
    if (codigo.length > 12) {
      this.codigoPagoError = 'El código de operación debe tener máximo 12 dígitos.';
    }
  }

  totalPedidoPagoSeleccion(): number {
    return Number(this.pedidoPagoSeleccion?.total || 0);
  }

  totalPagadoPagoSeleccion(): number {
    return this.pedidoPagoSeleccion ? this.totalPagadoPedido(this.pedidoPagoSeleccion) : 0;
  }

  saldoPagoSeleccion(): number {
    return Math.max(this.totalPedidoPagoSeleccion() - this.totalPagadoPagoSeleccion(), 0);
  }

  pedidoPagoCancelado(): boolean {
    return (this.pedidoPagoSeleccion?.estado || '').toUpperCase() === 'CANCELADO' || this.saldoPagoSeleccion() <= 0;
  }

  montoPagoInvalido(): boolean {
    const monto = Number(this.formPago.monto || 0);
    return monto <= 0 || monto > this.saldoPagoSeleccion();
  }

  puedeGuardarPago(): boolean {
    const codigoPendiente = this.metodoPagoRequiereCodigo() && !String(this.formPago.codigoPago || '').trim();
    return !this.guardandoPago &&
      !this.pedidoPagoCancelado() &&
      !this.montoPagoInvalido() &&
      !codigoPendiente &&
      !this.codigoPagoError;
  }

  pagarSaldoCompleto(): void {
    this.formPago.monto = Number(this.saldoPagoSeleccion().toFixed(2));
    this.cdr.markForCheck();
  }

  guardarRegistroPago(): void {
    if (this.guardandoPago) {
      return;
    }
    const ped = this.pedidoPagoSeleccion;
    if (!ped?.id) {
      return;
    }
    const m = Number(this.formPago.monto);
    if (!m || m <= 0) {
      this.notify.warning('El monto debe ser mayor a cero.');
      return;
    }
    if (this.pedidoPagoCancelado()) {
      this.notify.warning('Este pedido ya está cancelado. No se pueden registrar más pagos.');
      return;
    }
    if (m > this.saldoPagoSeleccion()) {
      this.notify.warning('El monto no puede superar el saldo pendiente.');
      return;
    }
    const metodo = (this.formPago.metodoPago || '').trim();
    const codigo = (this.formPago.codigoPago || '').trim();
    this.validarCodigoPago();
    if (this.metodoPagoRequiereCodigo() && this.codigoPagoError) {
      this.notify.warning(this.codigoPagoError);
      return;
    }
    const body: RegistrarPagoPayload = {
      monto: m,
      metodoPago: metodo,
      codigoPago: this.metodoPagoRequiereCodigo() ? codigo : undefined,
      nota: this.formPago.nota?.trim() || undefined
    };
    this.guardandoPago = true;
    this.cdr.markForCheck();
    this.pedidoService.registrarPagoPedido(ped.id, body).subscribe({
      next: () => {
        this.guardandoPago = false;
        this.notify.success('Pago registrado correctamente.');
        this.cerrarModalPago();
        this.cargarPedidos();
      },
      error: (err: unknown) => {
        this.guardandoPago = false;
        console.error(err);
        this.notify.error(this.mensajeHttp(err, 'No se pudo registrar el pago'));
        this.cdr.markForCheck();
      }
    });
  }

  abrirHistorialPagosPedido(row: PedidoVistaDetalle): void {
    const p = row.pedidoOriginal;
    if (!p?.id) {
      return;
    }
    this.pedidoPagoSeleccion = p;
    this.pedidoService.listarPagosPedido(p.id).subscribe({
      next: (list) => {
        this.historialPagos = list;
        this.mostrarHistorialPagos = true;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error(err);
        this.notify.error(this.mensajeHttp(err, 'No se pudo cargar el historial de pagos'));
      }
    });
  }

  cerrarHistorialPagos(): void {
    this.mostrarHistorialPagos = false;
    this.historialPagos = [];
    this.pedidoPagoSeleccion = null;
  }

  private syncConfigKeysFromMap(): void {
    this.configKeysOrdenadas = Object.keys(this.configMapa || {}).sort((a, b) => a.localeCompare(b));
  }

  etiquetaClaveConfig(clave: string): string {
    const m: Record<string, string> = {
      'empresa.nombre': 'Nombre comercial',
      'empresa.ruc': 'RUC',
      'empresa.direccion': 'Dirección fiscal',
      'empresa.telefono': 'Teléfono',
      'empresa.correo': 'Correo de la empresa',
      'moneda.simbolo': 'Símbolo de moneda',
      'documento.pie': 'Texto pie de documento / ticket',
      'sistema.zonaHoraria': 'Zona horaria (IANA)',
      'notificaciones.correoOrigen': 'Correo remitente (notificaciones)',
      'sesion.minutosInactividad': 'Minutos de inactividad (referencia)'
    };
    return m[clave] ?? clave;
  }

  cambiarSubVistaCorte(maquina: string): void {
    this.subVistaCorte = maquina;
    this.rebuildVista();
  }

  limpiarFiltros(): void {
    this.filtroCliente = '';
    this.filtroVendedora = '';
    this.filtroEstado = '';
    this.filtroMaquina = '';
    this.filtroFechaIngresoDesde = '';
    this.filtroFechaIngresoHasta = '';
    this.filtroPagoSaldo = '';
    this.filtroPagoFechaIngresoDesde = '';
    this.filtroPagoFechaIngresoHasta = '';
    this.rebuildVista();
  }

    abrirModal() {
      this.modoEdicion = false;
      this.mostrarModal = true;
      this.nuevoPedido = this.pedidoVacio();
      this.entregaError = '';
      const vendedora = this.vendedoraAsignadaPorRol();
      if (vendedora) {
        this.nuevoPedido.vendedora = vendedora;
      }
      this.cargarSiguienteNumeroOrden();
    }

  private cargarSiguienteNumeroOrden(): void {
    this.pedidoService.siguienteNumeroOrden('27000').subscribe({
      next: (res) => {
        if (!this.modoEdicion) {
          this.nuevoPedido.numeroOrden = res.numeroOrden;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error(err);
        this.notify.error(this.mensajeHttp(err, 'No se pudo generar el número de orden'));
      }
    });
  }

    editarPedido(row: PedidoVistaDetalle | Pedido) {
      const pedido = 'pedidoOriginal' in row ? row.pedidoOriginal : row;
      this.abrirConfirmacion(
        'Editar pedido',
        `¿Seguro que deseas editar el pedido ${pedido.numeroOrden}?`,
        () => {
          const original = pedido;
          this.modoEdicion = true;
          this.mostrarModal = true;
          this.nuevoPedido = JSON.parse(JSON.stringify(original));
          this.validarFechaHoraEntrega();
        }
      );
    }

    abrirModalCliente() {
      this.modoEdicionCliente = false;
      this.clienteEditandoId = null;
      this.nuevoCliente = {
        tipoDocumento: 'DNI',
        numeroDocumento: '',
        nombre: '',
        telefono: '',
        direccion: '',
        correo: ''
      };
    this.clienteDocumentoError = '';
      this.consultandoDocumentoCliente = false;
      this.mostrarModalCliente = true;
    }

    abrirEditarCliente(cliente: Cliente): void {
      this.modoEdicionCliente = true;
      this.clienteEditandoId = cliente.id ?? null;
      this.nuevoCliente = {
        tipoDocumento: cliente.tipoCliente || 'DNI',
        numeroDocumento: cliente.documento || '',
        nombre: cliente.nombre,
        telefono: cliente.telefono || '',
        direccion: cliente.direccion || '',
        correo: cliente.correo || ''
      };
    this.validarDocumentoCliente();
      this.consultandoDocumentoCliente = false;
      this.mostrarModalCliente = true;
    }

    cerrarModalCliente() {
      this.mostrarModalCliente = false;
      this.modoEdicionCliente = false;
      this.clienteEditandoId = null;
    this.clienteDocumentoError = '';
    this.consultandoDocumentoCliente = false;
    }

    guardarCliente() {
    this.validarDocumentoCliente();
    if (this.clienteDocumentoError) {
      this.notify.warning(this.clienteDocumentoError);
      return;
    }

    if (!this.nuevoCliente.numeroDocumento) {
      this.notify.warning('Ingrese número de documento');
      return;
    }

    if (!this.nuevoCliente.nombre?.trim()) {
      this.notify.warning('Ingrese nombre o razón social');
      return;
    }

    const duplicadoDocumento = this.clientes.some((c) =>
      c.id !== this.clienteEditandoId &&
      String(c.documento || '').trim() === String(this.nuevoCliente.numeroDocumento || '').trim()
    );
    if (duplicadoDocumento) {
      this.notify.warning('Ya existe un cliente registrado con ese documento');
      return;
    }

    const nombreNormalizado = this.normalizarNombreCliente(this.nuevoCliente.nombre);
    const duplicadoNombre = this.clientes.some((c) =>
      c.id !== this.clienteEditandoId &&
      this.normalizarNombreCliente(c.nombre) === nombreNormalizado &&
      String(c.documento || '').trim() !== String(this.nuevoCliente.numeroDocumento || '').trim()
    );
    if (duplicadoNombre) {
      this.notify.warning('Ya existe un cliente con este nombre o razón social.');
      return;
    }

    if (this.nuevoCliente.telefono && this.nuevoCliente.telefono.length !== 9) {
      this.notify.warning('El teléfono debe tener 9 dígitos');
      return;
    }

    const payload: ClientePayload = {
      nombre: this.nuevoCliente.nombre,
      documento: this.nuevoCliente.numeroDocumento,
      telefono: this.nuevoCliente.telefono,
      correo: this.nuevoCliente.correo,
      direccion: this.nuevoCliente.direccion,
      tipoCliente: this.nuevoCliente.tipoDocumento
    };

    const req = this.modoEdicionCliente && this.clienteEditandoId
      ? this.clienteService.actualizar(this.clienteEditandoId, payload)
      : this.clienteService.crear(payload);

    req.subscribe({
      next: () => {
        this.notify.success(this.modoEdicionCliente ? 'Cliente actualizado correctamente' : 'Cliente registrado correctamente');
        this.cargarClientes();
        this.mostrarModalCliente = false;
        this.modoEdicionCliente = false;
        this.clienteEditandoId = null;
        this.clienteDocumentoError = '';
        this.nuevoCliente = {
          tipoDocumento: 'DNI',
          numeroDocumento: '',
          nombre: '',
          telefono: '',
          direccion: '',
          correo: ''
        };
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.notify.error(this.mensajeHttp(err, 'Error al guardar cliente'));
      }
    });
  }

  limpiarSoloNumeros(valor: any, max: number): string {
    return String(valor || '')
      .replace(/\D/g, '')
      .slice(0, max);
  }

  normalizarMayusculas(valor: unknown): string {
    return String(valor || '').toUpperCase();
  }

  onMaterialChange(detalle: any, valor: unknown): void {
    detalle.material = this.normalizarMayusculas(valor);
  }

  onEspecialDescripcionChange(especial: any, valor: unknown): void {
    especial.descripcion = this.normalizarMayusculas(valor);
  }

  onTipoDocumentoClienteChange(): void {
    const max = this.nuevoCliente.tipoDocumento === 'DNI' ? 8 : 11;
    this.nuevoCliente.numeroDocumento = this.limpiarSoloNumeros(this.nuevoCliente.numeroDocumento, max);
    this.validarDocumentoCliente();
  }

  onDocumentoClienteChange(valor: unknown): void {
    const max = this.nuevoCliente.tipoDocumento === 'DNI' ? 8 : 11;
    this.nuevoCliente.numeroDocumento = this.limpiarSoloNumeros(valor, max);
    this.validarDocumentoCliente();
  }

  documentoClienteConsultable(): boolean {
    const tipo = String(this.nuevoCliente.tipoDocumento || '').toUpperCase();
    const documento = String(this.nuevoCliente.numeroDocumento || '');
    return (tipo === 'DNI' && documento.length === 8) || (tipo === 'RUC' && documento.length === 11);
  }

  consultarDocumentoClienteDesdeEnter(event: Event): void {
    event.preventDefault();
    if (!this.consultandoDocumentoCliente && this.documentoClienteConsultable()) {
      this.consultarDocumentoCliente();
    }
  }

  validarDocumentoCliente(): void {
    const tipo = this.nuevoCliente.tipoDocumento;
    const doc = String(this.nuevoCliente.numeroDocumento || '');
    this.clienteDocumentoError = '';
    if (!doc) {
      return;
    }
    if (tipo === 'DNI' && doc.length !== 8) {
      this.clienteDocumentoError = 'DNI inválido. Debe contener 8 dígitos';
    } else if (tipo === 'RUC' && doc.length !== 11) {
      this.clienteDocumentoError = 'RUC inválido. Debe contener 11 dígitos';
    }
  }

  consultarDocumentoCliente(): void {
    const tipo = String(this.nuevoCliente.tipoDocumento || '').toUpperCase();
    const documento = String(this.nuevoCliente.numeroDocumento || '').trim();
    this.validarDocumentoCliente();

    if (tipo === 'DNI' && documento.length !== 8) {
      this.clienteDocumentoError = 'DNI inválido';
      this.notify.warning('DNI inválido');
      this.cdr.markForCheck();
      return;
    }
    if (tipo === 'RUC' && documento.length !== 11) {
      this.clienteDocumentoError = 'RUC inválido';
      this.notify.warning('RUC inválido');
      this.cdr.markForCheck();
      return;
    }
    if (!['DNI', 'RUC'].includes(tipo)) {
      this.notify.warning('Seleccione DNI o RUC para consultar.');
      return;
    }

    this.consultandoDocumentoCliente = true;
    this.cdr.markForCheck();

    this.factiliza.consultarDocumento(documento).subscribe({
      next: (res) => {
        this.consultandoDocumentoCliente = false;
        if (!res.success) {
          this.notify.warning(res.mensaje || 'Documento no encontrado');
          this.cdr.markForCheck();
          return;
        }
        this.aplicarDatosFactiliza(res);
        this.notify.success('Datos encontrados');
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.consultandoDocumentoCliente = false;
        this.notify.error(this.mensajeHttp(err, 'No fue posible consultar Factiliza'));
        this.cdr.markForCheck();
      }
    });
  }

  private aplicarDatosFactiliza(res: FactilizaDocumentoResponse): void {
    const tipo = String(res.tipoDocumento || this.nuevoCliente.tipoDocumento || '').toUpperCase();
    if (tipo === 'DNI') {
      const nombreDni = [
        res.apellidoPaterno,
        res.apellidoMaterno,
        res.nombres
      ]
        .map((v) => String(v || '').trim().toUpperCase())
        .filter(Boolean)
        .join(' ');
      this.nuevoCliente.tipoDocumento = 'DNI';
      this.nuevoCliente.numeroDocumento = res.numeroDocumento || this.nuevoCliente.numeroDocumento;
      this.nuevoCliente.nombre = nombreDni || this.normalizarMayusculas(res.nombreCompleto);
    } else if (tipo === 'RUC') {
      this.nuevoCliente.tipoDocumento = 'RUC';
      this.nuevoCliente.numeroDocumento = res.ruc || this.nuevoCliente.numeroDocumento;
      this.nuevoCliente.nombre = this.normalizarMayusculas(res.razonSocial);
    }
    this.nuevoCliente.direccion = this.normalizarMayusculas(res.direccion);
    this.validarDocumentoCliente();
  }

  private normalizarNombreCliente(nombre: unknown): string {
    return String(nombre || '').trim().replace(/\s+/g, ' ').toUpperCase();
  }

  cargarClientes() {
    this.clienteService.listar().subscribe({
      next: (data) => {
        this.clientes = data;
        this.clientesFiltrados = data;
        this.cdr.markForCheck();
      },
      error: (err) => console.error(err)
    });
  }

  eliminarCliente(cliente: any) {
    const confirmar = confirm(`¿Seguro que deseas eliminar al cliente ${cliente.nombre}?`);

    if (!confirmar) return;

    this.clienteService.eliminar(cliente.id).subscribe({
      next: () => {
        this.notify.success('Cliente eliminado correctamente');
        this.cargarClientes();
      },
      error: (err: any) => {
        console.error(err);
        this.notify.error(this.mensajeHttp(err, 'No se pudo eliminar el cliente. Puede tener pedidos asociados.'));
      }
    });
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.modoEdicion = false;
    this.entregaError = '';
  }

  validarFechaHoraEntrega(): void {
    this.entregaError = '';
    const fecha = this.nuevoPedido?.fechaEntrega;
    if (!fecha) {
      return;
    }
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().slice(0, 10);
    if (fecha < fechaHoy) {
      this.entregaError = 'La fecha y hora de entrega no puede ser anterior a la actual.';
      return;
    }
    const hora = this.nuevoPedido?.horaEntrega;
    if (fecha === fechaHoy && hora) {
      const horaActual = `${String(hoy.getHours()).padStart(2, '0')}:${String(hoy.getMinutes()).padStart(2, '0')}`;
      if (hora < horaActual) {
        this.entregaError = 'La fecha y hora de entrega no puede ser anterior a la actual.';
      }
    }
  }

  puedeGuardarPedido(): boolean {
    return !this.entregaError;
  }

  guardarPedido() {
    this.validarFechaHoraEntrega();
    if (this.entregaError) {
      this.notify.warning(this.entregaError);
      return;
    }
    if (!this.nuevoPedido.numeroOrden?.trim()) {
      this.notify.warning('Ingrese el N° de orden');
      return;
    }

    if (!this.nuevoPedido.cliente) {
      this.notify.warning('Seleccione un cliente');
      return;
    }

    if (!this.nuevoPedido.vendedora) {
      this.notify.warning('Seleccione una vendedora');
      return;
    }

    if (!this.nuevoPedido.detalles || this.nuevoPedido.detalles.length === 0) {
      this.notify.warning('Agrega al menos un material al pedido');
      return;
    }
    this.nuevoPedido.detalles.forEach((d) => this.normalizarDetalle(d));
    if (this.nuevoPedido.colorPrincipal) {
      this.nuevoPedido.colorPrincipal = this.normalizarMayusculas(this.nuevoPedido.colorPrincipal);
    }
    if (this.nuevoPedido.colorSecundario) {
      this.nuevoPedido.colorSecundario = this.normalizarMayusculas(this.nuevoPedido.colorSecundario);
    }
    if (this.nuevoPedido.colorTercero) {
      this.nuevoPedido.colorTercero = this.normalizarMayusculas(this.nuevoPedido.colorTercero);
    }

    this.nuevoPedido.adelanto = this.modoEdicion ? Number(this.nuevoPedido.adelanto || 0) : 0;

    const totalPedido = Number(this.nuevoPedido.total || 0);
    if (totalPedido < 0) {
      this.notify.warning('El total no puede ser negativo');
      return;
    }

    for (const d of this.nuevoPedido.detalles) {
      if (!d.material?.trim()) {
        this.notify.warning('Cada material debe tener nombre/color');
        return;
      }

      if (!d.cantidad || Number(d.cantidad) <= 0) {
        this.notify.warning('Cada material debe tener cantidad mayor a 0');
        return;
      }
    }

    if (this.modoEdicion && this.nuevoPedido.id) {
      this.pedidoService
        .actualizar(this.nuevoPedido.id, this.nuevoPedido, this.usuarioParaAuditoria())
        .subscribe({
          next: () => {
            this.notify.success('Pedido actualizado correctamente.');
            this.cerrarModal();
            this.cargarPedidos();
          },
          error: (err: any) => {
            console.error(err);
            this.notify.error(this.mensajeHttp(err, 'Error al actualizar pedido'));
          }
        });
      return;
    }

    this.nuevoPedido.estado = 'CORTE';
    this.nuevoPedido.prioridad = this.pedidos.length + 1;
    this.nuevoPedido.detalles.forEach((d) => {
      if (!d.estado) {
        d.estado = 'CORTE';
      }
    });

    this.pedidoService.crear(this.nuevoPedido).subscribe({
      next: () => {
        this.notify.success('Pedido creado correctamente.');
        this.cerrarModal();
        this.cargarPedidos();
      },
      error: (err: any) => {
        console.error(err);
        this.notify.error(this.mensajeHttp(err, 'Error al registrar pedido'));
      }
    });
  }

  cargarPedidos() {
    this.pedidoService.listar().subscribe({
      next: (data) => {
        this.pedidos = this.aplicarFiltroRolPedidos(
          this.ordenarPedidosProduccion(data)
        );

        this.recalcularDashboard();
        this.rebuildVista();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.notify.error(this.mensajeHttp(err, 'No se pudieron cargar los pedidos.'));
        this.cdr.markForCheck();
      }
    });
  }

  recalcularDashboard() {
    const lineas = this.pedidosADetalleVista(this.pedidos);
    this.totalPedidos = this.pedidos.length;
    this.totalCorte = lineas.filter((r) => r.estado === 'CORTE').length;
    this.totalCanteado = lineas.filter((r) => r.estado === 'CANTEADO').length;
    this.totalDespacho = lineas.filter((r) => r.estado === 'DESPACHO').length;
    this.totalEntregados = lineas.filter((r) => r.estado === 'ENTREGADO').length;
    this.totalEspeciales = lineas.filter((r) => r.estado === 'ESPECIALES').length;
    this.pedidosVencidos = lineas.filter((r) => this.esPedidoVencido(r)).length;
    this.promedioDiasEntrega = this.calcularPromedioDiasEntrega();

    const detallesCorte = lineas.filter((r) => r.estado === 'CORTE');
    this.totalEscuadradora = detallesCorte.filter((p) => p.maquina?.toUpperCase() === 'ESCUADRADORA').length;
    this.totalSeccionadora = detallesCorte.filter((p) => p.maquina?.toUpperCase() === 'SECCIONADORA').length;
    this.planchasPendientesEscuadradora = detallesCorte
      .filter((p) => p.maquina?.toUpperCase() === 'ESCUADRADORA')
      .reduce((t, p) => t + Number(p.cantidad || 0), 0);
    this.planchasPendientesSeccionadora = detallesCorte
      .filter((p) => p.maquina?.toUpperCase() === 'SECCIONADORA')
      .reduce((t, p) => t + Number(p.cantidad || 0), 0);

    this.totalDiana = this.pedidos.filter((p) => p.vendedora === 'DIANA').length;
    this.totalAnabel = this.pedidos.filter((p) => p.vendedora === 'ANABEL').length;
    this.totalIsamar = this.pedidos.filter((p) => p.vendedora === 'ISAMAR').length;

    this.pedidosDiana = this.pedidos.filter((p) => p.vendedora === 'DIANA' && p.estado !== 'ENTREGADO').length;
    this.pedidosAnabel = this.pedidos.filter((p) => p.vendedora === 'ANABEL' && p.estado !== 'ENTREGADO').length;
    this.pedidosIsamar = this.pedidos.filter((p) => p.vendedora === 'ISAMAR' && p.estado !== 'ENTREGADO').length;
    this.pedidosMelissa = this.pedidos.filter((p) => p.vendedora === 'MELISSA' && p.estado !== 'ENTREGADO').length;

    this.totalPedidosProduccion = this.pedidos.filter((p) => p.estado !== 'ENTREGADO').length;
    this.porcentajeCorte = this.totalPedidos ? Math.round((this.totalCorte / this.totalPedidos) * 100) : 0;
    this.porcentajeCanteado = this.totalPedidos ? Math.round((this.totalCanteado / this.totalPedidos) * 100) : 0;
    this.porcentajeDespacho = this.totalPedidos ? Math.round((this.totalDespacho / this.totalPedidos) * 100) : 0;
    this.porcentajeEntregados = this.totalPedidos ? Math.round((this.totalEntregados / this.totalPedidos) * 100) : 0;
    this.totalVendedoras = this.pedidos.length || 1;
  }

  esPedidoVencido(row: PedidoVistaDetalle): boolean {
    if (!row.fechaEntrega || row.estado === 'ENTREGADO') {
      return false;
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const entrega = new Date(`${row.fechaEntrega}T00:00:00`);
    return Number.isFinite(entrega.getTime()) && entrega < hoy;
  }

  private calcularPromedioDiasEntrega(): number {
    const duraciones = this.pedidos
      .filter((p) => p.fechaIngreso && p.fechaEntrega)
      .map((p) => {
        const ingreso = new Date(`${p.fechaIngreso}T00:00:00`).getTime();
        const entrega = new Date(`${p.fechaEntrega}T00:00:00`).getTime();
        return Number.isFinite(ingreso) && Number.isFinite(entrega)
          ? Math.max(Math.round((entrega - ingreso) / 86400000), 0)
          : null;
      })
      .filter((n): n is number => n !== null);
    return duraciones.length
      ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length)
      : 0;
  }

  soloNumerosClienteDocumento() {

    this.nuevoCliente.numeroDocumento = String(
      this.nuevoCliente.numeroDocumento || ''
    )
    .replace(/\D/g, '')
    .slice(0, 11);

  }

  soloNumerosClienteTelefono() {

    this.nuevoCliente.telefono = String(
      this.nuevoCliente.telefono || ''
    )
    .replace(/\D/g, '')
    .slice(0, 9);

  }

  normalizarEntero(valor: any, minimo: number = 0): number {

    let numero = parseInt(
      String(valor).replace(/[^0-9]/g, ''),
      10
    );

    if (isNaN(numero)) {
      numero = minimo;
    }

    if (numero < minimo) {
      numero = minimo;
    }

    return numero;
  }

  normalizarDetalle(d: any) {

    d.material = this.normalizarMayusculas(d.material);

    d.cantidad = this.normalizarEntero(d.cantidad, 1);

    d.cortes = this.normalizarEntero(d.cortes, 0);

    d.ranuras = this.normalizarEntero(d.ranuras, 0);

    d.perforaciones = this.normalizarEntero(d.perforaciones, 0);

    d.cantoDelgado = this.normalizarEntero(d.cantoDelgado, 0);

    d.cantoGrueso = this.normalizarEntero(d.cantoGrueso, 0);

    d.cantoDelgado36mm = this.normalizarEntero(d.cantoDelgado36mm, 0);

    d.cantoGrueso36mm = this.normalizarEntero(d.cantoGrueso36mm, 0);

  }

  normalizarEspecial(e: any) {

    e.cantidad = this.normalizarEntero(e.cantidad, 1);
    e.descripcion = this.normalizarMayusculas(e.descripcion);

  }

  eliminarPedido(row: PedidoVistaDetalle | Pedido) {
    const pedido = 'pedidoOriginal' in row ? row.pedidoOriginal : row;
    this.abrirConfirmacion(
      'Eliminar pedido',
      `¿Seguro que deseas eliminar el pedido ${pedido.numeroOrden}? Esta acción no se puede deshacer.`,
      () => {
        if (!pedido.id) return;

        this.pedidoService.eliminar(pedido.id).subscribe({
          next: () => {
            this.pedidos = this.pedidos.filter((p) => p.id !== pedido.id);
            this.recalcularDashboard();
            this.rebuildVista();
            this.notify.success('Pedido eliminado correctamente');
          },
          error: (err: unknown) => {
            console.error(err);
            this.notify.error(this.mensajeHttp(err, 'No se pudo eliminar el pedido'));
            this.cdr.markForCheck();
          }
        });
      }
    );
  }

  cambiarEstadoDirecto(row: PedidoVistaDetalle, nuevoEstado: string): void {
    const pedido = row.pedidoOriginal;
    if (!pedido?.id) {
      return;
    }

    const estadoAnteriorFila = row.estado;
    const estadoNorm = nuevoEstado.toUpperCase();

    const revertir = (): void => {
      row.estado = estadoAnteriorFila;
      this.cdr.markForCheck();
    };

    if (estadoNorm === 'ENTREGADO' && this.obtenerSaldo(pedido) > 0) {
      this.notify.warning(
        'No puede pasar a ENTREGADO con saldo pendiente. Cancele la deuda o registre abonos antes.'
      );
      revertir();
      return;
    }

    const usuario = this.usuarioParaAuditoria();

    if (row.detalleId) {
      console.debug('[Pedidos] Actualizando estado de detalle', {
        pedidoId: pedido.id,
        detalleId: row.detalleId,
        estado: estadoNorm
      });
      this.pedidoService
        .actualizarEstadoDetalle(pedido.id, row.detalleId, estadoNorm, usuario)
        .subscribe({
          next: (pedidoActualizado) => {
            row.estado = estadoNorm;
            this.reemplazarPedidoEnMemoria(pedidoActualizado);
            this.notify.success('Estado actualizado correctamente');
          },
          error: (err: unknown) => {
            console.error(err);
            this.notify.error(this.mensajeHttp(err, 'No se pudo actualizar el estado del material'));
            revertir();
          }
        });
      return;
    }

    const actualizado: Pedido = JSON.parse(JSON.stringify(pedido));
    actualizado.estado = estadoNorm;
    console.debug('[Pedidos] Actualizando estado de pedido sin detalles', {
      pedidoId: pedido.id,
      estado: estadoNorm
    });
    this.pedidoService.actualizar(pedido.id, actualizado, usuario).subscribe({
      next: (pedidoActualizado) => {
        this.reemplazarPedidoEnMemoria(pedidoActualizado);
        this.notify.success('Estado actualizado correctamente');
      },
      error: (err: unknown) => {
        console.error(err);
        this.notify.error(this.mensajeHttp(err, 'No se pudo actualizar el estado'));
        revertir();
      }
    });
  }

  private reemplazarPedidoEnMemoria(pedidoActualizado: Pedido): void {
    this.pedidos = this.ordenarPedidosProduccion(
      this.pedidos.map((p) => (p.id === pedidoActualizado.id ? pedidoActualizado : p))
    );
    this.recalcularDashboard();
    this.rebuildVista();
    this.cdr.markForCheck();
  }

  moverArriba(index: number) {
    const lista = this.pedidosVistaRows;

    if (index <= 0) return;

    const actual = lista[index];
    const anterior = lista[index - 1];

    const prioridadActual = actual.prioridad ?? index + 1;
    const prioridadAnterior = anterior.prioridad ?? index;

    actual.prioridad = prioridadAnterior;
    anterior.prioridad = prioridadActual;

    if (actual.id && anterior.id) {
      this.pedidoService.actualizar(actual.id, actual, this.usuarioParaAuditoria()).subscribe(() => {
        this.pedidoService.actualizar(anterior.id!, anterior, this.usuarioParaAuditoria()).subscribe(() => {
          this.cargarPedidos();
        });
      });
    }
  }

  moverAbajo(index: number) {
    const lista = this.pedidosVistaRows;

    if (index >= lista.length - 1) return;

    const actual = lista[index];
    const siguiente = lista[index + 1];

    const prioridadActual = actual.prioridad ?? index + 1;
    const prioridadSiguiente = siguiente.prioridad ?? index + 2;

    actual.prioridad = prioridadSiguiente;
    siguiente.prioridad = prioridadActual;

    if (actual.id && siguiente.id) {
      this.pedidoService.actualizar(actual.id, actual, this.usuarioParaAuditoria()).subscribe(() => {
        this.pedidoService.actualizar(siguiente.id!, siguiente, this.usuarioParaAuditoria()).subscribe(() => {
          this.cargarPedidos();
        });
      });
    }
  }

  pedidoArrastradoIndex: number | null = null;

  iniciarArrastre(index: number) {
    this.pedidoArrastradoIndex = index;
  }

  soltarPedido(indexDestino: number) {
    if (this.pedidoArrastradoIndex === null) return;

    const lista = [...this.pedidosVistaRows];
    const [pedidoMovido] = lista.splice(this.pedidoArrastradoIndex, 1);
    lista.splice(indexDestino, 0, pedidoMovido);

    lista.forEach((pedido, index) => {
      pedido.prioridad = index + 1;

      if (pedido.id) {
        this.pedidoService.actualizar(
          pedido.id,
          pedido,
          this.usuarioParaAuditoria()
        ).subscribe();
      }
    });

    this.pedidoArrastradoIndex = null;

    setTimeout(() => {
      this.cargarPedidos();
    }, 300);
  }

  abrirConfirmacion(titulo: string, mensaje: string, accion: () => void) {
    this.tituloConfirmacion = titulo;
    this.mensajeConfirmacion = mensaje;
    this.accionConfirmacion = accion;
    this.mostrarConfirmacion = true;
  }

  cerrarConfirmacion() {
    this.mostrarConfirmacion = false;
    this.accionConfirmacion = null;
  }

  confirmarAccion() {
    if (this.accionConfirmacion) {
      this.accionConfirmacion();
    }
    this.cerrarConfirmacion();
  }

  permitirSoltar(event: DragEvent) {
    event.preventDefault();
  }

  verAuditoria(row: PedidoVistaDetalle) {
    const pedido = row.pedidoOriginal;
    if (!pedido.id) return;

    this.pedidoAuditoria = pedido;

    this.pedidoService.listarAuditoria(pedido.id).subscribe(data => {
      this.auditoriaSeleccionada = data;
      this.mostrarAuditoria = true;
      this.cdr.markForCheck();
    });
  }

  cerrarAuditoria() {
    this.mostrarAuditoria = false;
    this.auditoriaSeleccionada = [];
    this.pedidoAuditoria = null;
  }

  guardarInline(pedido: any) {
    if (!pedido.id) return;

    this.pedidoService.actualizar(
      pedido.id,
      pedido,
      this.usuarioParaAuditoria()
    ).subscribe({
      next: () => {
        this.notify.success('Pedido actualizado correctamente');
      },
      error: (err: any) => {
        console.error('Error al actualizar inline', err);
      }
    });
  }

  cambiarVendedora(row: PedidoVistaDetalle, nueva: string) {
    const pedido = row.pedidoOriginal;
    row.vendedora = nueva;
    const actualizado = JSON.parse(JSON.stringify(pedido)) as Pedido;
    actualizado.vendedora = nueva;

    this.pedidoService.actualizar(
      pedido.id!,
      actualizado,
      this.usuarioParaAuditoria()
    ).subscribe({
      next: () => {
        this.notify.success('Vendedora actualizada correctamente');
      },
      error: (err: any) => {
        console.error(err);
      }
    });

  }


  obtenerSaldo(pedido: Pedido): number {
    return Math.max(Number(pedido.total || 0) - Number(pedido.adelanto || 0), 0);
  }

  estadoPago(pedido: any): string {
    return this.obtenerSaldo(pedido) > 0 ? `DEBE S/ ${this.obtenerSaldo(pedido).toFixed(2)}` : 'CANCELADO';
  }

  filtrarClientes() {

    const texto = this.filtroClienteTexto.toLowerCase();

    this.clientesFiltrados = this.clientes.filter(c =>

      c.nombre?.toLowerCase().includes(texto) ||

      c.documento?.toLowerCase().includes(texto) ||

      c.telefono?.toLowerCase().includes(texto)

    );

    this.cdr.markForCheck();
  }

  cerrarSesion() {
    this.auth.logout();
    void this.router.navigate(['/']);
  }
}