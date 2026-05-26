export interface Cliente {
  id?: number;
  nombre: string;
  documento?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  tipoCliente?: string;
  activo?: boolean;
}

export interface Pedido {
  id?: number;

  cliente: Cliente | null;

  numeroOrden: string;
  cantidad?: number;
  colorPrincipal?: string;
  colorSecundario?: string;
  colorTercero?: string;

  cortes?: number;
  ranuras?: number;
  perforaciones?: number;

  maquina?: string;
  estado: string;
  vendedora: string;

  observaciones?: string;

  cantoDelgado?: number;
  cantoGrueso?: number;
  cantoDelgado36mm?: number;
  cantoGrueso36mm?: number;
  cantidadEspeciales?: number;

  fechaIngreso?: string;
  horaIngreso?: string;
  fechaEntrega?: string;
  horaEntrega?: string;
  fechaModificacion?: string;
  horaModificacion?: string;
  usuarioModificacion?: string;

  prioridad?: number;
  total?: number;
  adelanto?: number;
  detalles?: PedidoDetalle[];
}

export interface PedidoDetalleEspecial {
  id?: number;
  cantidad: number;
  descripcion: string;
}

export interface PedidoDetalle {
  id?: number;
  cantidad: number;
  material: string;
  maquina: string;
  /** Estado de producción de este material (independiente por línea). */
  estado?: string;
  cortes: number;
  ranuras: number;
  perforaciones: number;
  cantoDelgado: number;
  cantoGrueso: number;
  cantoDelgado36mm: number;
  cantoGrueso36mm: number;
  observaciones?: string;
  especiales: PedidoDetalleEspecial[];
}

/**
 * Una fila de tabla = un material (detalle) o el pedido completo si no tiene detalles.
 * Prioriza detalle.estado sobre pedido.estado.
 */
export interface PedidoVistaDetalle {
  pedidoId: number;
  detalleId?: number;
  numeroOrden: string;
  cliente: string;
  cantidad: number;
  color: string;
  cortes: number;
  ranuras: number;
  perforaciones: number;
  maquina: string;
  observaciones: string;
  estado: string;
  pedidoOriginal: Pedido;
  detalleOriginal?: PedidoDetalle;

  /** Compatibilidad con plantilla y acciones existentes */
  id: number;
  _pedido: Pedido;
  prioridad?: number;
  vendedora: string;
  fechaIngreso?: string;
  horaIngreso?: string;
  fechaEntrega?: string;
  horaEntrega?: string;
  colorPrincipal: string;
  colorSecundario?: string;
  colorTercero?: string;
  totalPedido?: number;
  totalPagado?: number;
  cantoDelgado?: number;
  cantoGrueso?: number;
  cantoDelgado36mm?: number;
  cantoGrueso36mm?: number;
  cantidadEspeciales?: number;
  descripcionEspeciales?: string;
  saldoPendiente?: number;
  /** true = fila resumen del pedido (vista Pagos) */
  esFilaPedidoCompleto?: boolean;
}