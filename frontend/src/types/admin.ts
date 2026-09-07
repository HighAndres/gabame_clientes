/** Espejo de app/schemas/admin.py. */

import type { Empresa, EstadoValidacion, Producto, SubtipoPartner, UsuarioOut } from "@/types/auth";

export interface UsuarioAdminOut extends UsuarioOut {
  activo: boolean;
}

export interface PaginaUsuarios {
  total: number;
  items: UsuarioAdminOut[];
}

export interface MedicoAdminOut {
  usuario_id: string;
  email: string;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  cedula_profesional: string;
  especialidad: string | null;
  institucion: string | null;
  estado: EstadoValidacion;
  validado_por_id: string | null;
  validado_en: string | null;
  motivo_rechazo: string | null;
  origen_inicial: Producto;
  creado_en: string;
}

export interface PartnerAdminOut {
  usuario_id: string;
  email: string;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  razon_social: string;
  rfc: string | null;
  subtipo: SubtipoPartner;
  empresa_objetivo: Empresa;
  estado: EstadoValidacion;
  aprobado_por_id: string | null;
  aprobado_en: string | null;
  motivo_rechazo: string | null;
  documentos: number;
  creado_en: string;
}

export interface ResumenAdmin {
  medicos_pendientes: number | null;
  partners_pendientes: number;
  usuarios_total: number | null;
  alcance_grupo: boolean;
  empresas: Empresa[];
}

export interface PiezaOut {
  producto: Producto;
  nombre: string;
  tipo: "sitio" | "tienda" | "app";
  empresa: Empresa | null;
  url: string | null;
  descripcion: string;
  pendiente: boolean;
}
