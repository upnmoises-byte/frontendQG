import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { LoginResponse, UsuarioSesion } from '../models/auth.model';
import { PermissionsService } from './permissions.service';

const STORAGE_USER = 'usuario';
const STORAGE_TOKEN = 'token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly perms = inject(PermissionsService);

  readonly usuario = signal<UsuarioSesion | null>(this.readUsuario());

  constructor(private http: HttpClient) {
    const u = this.usuario();
    if (u?.permisos?.length) {
      this.perms.setUserPermisos(u.permisos);
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(STORAGE_TOKEN) && !!localStorage.getItem(STORAGE_USER);
  }

  getToken(): string | null {
    return localStorage.getItem(STORAGE_TOKEN);
  }

  login(correo: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { correo, password }).pipe(
      tap((res) => {
        localStorage.setItem(STORAGE_TOKEN, res.token);
        localStorage.setItem(STORAGE_USER, JSON.stringify(res.usuario));
        this.usuario.set(res.usuario);
        this.perms.setUserPermisos(res.usuario.permisos);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    this.usuario.set(null);
    this.perms.clearUserPermisos();
  }

  private readUsuario(): UsuarioSesion | null {
    const raw = localStorage.getItem(STORAGE_USER);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as UsuarioSesion;
    } catch {
      return null;
    }
  }

  hasRole(...roles: string[]): boolean {
    const r = (this.usuario()?.rol ?? '').toUpperCase();
    if (!r) {
      return false;
    }
    return roles.some((x) => x.toUpperCase() === r);
  }

  puede(codigo: string): boolean {
    return this.perms.puede(codigo);
  }

  canCreateOrder(): boolean {
    return this.puede('PEDIDOS_CREAR');
  }

  canEditOrder(): boolean {
    return this.puede('PEDIDOS_EDITAR');
  }

  canDeleteOrder(): boolean {
    return this.puede('PEDIDOS_ELIMINAR');
  }

  canChangeEstado(): boolean {
    return this.puede('PEDIDOS_CAMBIAR_ESTADO');
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  canRegistrarPago(): boolean {
    return this.puede('PAGOS_REGISTRAR');
  }

  canEliminarCliente(): boolean {
    return this.puede('CLIENTES_ELIMINAR');
  }

  canEditarCliente(): boolean {
    return this.puede('CLIENTES_EDITAR');
  }

  canCrearCliente(): boolean {
    return this.puede('CLIENTES_CREAR');
  }

  canVerRegistros(): boolean {
    return this.puede('REGISTROS_VER');
  }

  canAdministrarRoles(): boolean {
    return this.puede('ROLES_VER');
  }

  sessionUsuario(): UsuarioSesion | null {
    return this.usuario();
  }
}
