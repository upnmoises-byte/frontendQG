import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ReportePedidosPdfParams {
  cliente?: string;
  vendedora?: string;
  estado?: string;
  maquina?: string;
  saldo?: string;
  fiDesde?: string;
  fiHasta?: string;
  feDesde?: string;
  feHasta?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private readonly API = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  obtenerPedidosPdf(params: ReportePedidosPdfParams): Observable<Blob> {
    let httpParams = new HttpParams();
    const entries: [keyof ReportePedidosPdfParams, string][] = [
      ['cliente', params.cliente ?? ''],
      ['vendedora', params.vendedora ?? ''],
      ['estado', params.estado ?? ''],
      ['maquina', params.maquina ?? ''],
      ['saldo', params.saldo ?? ''],
      ['fiDesde', params.fiDesde ?? ''],
      ['fiHasta', params.fiHasta ?? ''],
      ['feDesde', params.feDesde ?? ''],
      ['feHasta', params.feHasta ?? '']
    ];
    for (const [k, v] of entries) {
      if (v.trim() !== '') {
        httpParams = httpParams.set(k, v);
      }
    }
    return this.http.get(`${this.API}/pedidos.pdf`, {
      responseType: 'blob',
      params: httpParams
    });
  }
}
