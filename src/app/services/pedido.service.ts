import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Pedido } from '../models/pedido.model';

import { environment } from '../../environments/environment';

export interface PagoPedidoDto {
  id: number;
  pedidoId: number;
  monto: number;
  metodoPago: string;
  nota?: string | null;
  fechaRegistro: string;
  horaRegistro: string;
  usuarioNombre: string;
  usuarioCorreo: string;
  usuarioRol: string;
}

export interface RegistrarPagoPayload {
  monto: number;
  metodoPago: string;
  nota?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PedidoService {

  private readonly API = `${environment.apiUrl}/api/pedidos`;

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<Pedido[]>(this.API);
  }

  listarPorEstado(estado: string) {
    return this.http.get<Pedido[]>(
      `${this.API}/estado/${estado}`
    );
  }

  crear(pedido: Pedido) {
    return this.http.post<Pedido>(
      this.API,
      pedido
    );
  }

  actualizar(id: number, pedido: any, usuario: any) {
    const body = {
      ...pedido,
      usuarioNombre: usuario.nombre,
      usuarioCorreo: usuario.correo,
      usuarioRol: usuario.rol
    };

    return this.http.put<any>(`${this.API}/${id}`, body);
  }

  actualizarPedido(id: number, pedido: any) {
    return this.http.put(
      `${this.API}/${id}`,
      pedido
    );
  }
  
  listarAuditoria(id: number) {
    return this.http.get<any[]>(`${this.API}/${id}/auditoria`);
  }

  listarPagosPedido(id: number) {
    return this.http.get<PagoPedidoDto[]>(`${this.API}/${id}/pagos`);
  }

  registrarPagoPedido(id: number, body: RegistrarPagoPayload) {
    return this.http.post<PagoPedidoDto>(`${this.API}/${id}/pagos`, body);
  }

  eliminar(id: number) {
    return this.http.delete(
      `${this.API}/${id}`
    );
  }
}