import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Cliente } from '../models/cliente.model';

export interface ClientePayload {
  nombre: string;
  documento: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  tipoCliente?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClienteService {

  private readonly base = `${environment.apiUrl}/api/clientes`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.base);
  }

  crear(payload: ClientePayload): Observable<Cliente> {
    return this.http.post<Cliente>(this.base, payload);
  }

  actualizar(id: number, payload: ClientePayload): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.base}/${id}`, payload);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
