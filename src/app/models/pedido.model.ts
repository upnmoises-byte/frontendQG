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