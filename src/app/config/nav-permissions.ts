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
  'CONFIGURACION',
  'ROLES_PERMISOS'
];

/** Roles de aplicación (valor de `usuario.rol` en JWT / MySQL). */
export const APP_ROLES = [
  'ADMIN',
  'PRODUCCION',
  'CAJA',
  'VENTAS_1',
  'VENTAS_2',
  'VENTAS_3',
  'VENTAS_4',
  'VENDEDORA'
] as const;

export type AppRole = (typeof APP_ROLES)[number];

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
    CONFIGURACION: 'Configuración',
    ROLES_PERMISOS: 'Roles y permisos'
  };
  return m[nav];
}

export function roleLabel(rol: string): string {
  const m: Record<string, string> = {
    ADMIN: 'Administrador',
    PRODUCCION: 'Producción',
    CAJA: 'Caja',
    VENTAS_1: 'Ventas 1 (Isamar)',
    VENTAS_2: 'Ventas 2 (Anabel)',
    VENTAS_3: 'Ventas 3 (Diana)',
    VENTAS_4: 'Ventas 4 (Melissa)',
    VENDEDORA: 'Vendedora (legacy)'
  };
  return m[rol] ?? rol;
}
