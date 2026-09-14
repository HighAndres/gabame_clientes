import { describe, expect, it } from "vitest";

import { AVISOS_ACCESO, leerAviso, type MotivoAviso } from "@/lib/avisos-acceso";

describe("leerAviso", () => {
  it("acepta solo las claves del catalogo", () => {
    for (const motivo of Object.keys(AVISOS_ACCESO) as MotivoAviso[]) {
      expect(leerAviso(motivo)).toBe(motivo);
    }
  });

  it("ignora cualquier valor que no este en el catalogo", () => {
    // El texto del aviso nunca viene de la URL: si la clave no existe, no se muestra nada.
    for (const valor of [
      "inventado",
      "<script>alert(1)</script>",
      "Tu cuenta fue bloqueada, llama a este numero",
      "constructor",
      "__proto__",
      "toString",
      "",
    ]) {
      expect(leerAviso(valor), valor).toBeNull();
    }
    expect(leerAviso(["solo_medicos", "otro"])).toBeNull();
    expect(leerAviso(null)).toBeNull();
    expect(leerAviso(undefined)).toBeNull();
  });

  it("cada motivo tiene titulo y detalle escritos", () => {
    for (const texto of Object.values(AVISOS_ACCESO)) {
      expect(texto.titulo.length).toBeGreaterThan(10);
      expect(texto.detalle.length).toBeGreaterThan(20);
    }
  });
});
