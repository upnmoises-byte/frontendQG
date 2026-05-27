export interface Material {
  id?: number;
  nombre: string;
  marca?: string;
  color?: string;
  tipo?: 'NORMAL' | 'RH' | string;
  espesor?: string;
  medida?: string;
  activo?: boolean;
}
