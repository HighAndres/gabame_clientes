import { describe, expect, it } from "vitest";

import { cabecerasDeSalida } from "@/lib/proxy-cabeceras";

describe("cabecerasDeSalida", () => {
  it("nunca reenvia content-length ni content-encoding", () => {
    // El caso real que rompio el portal: el backend responde comprimido (brotli), fetch entrega
    // el cuerpo ya descomprimido y la cabecera sigue anunciando el tamano comprimido. Copiarla
    // recortaba el JSON a 227 bytes cuando el cuerpo real eran 337.
    const origen = new Headers({
      "content-type": "application/json",
      "content-length": "227",
      "content-encoding": "br",
    });
    const salida = cabecerasDeSalida(origen);
    expect(salida.get("content-length")).toBeNull();
    expect(salida.get("content-encoding")).toBeNull();
    expect(salida.get("content-type")).toBe("application/json");
  });

  it("conserva lo que el navegador necesita para tratar el cuerpo", () => {
    const origen = new Headers({
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="csf.pdf"',
      "cache-control": "no-store",
    });
    const salida = cabecerasDeSalida(origen);
    expect(salida.get("content-type")).toBe("application/pdf");
    expect(salida.get("content-disposition")).toBe('attachment; filename="csf.pdf"');
    expect(salida.get("cache-control")).toBe("no-store");
  });

  it("no inventa cabeceras que el backend no mando", () => {
    expect([...cabecerasDeSalida(new Headers()).keys()]).toEqual([]);
  });
});
