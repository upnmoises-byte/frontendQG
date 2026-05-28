/** Identificadores de vistas del menú principal (coinciden con `vistaActual` del dashboard). */
export type NavId =
  | 'DASHBOARD'
  | 'PEDIDOS'
  | 'CLIENTES'
  | 'PAGOS'
  | 'CORTE'
  | 'CANTEADO'
  | 'ESPECIALES'
  | 'DESPACHO'
  | 'ENTREGADO'
  | 'REPORTES'
  | 'REGISTROS'
  | 'CONFIGURACION'
  | 'ROLES_PERMISOS';

export const ALL_NAV_IDS: NavId[] = [
  'DASHBOARD',
  'PEDIDOS',
  'CLIENTES',
  'PAGOS',
  'CORTE',
  'CANTEADO',
  'ESPECIALES',
  'DESPACHO',
  'ENTREGADO',
  'REPORTES',
  'REGISTROS',
  'CONFIGURACION',
  'ROLES_PERMISOS'
];

/** Roles vigentes (valor de `usuario.rol` en JWT / MySQL). */
export const APP_ROLES = [
  'ADMIN',
  'GERENCIA',
  'PRODUCCION',
  'CAJA',
  'VENDEDORA'
] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Roles obsoletos (migrados automáticamente a VENDEDORA). */
export const LEGACY_ROLES = ['VENTAS_1', 'VENTAS_2', 'VENTAS_3', 'VENTAS_4'] as const;

export function navLabel(nav: NavId): string {
  const m: Record<NavId, string> = {
    DASHBOARD: 'Dashboard',
    PEDIDOS: 'Pedidos generales',
    CLIENTES: 'Clientes',
    PAGOS: 'Pagos',
    CORTE: 'Zona corte',
    CANTEADO: 'Zona canto',
    ESPECIALES: 'Especiales',
    DESPACHO: 'Despacho',
    ENTREGADO: 'Entregados',
    REPORTES: 'Reportes',
    REGISTROS: 'Registros',
    CONFIGURACION: 'Configuración',
    ROLES_PERMISOS: 'Roles y permisos'
  };
  return m[nav];
}

export function roleLabel(rol: string): string {
  const m: Record<string, string> = {
    ADMIN: 'Administrador',
    GERENCIA: 'Gerencia',
    PRODUCCION: 'Producción',
    CAJA: 'Caja',
    VENDEDORA: 'Vendedora'
  };
  return m[rol] ?? rol;
}
