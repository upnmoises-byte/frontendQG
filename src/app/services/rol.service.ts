import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { PermisoDef } from '../config/permissions.config';

export interface RolDto {
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  usuariosCount: number;
}

export interface RolRequest {
  nombre?: string;
  descripcion?: string;
}

@Injectable({ providedIn: 'root' })
export class RolService {

  private readonly api = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  listarRoles(): Observable<RolDto[]> {
    return this.http.get<RolDto[]>(`${this.api}/roles`);
  }

  crearRol(body: RolRequest): Observable<RolDto> {
    return this.http.post<RolDto>(`${this.api}/roles`, body);
  }

  actualizarRol(nombre: string, body: RolRequest): Observable<RolDto> {
    return this.http.put<RolDto>(`${this.api}/roles/${encodeURIComponent(nombre)}`, body);
  }

  eliminarRol(nombre: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/roles/${encodeURIComponent(nombre)}`);
  }

  cambiarEstadoRol(nombre: string, activo: boolean): Observable<RolDto> {
    return this.http.patch<RolDto>(`${this.api}/roles/${encodeURIComponent(nombre)}/estado`, { activo });
  }

  listarPermisos(): Observable<PermisoDef[]> {
    return this.http.get<PermisoDef[]>(`${this.api}/permisos`);
  }

  permisosDeRol(nombre: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.api}/roles/${encodeURIComponent(nombre)}/permisos`);
  }

  guardarPermisosRol(nombre: string, permisos: string[]): Observable<string[]> {
    return this.http.put<string[]>(`${this.api}/roles/${encodeURIComponent(nombre)}/permisos`, { permisos });
  }

  restaurarPermisosRol(nombre: string): Observable<string[]> {
    return this.http.post<string[]>(`${this.api}/roles/${encodeURIComponent(nombre)}/permisos/restaurar`, {});
  }
}
