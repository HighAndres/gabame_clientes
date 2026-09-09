/** Espejo de app/core/enums.py del backend. Si cambia alla, cambia aqui. */

export type Realm = "id" | "partners";
export type Rol = "paciente" | "medico" | "partner" | "admin_empresa" | "editor_empresa" | "admin_grupo";
export type Empresa = "gabame" | "medinter" | "ordan" | "a7";
export type EstadoValidacion = "pendiente" | "validado" | "rechazado";
export type SubtipoPartner = "distribuidor" | "mayorista" | "institucional";
/** Modulos que un espacio (empresa) puede tener habilitados (ADR-0008). */
export type Modulo = "cuentas" | "documentos" | "contactos" | "contenido_rx";

/** Piezas del ecosistema. Ojo: no es lo mismo que Empresa — las tiendas son productos, no empresas. */
export type Producto =
  | "gabame"
  | "medinter"
  | "ordan"
  | "a7"
  | "tiendagabame"
  | "aurashop"
  | "app_paciente"
  | "directo";

export type EventoOrigen = "registro" | "login" | "retorno";

/** Bifurcacion del onboarding. No es un rol: es lo que la persona declara al registrarse. */
export type TipoCuenta = "paciente" | "profesional" | "empresa";

export type TipoToken = "email" | "reset_password";

// ---------- contratos del API (app/schemas) ----------

export interface OrigenIn {
  producto: Producto;
  ruta_entrada: string | null;
  campana: string | null;
}

export interface RegistroIn {
  tipo_cuenta: TipoCuenta;
  email: string;
  password: string;
  nombre: string;
  apellidos: string;
  telefono?: string | null;
  origen?: OrigenIn | null;
  perfil_medico?: { cedula_profesional: string; especialidad?: string | null; institucion?: string | null } | null;
  perfil_partner?: {
    razon_social: string;
    rfc?: string | null;
    /** Con que empresas del grupo se relaciona y como. Al menos una, sin repetir (ADR-0008). */
    vinculos: VinculoIn[];
  } | null;
}

export interface VinculoIn {
  empresa: Empresa;
  tipo: SubtipoPartner;
}

export interface VinculoResumenOut {
  empresa: Empresa;
  tipo: SubtipoPartner;
  estado: EstadoValidacion;
}

export interface TokenOut {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
}

export interface UsuarioOut {
  id: string;
  email: string;
  email_verificado: boolean;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  realm: Realm;
  roles: { rol: Rol; empresa: Empresa | null }[];
  origen_inicial: Producto;
  estado_medico: EstadoValidacion | null;
  /** Agregado de los vinculos; el detalle por empresa va en `vinculos`. */
  estado_partner: EstadoValidacion | null;
  vinculos: VinculoResumenOut[];
  creado_en: string;
}

/** Claims del access token (ADR-0001 / ADR-0002). Lo que el middleware lee sin ir al backend. */
export interface ClaimsSesion {
  sub: string;
  realm: Realm;
  roles: Rol[];
  empresas: Empresa[];
  email_verified: boolean;
  typ: "access";
  exp: number;
}

/** Forma de `detail` en los errores del backend. */
export interface DetalleError {
  codigo: string;
  mensaje: string;
}
