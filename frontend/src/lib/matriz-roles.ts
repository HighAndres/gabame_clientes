import type { Empresa, Rol, UsuarioOut } from "@/types/auth";

/**
 * Espejo de backend/app/core/matriz.py (ADR-0008). Solo decide que se RENDERIZA;
 * el backend vuelve a resolver el alcance y los modulos habilitados en cada peticion.
 *
 * # Pendiente 0.2 — matriz provisional hasta que el cliente valide roles x empresas.
 */
export const EMPRESA_DUENA_MEDICOS: Empresa = "gabame";

export const EMPRESAS: readonly Empresa[] = ["gabame", "medinter", "ordan", "a7"];

export const NOMBRE_EMPRESA: Record<Empresa, string> = {
  gabame: "GABAME",
  medinter: "Medinter",
  ordan: "Ordan",
  a7: "A7",
};

export const NOMBRE_ROL: Record<Rol, string> = {
  paciente: "Paciente / consumidor",
  medico: "Profesional de la salud",
  partner: "Partner",
  admin_empresa: "Administrador de empresa",
  editor_empresa: "Editor de empresa",
  admin_grupo: "Administrador del grupo",
};

export interface Alcance {
  grupo: boolean;
  /** Empresas que administra (aprueba vinculos, revisa documentos, ve usuarios). */
  admin: Empresa[];
  /** Empresas que solo edita (contenido y contactos). */
  editor: Empresa[];
  /** Empresas visibles en el panel. */
  empresas: Empresa[];
  /** Entra al panel de administracion, aunque sea solo como editor. */
  esAdmin: boolean;
  administraAlguna: boolean;
  veMedicos: boolean;
  editaContenidoRx: boolean;
  vePacientes: boolean;
}

export function alcanceDe(u: UsuarioOut): Alcance {
  const grupo = u.roles.some((r) => r.rol === "admin_grupo");
  const admin = u.roles.filter((r) => r.rol === "admin_empresa" && r.empresa).map((r) => r.empresa as Empresa);
  const editor = u.roles.filter((r) => r.rol === "editor_empresa" && r.empresa).map((r) => r.empresa as Empresa);
  const empresas = grupo ? [...EMPRESAS] : Array.from(new Set([...admin, ...editor]));
  const administra = (e: Empresa) => grupo || admin.includes(e);
  const edita = (e: Empresa) => administra(e) || editor.includes(e);
  return {
    grupo,
    admin,
    editor,
    empresas,
    esAdmin: grupo || admin.length > 0 || editor.length > 0,
    administraAlguna: grupo || admin.length > 0,
    veMedicos: administra(EMPRESA_DUENA_MEDICOS),
    editaContenidoRx: edita(EMPRESA_DUENA_MEDICOS),
    vePacientes: grupo,
  };
}

/** Etiqueta del rol con el que la persona entra al panel. */
export function rolAdminDe(u: UsuarioOut): string {
  const a = alcanceDe(u);
  if (a.grupo) return NOMBRE_ROL.admin_grupo;
  if (a.admin.length > 0) return NOMBRE_ROL.admin_empresa;
  return NOMBRE_ROL.editor_empresa;
}

export interface ItemNav {
  href: string;
  texto: string;
}

/** Navegacion principal del portal segun roles. */
export function navPara(u: UsuarioOut): ItemNav[] {
  const roles = u.roles.map((r) => r.rol);
  const items: ItemNav[] = [{ href: "/dashboard", texto: "Inicio" }];
  if (roles.includes("medico")) items.push({ href: "/medico", texto: "Area medica" });
  if (roles.includes("partner")) items.push({ href: "/partner", texto: "Partners" });
  if (alcanceDe(u).esAdmin) items.push({ href: "/admin", texto: "Administracion" });
  items.push({ href: "/perfil", texto: "Mi cuenta" });
  return items;
}

/** Sub-navegacion del area admin segun alcance. Lo que no se administra no se muestra. */
export function navAdmin(u: UsuarioOut): ItemNav[] {
  const a = alcanceDe(u);
  const items: ItemNav[] = [{ href: "/admin", texto: "Resumen" }];
  if (a.veMedicos) items.push({ href: "/admin/medicos", texto: "Medicos" });
  if (a.editaContenidoRx) items.push({ href: "/admin/contenido", texto: "Contenido Rx" });
  if (a.administraAlguna) items.push({ href: "/admin/partners", texto: "Partners" });
  if (a.administraAlguna) items.push({ href: "/admin/usuarios", texto: "Usuarios" });
  return items;
}
