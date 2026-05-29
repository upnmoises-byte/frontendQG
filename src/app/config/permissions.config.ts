import { NavId } from './nav-permissions';

/** Permiso mínimo para ver cada vista del menú. */
export const NAV_PERMISSION: Record<NavId, string> = {
  DASHBOARD: 'DASHBOARD_VER',
  PEDIDOS: 'PEDIDOS_VER',
  CLIENTES: 'CLIENTES_VER',
  PAGOS: 'PAGOS_VER',
  CORTE: 'CORTE_VER',
  CANTEADO: 'CANTO_VER',
  ESPECIALES: 'ESPECIALES_VER',
  DESPACHO: 'DESPACHO_VER',
  ENTREGADO: 'ENTREGADOS_VER',
  REPORTES: 'REPORTES_VER',
  REGISTROS: 'REGISTROS_VER',
  CONFIGURACION: 'CONFIG_VER',
  ROLES_PERMISOS: 'ROLES_VER'
};

export interface PermisoDef {
  codigo: string;
  modulo: string;
  descripcion: string;
}

export const PERMISO_MODULOS_ORDEN = [
  'Dashboard',
  'Pedidos',
  'Clientes',
  'Pagos',
  'Producción',
  'Registros',
  'Reportes',
  'Configuración',
  'Roles'
] as const;
