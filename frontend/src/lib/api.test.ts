import { describe, expect, it } from "vitest";

import { interpretarDetalle } from "@/lib/api";

describe("interpretarDetalle", () => {
  it("respeta el codigo y el mensaje de un error de negocio", () => {
    const e = interpretarDetalle(422, { detail: { codigo: "enlace_fuera_del_grupo", mensaje: "El enlace debe..." } });
    expect(e.codigo).toBe("enlace_fuera_del_grupo");
    expect(e.message).toBe("El enlace debe...");
  });

  it("un 422 de validacion se lee en español y con el nombre del campo", () => {
    // Antes los formularios del panel mostraban "No se pudo guardar." sin decir por que.
    const e = interpretarDetalle(422, {
      detail: [{ type: "string_too_short", loc: ["body", "cedula_profesional"], msg: "String should...", ctx: { min_length: 4 } }],
    });
    expect(e.codigo).toBe("datos_invalidos");
    expect(e.message).toBe("Cédula profesional: debe tener al menos 4 caracteres.");
  });

  it("un campo sin nombre conocido se muestra legible", () => {
    const e = interpretarDetalle(422, { detail: [{ type: "missing", loc: ["body", "tipo_partner"], msg: "Field required" }] });
    expect(e.message).toBe("tipo partner: es obligatorio.");
  });

  it("un error sin forma conocida no inventa un mensaje", () => {
    expect(interpretarDetalle(500, null).codigo).toBe("error");
  });
});
