import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
}

export interface UsuarioCreatePayload {
  nombre: string;
  correo: string;
  rol: string;
  password?: string;
  activo?: boolean;
}

export interface UsuarioUpdatePayload {
  nombre?: string;
  correo?: string;
  rol?: string;
  password?: string;
  activo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private readonly API = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  listarUsuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${this.API}/usuarios`);
  }

  crearUsuario(body: UsuarioCreatePayload): Observable<UsuarioAdmin> {
    return this.http.post<UsuarioAdmin>(`${this.API}/usuarios`, body);
  }

  actualizarUsuario(id: number, body: UsuarioUpdatePayload): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(`${this.API}/usuarios/${id}`, body);
  }

  listarRolesCatalogo(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API}/roles-catalogo`);
  }

  crearRolCatalogo(nombre: string): Observable<{ nombre: string }> {
    return this.http.post<{ nombre: string }>(`${this.API}/roles-catalogo`, { nombre });
  }

  eliminarRolCatalogo(nombre: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/roles-catalogo/${encodeURIComponent(nombre)}`);
  }

  actualizarRolUsuario(id: number, rol: string): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(`${environment.apiUrl}/usuarios/${id}/rol`, { rol });
  }
}
