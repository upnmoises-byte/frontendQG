import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { LoginResponse, UsuarioSesion } from '../models/auth.model';

const STORAGE_USER = 'usuario';
const STORAGE_TOKEN = 'token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly apiUrl = `${environment.apiUrl}/api/auth`;

  /** Sesión actual (persistida en localStorage). */
  readonly usuario = signal<UsuarioSesion | null>(this.readUsuario());

  constructor(private http: HttpClient) {}

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
      })
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    this.usuario.set(null);
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

  canCreateOrder(): boolean {
    const r = (this.usuario()?.rol ?? '').toUpperCase();
    return [
      'ADMIN',
      'PRODUCCION',
      'CAJA',
      'VENTAS_1',
      'VENTAS_2',
      'VENTAS_3',
      'VENTAS_4',
      'VENDEDORA'
    ].includes(r);
  }

  canEditOrder(): boolean {
    return this.hasRole('ADMIN');
  }

  canDeleteOrder(): boolean {
    return this.hasRole('ADMIN');
  }

  canChangeEstado(): boolean {
    return this.hasRole('ADMIN', 'PRODUCCION');
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  canRegistrarPago(): boolean {
    return this.hasRole('ADMIN', 'PRODUCCION', 'CAJA');
  }

  sessionUsuario(): UsuarioSesion | null {
    return this.usuario();
  }
}
