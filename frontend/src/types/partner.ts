/** Espejo de app/schemas/partner.py. */

import type { Empresa, EstadoValidacion, SubtipoPartner } from "@/types/auth";

export interface DocumentoOut {
  id: string;
  tipo: string;
  nombre_archivo: string;
  content_type: string;
  tamano_bytes: number;
  estado: EstadoValidacion;
  motivo_rechazo: string | null;
  revisado_en: string | null;
  subido_en: string;
}

export interface RequisitoOut {
  tipo: string;
  nombre: string;
  descripcion: string;
  obligatorio: boolean;
  documentos: DocumentoOut[];
}

export interface ContactoEmpresaOut {
  empresa: Empresa;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  portal_url: string | null;
  pendiente: boolean;
}

export interface EstadoPartnerOut {
  razon_social: string;
  rfc: string | null;
  subtipo: SubtipoPartner;
  empresa_objetivo: Empresa;
  estado: EstadoValidacion;
  motivo_rechazo: string | null;
  aprobado_en: string | null;
  requisitos: RequisitoOut[];
  contactos: ContactoEmpresaOut[];
  limite_mb: number;
  tipos_permitidos: string[];
}
