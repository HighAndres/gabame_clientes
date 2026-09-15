/** Espejo de app/schemas/partner.py (ADR-0008: vinculos por empresa). */

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
  /** Clave del requisito (asi se guarda en el documento). */
  tipo: string;
  nombre: string;
  descripcion: string | null;
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

export interface VinculoOut {
  id: string;
  empresa: Empresa;
  empresa_nombre: string;
  tipo: SubtipoPartner;
  estado: EstadoValidacion;
  motivo_rechazo: string | null;
  aprobado_en: string | null;
  creado_en: string;
  /** Solo cuando el vinculo esta aprobado y la empresa tiene el modulo de contactos. */
  contacto: ContactoEmpresaOut | null;
}

export interface EstadoPartnerOut {
  razon_social: string;
  rfc: string | null;
  /** Agregado de los vinculos: validado si alguno lo esta; pendiente si alguno; si no, rechazado. */
  estado: EstadoValidacion | null;
  vinculos: VinculoOut[];
  requisitos: RequisitoOut[];
  limite_mb: number;
  tipos_permitidos: string[];
  /** Empresas con las que aun no hay vinculo y aceptan solicitudes. */
  empresas_disponibles: Empresa[];
}

export interface SolicitarVinculoIn {
  empresa: Empresa;
  tipo: SubtipoPartner;
}

export const NOMBRE_SUBTIPO: Record<SubtipoPartner, string> = {
  distribuidor: "Distribuidor",
  mayorista: "Mayorista",
  institucional: "Cliente institucional",
};

export const TEXTO_VINCULO: Record<EstadoValidacion, string> = {
  pendiente: "En revisión",
  validado: "Aprobado",
  rechazado: "No aprobado",
};
