import { describe, expect, it } from "vitest";

import { novedadesDe } from "@/lib/novedades";
import type { Audiencia, Empresa } from "@/types/auth";
import type { EspacioMioOut } from "@/types/espacios";

function espacio(empresa: Empresa, nombre: string, pubs: [string, Audiencia, string][]): EspacioMioOut {
  return {
    empresa,
    nombre,
    modulos: [],
    portal_url: null,
    audiencias: ["pacientes"],
    vinculo_estado: null,
    contacto: null,
    publicaciones: pubs.map(([titulo, audiencia, fecha], i) => ({
      id: `${empresa}-${i}`,
      audiencia,
      slug: titulo.toLowerCase().replace(/ /g, "-"),
      titulo,
      resumen: null,
      orden: 0,
      actualizado_en: fecha,
    })),
  };
}

describe("novedadesDe", () => {
  it("junta las publicaciones de todas las empresas, mas reciente primero", () => {
    const r = novedadesDe([
      espacio("gabame", "GABAME", [["Vieja", "pacientes", "2026-01-01T00:00:00Z"]]),
      espacio("ordan", "Ordan", [["Nueva", "partners", "2026-03-01T00:00:00Z"]]),
      espacio("a7", "A7", [["Media", "pacientes", "2026-02-01T00:00:00Z"]]),
    ]);
    expect(r.map((n) => n.titulo)).toEqual(["Nueva", "Media", "Vieja"]);
    expect(r[0].empresaNombre).toBe("Ordan");
  });

  it("arma el enlace a la publicacion con empresa y audiencia", () => {
    const r = novedadesDe([espacio("ordan", "Ordan", [["Solo partners", "partners", "2026-03-01T00:00:00Z"]])]);
    expect(r[0].href).toBe("/espacios/ordan/partners/solo-partners");
  });

  it("respeta el limite", () => {
    const pubs = Array.from({ length: 10 }, (_, i) => [`P${i}`, "pacientes", `2026-01-0${i % 9}T00:00:00Z`]);
    const r = novedadesDe([espacio("gabame", "GABAME", pubs as [string, Audiencia, string][])], 4);
    expect(r).toHaveLength(4);
  });

  it("ordena de forma estable cuando dos publicaciones tienen la misma fecha", () => {
    const misma = "2026-05-05T00:00:00Z";
    const entrada = [espacio("gabame", "GABAME", [["Beta", "pacientes", misma], ["Alfa", "pacientes", misma]])];
    expect(novedadesDe(entrada).map((n) => n.titulo)).toEqual(["Alfa", "Beta"]);
  });

  it("sin publicaciones devuelve vacio", () => {
    expect(novedadesDe([espacio("gabame", "GABAME", [])])).toEqual([]);
    expect(novedadesDe([])).toEqual([]);
  });
});
