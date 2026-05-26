import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface FactilizaDocumentoResponse {
  success: boolean;
  mensaje: string;
  tipoDocumento?: 'DNI' | 'RUC' | string;
  numeroDocumento?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  nombreCompleto?: string;
  ruc?: string;
  razonSocial?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  estado?: string;
  condicion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FactilizaService {
  private readonly base = `${environment.apiUrl}/factiliza`;

  constructor(private http: HttpClient) {}

  consultarDocumento(numero: string): Observable<FactilizaDocumentoResponse> {
    return this.http.get<FactilizaDocumentoResponse>(`${this.base}/documento/${numero}`);
  }
}
