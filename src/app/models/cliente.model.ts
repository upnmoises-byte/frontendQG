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