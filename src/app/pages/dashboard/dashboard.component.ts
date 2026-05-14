import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PedidoService, RegistrarPagoPayload } from '../../services/pedido.service';
import { Pedido } from '../../models/pedido.model';
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
    'colores', 'cortes', 'ranuras', 'observaciones', 'maquina',
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

  /** Filas ya aplanadas para la tabla (evita getters pesados en plantilla). */
  pedidosVistaRows: any[] = [];
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
  pedidosRocio = 0;
  pedidosKarina = 0;
  pedidosLucia = 0;
  totalPedidosProduccion = 0;
  porcentajeCorte = 0;
  porcentajeCanteado = 0;
  porcentajeDespacho = 0;
  porcentajeEntregados = 0;
  totalVendedoras = 0;
  totalEspeciales = 0;

  filtroCliente = '';
  filtroVendedora = '';
  filtroEstado = '';
  filtroMaquina = '';

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
  formPago: RegistrarPagoPayload = { monto: 0, metodoPago: 'BCP', nota: '' };

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
    private reporte: ReporteService
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
    const map: Record<string, string> = {
      VENTAS_1: 'ISAMAR',
      VENTAS_2: 'ANABEL',
      VENTAS_3: 'DIANA',
      VENTAS_4: 'MELISSA'
    };
    return map[r] ?? null;
  }

  opcionesVendedoraSelect(): { value: string; label: string }[] {
    const todas = [
      { value: 'DIANA', label: 'DIANA' },
      { value: 'ANABEL', label: 'ANABEL' },
      { value: 'ISAMAR', label: 'ISAMAR' },
      { value: 'MELISSA', label: 'MELISSA' },
      { value: 'ROCIO', label: 'ROCIO' },
      { value: 'KARINA', label: 'KARINA' },
      { value: 'LUCIA', label: 'LUCIA' }
    ];
    const fija = this.vendedoraAsignadaPorRol();
    if (fija) {
      return todas.filter((o) => o.value === fija);
    }
    return todas;
  }

  private aplicarFiltroRolPedidos(lista: Pedido[]): Pedido[] {
    const v = this.vendedoraAsignadaPorRol();
    if (!v) {
      return lista;
    }
    return lista.filter((p) => p.vendedora === v);
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
    if (this.filtroRepEstado && p.estado !== this.filtroRepEstado) {
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
      const ordenados = [...this.pedidos].sort(
        (a, b) => (a.prioridad ?? 0) - (b.prioridad ?? 0)
      );
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

    const ordenados = [...this.pedidos].sort(
      (a, b) => (a.prioridad ?? 0) - (b.prioridad ?? 0)
    );

    const filtrados = ordenados.filter((p) => {
      const nombreCliente = p.cliente?.nombre?.toLowerCase() ?? '';
      const coincideCliente =
        !this.filtroCliente || nombreCliente.includes(this.filtroCliente.toLowerCase());
      const coincideVendedora = !this.filtroVendedora || p.vendedora === this.filtroVendedora;
      const coincideEstado = !this.filtroEstado || p.estado === this.filtroEstado;
      const coincideMaquina =
        !this.filtroMaquina ||
        p.maquina === this.filtroMaquina ||
        (p.detalles || []).some((d) => d.maquina === this.filtroMaquina);
      if (!(coincideCliente && coincideVendedora && coincideEstado && coincideMaquina)) {
        return false;
      }
      if (this.vistaActual === 'PAGOS') {
        return this.coincideFiltrosPagos(p);
      }
      return true;
    });

    if (this.vistaActual === 'PAGOS') {
      this.pedidosVistaRows = filtrados.map((p) => this.filaUnicaPorPedido(p));
    } else if (this.vistaActual === 'CORTE') {
      this.pedidosVistaRows = this.pedidoARenglones(filtrados.filter((p) => p.estado === 'CORTE')).filter(
        (p) => p.maquina?.toUpperCase() === this.subVistaCorte
      );
    } else if (this.vistaActual === 'CANTEADO') {
      this.pedidosVistaRows = this.pedidoARenglones(filtrados.filter((p) => p.estado === 'CANTEADO'));
    } else if (this.vistaActual === 'ESPECIALES') {
      this.pedidosVistaRows = this.pedidoARenglones(filtrados.filter((p) => p.estado === 'ESPECIALES'));
    } else if (this.vistaActual === 'DESPACHO') {
      this.pedidosVistaRows = this.pedidoARenglones(filtrados.filter((p) => p.estado === 'DESPACHO'));
    } else if (this.vistaActual === 'ENTREGADO') {
      this.pedidosVistaRows = this.pedidoARenglones(filtrados.filter((p) => p.estado === 'ENTREGADO'));
    } else {
      this.pedidosVistaRows = this.pedidoARenglones(filtrados);
    }

    this.cdr.markForCheck();
  }

  onFiltrosCambiaron(): void {
    this.rebuildVista();
  }

  trackByPedidoRow(_index: number, row: any): string {
    const id = row.id ?? 'sin-id';
    const det = row.detalleId ?? 'root';
    return `${id}-${det}`;
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

  pedidoARenglones(lista: Pedido[]): any[] {
      return lista.flatMap(p => {
        if (!p.detalles || p.detalles.length === 0) {
          return [{ ...p, _pedido: p }];
        }

        return p.detalles.map(d => {
          const especiales = d.especiales || [];
          return {
            ...p,
            _pedido: p,
            detalleId: d.id,
            cantidad: d.cantidad,
            colorPrincipal: d.material,
            maquina: d.maquina,
            cortes: d.cortes,
            ranuras: d.ranuras,
            perforaciones: d.perforaciones,
            cantoDelgado: d.cantoDelgado,
            cantoGrueso: d.cantoGrueso,
            cantoDelgado36mm: d.cantoDelgado36mm,
            cantoGrueso36mm: d.cantoGrueso36mm,
            cantidadEspeciales: especiales.reduce((t, e) => t + Number(e.cantidad || 0), 0),
            descripcionEspeciales: especiales.map(e => `${e.cantidad} ${e.descripcion}`).join(' / '),
            observaciones: d.observaciones || p.observaciones
          };
        });
      });
    }

  /** Una sola fila por pedido (totales de pago a nivel pedido, no por detalle). */
  filaUnicaPorPedido(p: Pedido): any {
    const saldo = Math.max(Number(p.total || 0) - Number(p.adelanto || 0), 0);
    const row: any = { ...p, _pedido: p, saldoPendiente: saldo };
    if (p.detalles?.length) {
      row.cantidad = p.detalles.reduce((s, d) => s + Number(d.cantidad || 0), 0);
      const d0 = p.detalles[0];
      row.colorPrincipal = d0.material || p.colorPrincipal || '-';
      if (p.detalles.length > 1) {
        row.colorSecundario = `+${p.detalles.length - 1} materiales`;
      }
      const sumCortes = p.detalles.reduce((s, d) => s + Number(d.cortes || 0), 0);
      const sumRanuras = p.detalles.reduce((s, d) => s + Number(d.ranuras || 0), 0);
      const sumPerf = p.detalles.reduce((s, d) => s + Number(d.perforaciones || 0), 0);
      row.cortes = sumCortes;
      row.ranuras = sumRanuras;
      row.perforaciones = sumPerf;
      row.cantidadEspeciales = p.detalles.reduce(
        (s, d) =>
          s +
          (d.especiales || []).reduce((t, e) => t + Number(e.cantidad || 0), 0),
        0
      );
    }
    return row;
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

  abrirModalRegistrarPago(row: any): void {
    const p = row._pedido || row;
    this.pedidoPagoSeleccion = p;
    this.formPago = { monto: 0, metodoPago: 'BCP', nota: '' };
    this.mostrarModalPago = true;
    this.cdr.markForCheck();
  }

  cerrarModalPago(): void {
    this.mostrarModalPago = false;
    this.pedidoPagoSeleccion = null;
  }

  guardarRegistroPago(): void {
    const ped = this.pedidoPagoSeleccion;
    if (!ped?.id) {
      return;
    }
    const m = Number(this.formPago.monto);
    if (!m || m <= 0) {
      this.notify.warning('Indique un monto mayor a 0');
      return;
    }
    const body: RegistrarPagoPayload = {
      monto: m,
      metodoPago: this.formPago.metodoPago,
      nota: this.formPago.nota?.trim() || undefined
    };
    this.pedidoService.registrarPagoPedido(ped.id, body).subscribe({
      next: () => {
        this.notify.success('Pago registrado correctamente.');
        this.cerrarModalPago();
        this.cargarPedidos();
      },
      error: (err: unknown) => {
        console.error(err);
        this.notify.error(this.mensajeHttp(err, 'No se pudo registrar el pago'));
      }
    });
  }

  abrirHistorialPagosPedido(row: any): void {
    const p = row._pedido || row;
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
    this.filtroPagoSaldo = '';
    this.filtroPagoFechaIngresoDesde = '';
    this.filtroPagoFechaIngresoHasta = '';
    this.rebuildVista();
  }

    abrirModal() {
      this.modoEdicion = false;
      this.mostrarModal = true;
      this.nuevoPedido = this.pedidoVacio();
    }

    editarPedido(pedido: Pedido) {
      this.abrirConfirmacion(
        'Editar pedido',
        `¿Seguro que deseas editar el pedido ${pedido.numeroOrden}?`,
        () => {
          const original = (pedido as any)._pedido || pedido;
          this.modoEdicion = true;
          this.mostrarModal = true;
          this.nuevoPedido = JSON.parse(JSON.stringify(original));
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
      this.mostrarModalCliente = true;
    }

    cerrarModalCliente() {
      this.mostrarModalCliente = false;
      this.modoEdicionCliente = false;
      this.clienteEditandoId = null;
    }

    guardarCliente() {
    if (!this.nuevoCliente.numeroDocumento) {
      this.notify.warning('Ingrese número de documento');
      return;
    }

    if (this.nuevoCliente.tipoDocumento === 'DNI' && this.nuevoCliente.numeroDocumento.length !== 8) {
      this.notify.warning('El DNI debe tener 8 dígitos');
      return;
    }

    if (this.nuevoCliente.tipoDocumento === 'RUC' && this.nuevoCliente.numeroDocumento.length !== 11) {
      this.notify.warning('El RUC debe tener 11 dígitos');
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
        this.notify.success(this.modoEdicionCliente ? 'Cliente actualizado.' : 'Cliente registrado.');
        this.cargarClientes();
        this.mostrarModalCliente = false;
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
  }

  guardarPedido() {
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
          data.map((p: any) => ({
            ...p,
            saldoPendiente: Number(p.total || 0) - Number(p.adelanto || 0)
          }))
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
    this.totalPedidos = this.pedidos.length;
    this.totalCorte = this.pedidos.filter((p) => p.estado === 'CORTE').length;
    this.totalCanteado = this.pedidos.filter((p) => p.estado === 'CANTEADO').length;
    this.totalDespacho = this.pedidos.filter((p) => p.estado === 'DESPACHO').length;
    this.totalEntregados = this.pedidos.filter((p) => p.estado === 'ENTREGADO').length;
    this.totalEspeciales = this.pedidos.filter((p) => p.estado === 'ESPECIALES').length;

    const detallesCorte = this.pedidoARenglones(this.pedidos.filter((p) => p.estado === 'CORTE'));
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
    this.pedidosMelissa = this.pedidos.filter(
      (p) => (p.vendedora === 'MELISSA' || p.vendedora === 'YSAMARA') && p.estado !== 'ENTREGADO'
    ).length;
    this.pedidosRocio = this.pedidos.filter((p) => p.vendedora === 'ROCIO' && p.estado !== 'ENTREGADO').length;
    this.pedidosKarina = this.pedidos.filter((p) => p.vendedora === 'KARINA' && p.estado !== 'ENTREGADO').length;
    this.pedidosLucia = this.pedidos.filter((p) => p.vendedora === 'LUCIA' && p.estado !== 'ENTREGADO').length;

    this.totalPedidosProduccion = this.pedidos.filter((p) => p.estado !== 'ENTREGADO').length;
    this.porcentajeCorte = this.totalPedidos ? Math.round((this.totalCorte / this.totalPedidos) * 100) : 0;
    this.porcentajeCanteado = this.totalPedidos ? Math.round((this.totalCanteado / this.totalPedidos) * 100) : 0;
    this.porcentajeDespacho = this.totalPedidos ? Math.round((this.totalDespacho / this.totalPedidos) * 100) : 0;
    this.porcentajeEntregados = this.totalPedidos ? Math.round((this.totalEntregados / this.totalPedidos) * 100) : 0;
    this.totalVendedoras = this.pedidos.length || 1;
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

  }

  eliminarPedido(pedido: any) {
    pedido = pedido._pedido || pedido;
    this.abrirConfirmacion(
      'Eliminar pedido',
      `¿Seguro que deseas eliminar el pedido ${pedido.numeroOrden}? Esta acción no se puede deshacer.`,
      () => {
        if (!pedido.id) return;

        this.pedidoService.eliminar(pedido.id).subscribe(() => {
          this.cargarPedidos();
        });
      }
    );
  }

  cambiarEstadoDirecto(row: any, nuevoEstado: string): void {
    const base = row._pedido || row;
    if (!base?.id) {
      return;
    }

    const revertir = (): void => {
      row.estado = base.estado;
      this.cdr.markForCheck();
    };

    if (nuevoEstado === 'DESPACHO' && this.obtenerSaldo(base) > 0) {
      this.notify.warning(
        'No puede pasar a DESPACHO con saldo pendiente. Cancele la deuda o registre abonos antes.'
      );
      revertir();
      return;
    }

    if (nuevoEstado === 'ENTREGADO' && this.obtenerSaldo(base) > 0) {
      this.notify.warning(
        'No se puede marcar como ENTREGADO: el pedido tiene saldo pendiente. Regularice el pago primero.'
      );
      revertir();
      return;
    }

    const actualizado: Pedido = {
      ...base,
      estado: nuevoEstado
    };

    this.pedidoService.actualizar(base.id, actualizado, this.usuarioParaAuditoria()).subscribe({
      next: () => this.cargarPedidos(),
      error: (err: unknown) => {
        console.error(err);
        this.notify.error(this.mensajeHttp(err, 'No se pudo actualizar el estado'));
        revertir();
      }
    });
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

  verAuditoria(pedido: Pedido) {
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
        console.log('Pedido actualizado');
      },
      error: (err: any) => {
        console.error('Error al actualizar inline', err);
      }
    });
  }

  cambiarVendedora(pedido: any, nueva: string) {

    pedido = pedido._pedido || pedido;
    pedido.vendedora = nueva;

    this.pedidoService.actualizar(
      pedido.id,
      pedido,
      this.usuarioParaAuditoria()
    ).subscribe({
      next: () => {
        console.log('Vendedora actualizada');
      },
      error: (err: any) => {
        console.error(err);
      }
    });

  }


  obtenerSaldo(pedido: any): number {
    const base = pedido?._pedido || pedido;
    return Math.max(Number(base.total || 0) - Number(base.adelanto || 0), 0);
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