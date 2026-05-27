import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Material } from '../models/material.model';

@Injectable({ providedIn: 'root' })
export class MaterialService {
  private readonly base = `${environment.apiUrl}/materiales`;

  constructor(private http: HttpClient) {}

  listar(soloActivos?: boolean): Observable<Material[]> {
    if (soloActivos) {
      return this.http.get<Material[]>(this.base, { params: { soloActivos: 'true' } });
    }
    return this.http.get<Material[]>(this.base);
  }

  crear(material: Material): Observable<Material> {
    return this.http.post<Material>(this.base, material);
  }

  actualizar(id: number, material: Material): Observable<Material> {
    return this.http.put<Material>(`${this.base}/${id}`, material);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  cambiarEstado(id: number, activo: boolean): Observable<Material> {
    return this.http.patch<Material>(`${this.base}/${id}/estado`, { activo });
  }
}
