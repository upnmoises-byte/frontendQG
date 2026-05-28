import { Injectable } from '@angular/core';

import { ALL_NAV_IDS, APP_ROLES, LEGACY_ROLES, NavId } from '../config/nav-permissions';

const STORAGE_KEY = 'qg_nav_permissions_matrix';

/** Vistas nuevas: se añaden a permisos ya guardados si el rol las lleva por defecto. */
const NAV_IDS_AÑADIR_SI_FALTAN: NavId[] = ['REPORTES', 'REGISTROS'];

/** Migración de id de menú antiguo. */
const LEGACY_NAV_MAP: Record<string, NavId> = {
  CATALOGOS: 'REGISTROS'
};

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {

  defaultNavForRole(rol: string): NavId[] {
    const r = this.normalizeLegacyRole(rol);
    const all = [...ALL_NAV_IDS];
    const sin = (...n: NavId[]) => all.filter((x) => !n.includes(x));

    if (r === 'ADMIN') {
      return [...all];
    }

    if (r === 'GERENCIA') {
      return sin('CONFIGURACION', 'ROLES_PERMISOS');
    }

    if (r === 'PRODUCCION') {
      return sin('CONFIGURACION', 'ROLES_PERMISOS');
    }

    if (r === 'CAJA') {
      return sin('CONFIGURACION', 'ROLES_PERMISOS', 'REGISTROS');
    }

    if (r === 'VENDEDORA') {
      return sin('CONFIGURACION', 'ROLES_PERMISOS', 'PAGOS', 'REGISTROS');
    }

    return sin('CONFIGURACION', 'ROLES_PERMISOS', 'PAGOS');
  }

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

  private mergeStoredMatrix(stored: Record<string, NavId[]> | null): Record<string, NavId[]> {
    const defaults = this.buildAllDefaults();
    const out: Record<string, NavId[]> = { ...defaults };

    const migrado: Record<string, NavId[]> = {};
    if (stored) {
      for (const [k, list] of Object.entries(stored)) {
        const key = this.normalizeLegacyRole(k);
        const navs = this.migrateNavList(list);
        if (!migrado[key]) {
          migrado[key] = [];
        }
        for (const n of navs) {
          if (!migrado[key].includes(n)) {
            migrado[key].push(n);
          }
        }
      }
      for (const legacy of LEGACY_ROLES) {
        const legacyNavs = stored[legacy];
        if (legacyNavs?.length) {
          const target = migrado['VENDEDORA'] ?? [];
          migrado['VENDEDORA'] = this.sanitizeNavList([
            ...target,
            ...this.migrateNavList(legacyNavs)
          ]);
        }
      }
    }

    const roleKeys = new Set<string>([
      ...Object.keys(defaults).map((k) => k.toUpperCase()),
      ...Object.keys(migrado).map((k) => k.toUpperCase())
    ]);

    for (const rol of roleKeys) {
      const key = rol.toUpperCase();
      if (LEGACY_ROLES.includes(key as (typeof LEGACY_ROLES)[number])) {
        continue;
      }
      const list = migrado[key];
      if (list && list.length > 0) {
        const def = this.defaultNavForRole(key);
        const raw = [...list];
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

  matrixRolesUnion(catalogRoles: string[]): string[] {
    const s = new Set<string>(APP_ROLES.map((r) => r.toUpperCase()));
    for (const r of catalogRoles || []) {
      const key = this.normalizeLegacyRole(r);
      if (key && !LEGACY_ROLES.includes(key as (typeof LEGACY_ROLES)[number])) {
        s.add(key);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }

  private migrateNavList(list: string[]): NavId[] {
    const mapped = list.map((x) => LEGACY_NAV_MAP[x] ?? x);
    return this.sanitizeNavList(mapped);
  }

  private normalizeLegacyRole(rol: string): string {
    const r = (rol || '').toUpperCase();
    if (LEGACY_ROLES.includes(r as (typeof LEGACY_ROLES)[number])) {
      return 'VENDEDORA';
    }
    return r;
  }

  private sanitizeNavList(list: string[]): NavId[] {
    const set = new Set<NavId>();
    for (const x of list) {
      const mapped = LEGACY_NAV_MAP[x] ?? x;
      if (ALL_NAV_IDS.includes(mapped as NavId)) {
        set.add(mapped as NavId);
      }
    }
    return ALL_NAV_IDS.filter((n) => set.has(n));
  }

  saveFullMatrix(matrix: Record<string, NavId[]>): void {
    const clean: Record<string, NavId[]> = {};
    for (const rol of Object.keys(matrix)) {
      const key = this.normalizeLegacyRole(rol);
      if (LEGACY_ROLES.includes(key as (typeof LEGACY_ROLES)[number])) {
        continue;
      }
      let list = this.sanitizeNavList(matrix[rol] ?? matrix[key] ?? []);
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
    const key = this.normalizeLegacyRole(rol);
    const matrix = this.getFullMatrix();
    const allowed = matrix[key] ?? this.defaultNavForRole(key);
    return allowed.includes(nav);
  }

  firstAllowedNav(rol: string | undefined | null): NavId {
    if (!rol) {
      return 'DASHBOARD';
    }
    const key = this.normalizeLegacyRole(rol);
    const matrix = this.getFullMatrix();
    const allowed = matrix[key] ?? this.defaultNavForRole(key);
    if (!allowed.length) {
      return 'DASHBOARD';
    }
    return allowed[0];
  }
}
