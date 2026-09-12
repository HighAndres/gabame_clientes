import { describe, expect, it } from "vitest";

import { conservarParams, leerOrigen } from "@/lib/origen";

const params = (obj: Record<string, string>) => ({ get: (k: string) => obj[k] ?? null });

/** Misma regla que OrigenIn del backend: solo pieza del enum, ruta interna, campana corta. */
describe("leerOrigen", () => {
  it("lee origen, ruta y campana validos", () => {
    expect(leerOrigen(params({ origen: "gabame", ruta: "/conocer-mas", campana: "lanzamiento" }))).toEqual({
      producto: "gabame",
      ruta_entrada: "/conocer-mas",
      campana: "lanzamiento",
    });
  });

  it("ignora productos fuera del enum", () => {
    expect(leerOrigen(params({ origen: "competidor" }))).toBeNull();
    expect(leerOrigen(params({}))).toBeNull();
  });

  it("descarta rutas con host, query o fragmento pero conserva el origen", () => {
    for (const ruta of ["//evil.com", "https://evil.com/a", "/x?y=1", "/x#f", "/\\evil", "sin-barra"]) {
      expect(leerOrigen(params({ origen: "ordan", ruta }))?.ruta_entrada, ruta).toBeNull();
    }
  });

  it("nunca captura ip, user agent ni huella aunque vengan", () => {
    const r = leerOrigen(params({ origen: "a7", ip: "1.2.3.4", ua: "x", huella: "abc" }));
    expect(Object.keys(r!)).toEqual(["producto", "ruta_entrada", "campana"]);
  });

  it("recorta la campana a 120 caracteres", () => {
    expect(leerOrigen(params({ origen: "gabame", campana: "c".repeat(200) }))?.campana).toHaveLength(120);
  });
});

describe("conservarParams", () => {
  it("propaga la puerta elegida (tipo y empresa) ademas del origen", () => {
    const s = conservarParams(params({ origen: "ordan", tipo: "empresa", empresa: "ordan", otro: "no" }));
    expect(s).toBe("?origen=ordan&tipo=empresa&empresa=ordan");
  });

  it("solo propaga origen, ruta, campana y redirect", () => {
    const s = conservarParams(params({ origen: "gabame", ruta: "/a", redirect: "/perfil", otro: "no" }));
    expect(s).toBe("?origen=gabame&ruta=%2Fa&redirect=%2Fperfil");
    expect(conservarParams(params({}))).toBe("");
  });
});
