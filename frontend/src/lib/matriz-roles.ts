import type { Empresa, Rol, UsuarioOut } from "@/types/auth";

/**
 * Espejo de backend/app/core/matriz.py (ADR-0004). Solo decide que se RENDERIZA;
 * el backend vuelve a resolver el alcance en cada peticion.
 *
 * # Pendiente 0.2 — matriz provisional hasta que el cliente valide roles x empresas.
 */
export const EMPRESA_DUENA_MEDICOS: Empresa = "gabame";

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
  admin_grupo: "Administrador del grupo",
};

export interface Alcance {
  grupo: boolean;
  empresas: Empresa[];
  esAdmin: boolean;
  veMedicos: boolean;
  vePacientes: boolean;
}

export function alcanceDe(u: UsuarioOut): Alcance {
  const grupo = u.roles.some((r) => r.rol === "admin_grupo");
  const empresas = u.roles.filter((r) => r.rol === "admin_empresa" && r.empresa).map((r) => r.empresa as Empresa);
  return {
    grupo,
    empresas,
    esAdmin: grupo || empresas.length > 0,
    veMedicos: grupo || empresas.includes(EMPRESA_DUENA_MEDICOS),
    vePacientes: grupo,
  };
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

/** Sub-navegacion del area admin segun alcance. */
export function navAdmin(u: UsuarioOut): ItemNav[] {
  const a = alcanceDe(u);
  const items: ItemNav[] = [{ href: "/admin", texto: "Resumen" }];
  if (a.veMedicos) items.push({ href: "/admin/medicos", texto: "Medicos" });
  if (a.veMedicos) items.push({ href: "/admin/contenido", texto: "Contenido Rx" });
  items.push({ href: "/admin/partners", texto: "Partners" });
  items.push({ href: "/admin/usuarios", texto: "Usuarios" });
  return items;
}
