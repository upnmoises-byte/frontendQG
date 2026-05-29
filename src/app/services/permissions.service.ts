import { Injectable, signal } from '@angular/core';

import { ALL_NAV_IDS, APP_ROLES, LEGACY_ROLES, NavId } from '../config/nav-permissions';
import { NAV_PERMISSION } from '../config/permissions.config';

const STORAGE_PERMISOS = 'qg_user_permisos';

@Injectable({ providedIn: 'root' })
export class PermissionsService {

  private readonly userPermisos = signal<Set<string>>(this.readStoredPermisos());

  setUserPermisos(codigos: string[] | null | undefined): void {
    const set = new Set(
      (codigos ?? []).map((c) => (c || '').trim().toUpperCase()).filter(Boolean)
    );
    this.userPermisos.set(set);
    localStorage.setItem(STORAGE_PERMISOS, JSON.stringify([...set]));
  }

  clearUserPermisos(): void {
    this.userPermisos.set(new Set());
    localStorage.removeItem(STORAGE_PERMISOS);
  }

  puede(codigo: string): boolean {
    const key = (codigo || '').trim().toUpperCase();
    if (!key) {
      return false;
    }
    return this.userPermisos().has(key);
  }

  puedeAlguno(...codigos: string[]): boolean {
    return codigos.some((c) => this.puede(c));
  }

  canAccessNav(_rol: string | undefined | null, nav: NavId): boolean {
    const perm = NAV_PERMISSION[nav];
    if (perm && this.puede(perm)) {
      return true;
    }
    if (this.userPermisos().size === 0 && _rol) {
      return this.defaultNavForRole(_rol).includes(nav);
    }
    return false;
  }

  firstAllowedNav(rol: string | undefined | null): NavId {
    for (const nav of ALL_NAV_IDS) {
      if (this.canAccessNav(rol, nav)) {
        return nav;
      }
    }
    return 'DASHBOARD';
  }

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

  private normalizeLegacyRole(rol: string): string {
    const r = (rol || '').toUpperCase();
    if ((LEGACY_ROLES as readonly string[]).includes(r)) {
      return 'VENDEDORA';
    }
    return r;
  }

  private readStoredPermisos(): Set<string> {
    const raw = localStorage.getItem(STORAGE_PERMISOS);
    if (!raw) {
      return new Set();
    }
    try {
      const list = JSON.parse(raw) as string[];
      return new Set(list.map((c) => c.toUpperCase()));
    } catch {
      return new Set();
    }
  }
}
