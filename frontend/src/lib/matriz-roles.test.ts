import { describe, expect, it } from "vitest";

import { alcanceDe, navAdmin } from "@/lib/matriz-roles";
import type { UsuarioOut } from "@/types/auth";

function usuario(roles: UsuarioOut["roles"]): UsuarioOut {
  return {
    id: "u",
    email: "u@ejemplo.com",
    email_verificado: true,
    nombre: "U",
    apellidos: "X",
    telefono: null,
    realm: "partners",
    roles,
    origen_inicial: "directo",
    estado_medico: null,
    estado_partner: null,
    vinculos: [],
    creado_en: "2026-01-01T00:00:00Z",
  };
}

describe("alcanceDe", () => {
  it("admin_grupo ve y administra todo", () => {
    const a = alcanceDe(usuario([{ rol: "admin_grupo", empresa: null }]));
    expect(a.grupo).toBe(true);
    expect(a.empresas).toEqual(["gabame", "medinter", "ordan", "a7"]);
    expect(a.veMedicos && a.editaContenidoRx && a.administraAlguna).toBe(true);
  });

  it("admin_empresa de Ordan no ve medicos ni contenido Rx", () => {
    const a = alcanceDe(usuario([{ rol: "admin_empresa", empresa: "ordan" }]));
    expect(a.empresas).toEqual(["ordan"]);
    expect(a.administraAlguna).toBe(true);
    expect(a.veMedicos).toBe(false);
    expect(a.editaContenidoRx).toBe(false);
    expect(navAdmin(usuario([{ rol: "admin_empresa", empresa: "ordan" }])).map((n) => n.href)).toEqual([
      "/admin",
      "/admin/publicaciones",
      "/admin/partners",
      "/admin/usuarios",
      "/admin/espacios",
      "/admin/bitacora",
    ]);
  });

  it("editor_empresa de GABAME edita contenido pero no administra cuentas", () => {
    const u = usuario([{ rol: "editor_empresa", empresa: "gabame" }]);
    const a = alcanceDe(u);
    expect(a.esAdmin).toBe(true);
    expect(a.administraAlguna).toBe(false);
    expect(a.veMedicos).toBe(false);
    expect(a.editaContenidoRx).toBe(true);
    expect(navAdmin(u).map((n) => n.href)).toEqual(["/admin", "/admin/contenido", "/admin/publicaciones", "/admin/espacios"]);
  });

  it("un paciente no es admin", () => {
    expect(alcanceDe(usuario([{ rol: "paciente", empresa: null }])).esAdmin).toBe(false);
  });
});
