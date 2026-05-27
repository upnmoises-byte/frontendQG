import { Injectable } from '@angular/core';

import { ALL_NAV_IDS, APP_ROLES, NavId } from '../config/nav-permissions';

const STORAGE_KEY = 'qg_nav_permissions_matrix';

/** Vistas nuevas: se añaden a permisos ya guardados si el rol las lleva por defecto (migración suave). */
const NAV_IDS_AÑADIR_SI_FALTAN: NavId[] = ['REPORTES', 'CATALOGOS'];

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {

  /** Matriz por defecto según reglas de negocio (editable desde Roles y permisos). */
  defaultNavForRole(rol: string): NavId[] {
    const r = (rol || '').toUpperCase();
    const all = [...ALL_NAV_IDS];
    const sin = (...n: NavId[]) => all.filter((x) => !n.includes(x));

    if (r === 'ADMIN') {
      return [...all];
    }

    if (r === 'PRODUCCION') {
      return sin('CONFIGURACION', 'ROLES_PERMISOS');
    }

    if (r === 'CAJA') {
      return sin('CONFIGURACION', 'ROLES_PERMISOS', 'CATALOGOS');
    }

    if (
      r === 'VENTAS_1' ||
      r === 'VENTAS_2' ||
      r === 'VENTAS_3' ||
      r === 'VENTAS_4' ||
      r === 'VENDEDORA'
    ) {
      return sin('CONFIGURACION', 'ROLES_PERMISOS', 'PAGOS');
    }

    return sin('CONFIGURACION', 'ROLES_PERMISOS', 'PAGOS');
  }

  /** Matriz completa: rol → vistas permitidas (incluye roles legacy). */
  buildAllDefaults(): Record<string, NavId[]> {
    const out: Record<string, NavId[]> = {};
    for (const rol of APP_ROLES) {
      out[rol] = this.defaultNavForRole(rol);
    }
    return out;
  }

  getFullMatrix(): Record<string, NavId[]> {
    const raw = localStorage.getItem(STORAGE_KEY);
    let stored: Record<string, NavId[]> | null = null;
    if (raw) {
      try {
        stored = JSON.parse(raw) as Record<string, NavId[]>;
      } catch {
        stored = null;
      }
    }
    return this.mergeStoredMatrix(stored);
  }

  /**
   * Combina valores guardados con roles por defecto y roles adicionales del catálogo.
   */
  private mergeStoredMatrix(stored: Record<string, NavId[]> | null): Record<string, NavId[]> {
    const defaults = this.buildAllDefaults();
    const out: Record<string, NavId[]> = { ...defaults };
    const roleKeys = new Set<string>(Object.keys(defaults).map((k) => k.toUpperCase()));
    if (stored) {
      for (const k of Object.keys(stored)) {
        roleKeys.add(k.toUpperCase());
      }
    }
    for (const rol of roleKeys) {
      const key = rol.toUpperCase();
      const list = stored?.[key] ?? stored?.[rol];
      if (list && Array.isArray(list) && list.length > 0) {
        const def = this.defaultNavForRole(key);
        const raw = [...(list as string[])];
        for (const nav of NAV_IDS_AÑADIR_SI_FALTAN) {
          if (def.includes(nav) && !raw.includes(nav)) {
            raw.push(nav);
          }
        }
        out[key] = this.sanitizeNavList(raw);
      } else if (!defaults[key]) {
        out[key] = this.defaultNavForRole(key);
      }
    }
    return out;
  }

  /** Roles únicos para la UI (built-in + catálogo API), ordenados. */
  matrixRolesUnion(catalogRoles: string[]): string[] {
    const s = new Set<string>(APP_ROLES.map((r) => r.toUpperCase()));
    for (const r of catalogRoles || []) {
      if (r) {
        s.add(r.toUpperCase());
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }

  private sanitizeNavList(list: string[]): NavId[] {
    const set = new Set<NavId>();
    for (const x of list) {
      if (ALL_NAV_IDS.includes(x as NavId)) {
        set.add(x as NavId);
      }
    }
    return ALL_NAV_IDS.filter((n) => set.has(n));
  }

  saveFullMatrix(matrix: Record<string, NavId[]>): void {
    const clean: Record<string, NavId[]> = {};
    for (const rol of Object.keys(matrix)) {
      const key = rol.toUpperCase();
      let list = this.sanitizeNavList(matrix[key] ?? []);
      if (list.length === 0) {
        list = this.defaultNavForRole(key);
      }
      clean[key] = list;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  }

  clearStoredMatrix(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  canAccessNav(rol: string | undefined | null, nav: NavId): boolean {
    if (!rol) {
      return false;
    }
    const key = rol.toUpperCase();
    const matrix = this.getFullMatrix();
    const allowed = matrix[key] ?? this.defaultNavForRole(key);
    return allowed.includes(nav);
  }

  /** Primera vista permitida (fallback de sesión). */
  firstAllowedNav(rol: string | undefined | null): NavId {
    if (!rol) {
      return 'DASHBOARD';
    }
    const key = rol.toUpperCase();
    const matrix = this.getFullMatrix();
    const allowed = matrix[key] ?? this.defaultNavForRole(key);
    if (!allowed.length) {
      return 'DASHBOARD';
    }
    return allowed[0];
  }
}
