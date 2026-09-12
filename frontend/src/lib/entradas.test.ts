import { describe, expect, it } from "vitest";

import { enlaceEntrada, ENTRADAS, entradaPorTipo } from "@/lib/entradas";

describe("puertas de entrada", () => {
  it("cada puerta tiene ruta propia, tipo de cuenta y destino interno", () => {
    const rutas = Object.values(ENTRADAS).map((e) => e.ruta);
    expect(new Set(rutas).size).toBe(rutas.length);
    for (const e of Object.values(ENTRADAS)) {
      expect(e.destino.startsWith("/")).toBe(true);
      expect(entradaPorTipo(e.tipo)).toBe(e);
    }
    expect(entradaPorTipo("otro")).toBeNull();
    expect(entradaPorTipo(null)).toBeNull();
  });

  it("genera el enlace que se pega en cada sitio con su origen", () => {
    expect(enlaceEntrada("https://clientes.gabame.com", "medicos", "gabame")).toBe(
      "https://clientes.gabame.com/medicos?origen=gabame",
    );
    expect(enlaceEntrada("https://clientes.gabame.com", "empresas", "ordan", { empresa: "ordan", campana: "distribuidores" })).toBe(
      "https://clientes.gabame.com/empresas?origen=ordan&empresa=ordan&campana=distribuidores",
    );
  });
});
