import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { CatalogoEspecial } from '../models/catalogo-especial.model';

@Injectable({ providedIn: 'root' })
export class CatalogoEspecialService {
  private readonly base = `${environment.apiUrl}/especiales`;

  constructor(private http: HttpClient) {}

  listar(soloActivos?: boolean): Observable<CatalogoEspecial[]> {
    if (soloActivos) {
      return this.http.get<CatalogoEspecial[]>(this.base, { params: { soloActivos: 'true' } });
    }
    return this.http.get<CatalogoEspecial[]>(this.base);
  }

  crear(especial: CatalogoEspecial): Observable<CatalogoEspecial> {
    return this.http.post<CatalogoEspecial>(this.base, especial);
  }

  actualizar(id: number, especial: CatalogoEspecial): Observable<CatalogoEspecial> {
    return this.http.put<CatalogoEspecial>(`${this.base}/${id}`, especial);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  cambiarEstado(id: number, activo: boolean): Observable<CatalogoEspecial> {
    return this.http.patch<CatalogoEspecial>(`${this.base}/${id}/estado`, { activo });
  }
}
