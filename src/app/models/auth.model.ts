export interface UsuarioSesion {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  permisos?: string[];
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioSesion;
}
