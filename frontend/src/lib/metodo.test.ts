import { describe, expect, it } from "vitest";

import { CABECERA_METODO, metodoEfectivo, prepararPeticion } from "@/lib/metodo";

const peticion = (method: string, cabecera?: string) => ({
  method,
  headers: new Headers(cabecera ? { [CABECERA_METODO]: cabecera } : {}),
});

describe("prepararPeticion", () => {
  it("manda PUT, PATCH y DELETE como POST con el metodo en la cabecera", () => {
    for (const m of ["PUT", "PATCH", "DELETE", "patch"]) {
      const r = prepararPeticion({ method: m, headers: { "Content-Type": "application/json" } });
      expect(r.method).toBe("POST");
      const h = new Headers(r.headers);
      expect(h.get(CABECERA_METODO)).toBe(m.toUpperCase());
      expect(h.get("content-type")).toBe("application/json"); // no pierde las demas cabeceras
    }
  });

  it("deja intactos GET y POST", () => {
    const get = { method: "GET" };
    const post = { method: "POST", body: "x" };
    expect(prepararPeticion(get)).toBe(get);
    expect(prepararPeticion(post)).toBe(post);
    expect(prepararPeticion()).toEqual({});
  });
});

describe("metodoEfectivo", () => {
  it("restituye el metodo tunelado solo sobre POST", () => {
    expect(metodoEfectivo(peticion("POST", "DELETE"))).toBe("DELETE");
    expect(metodoEfectivo(peticion("POST", "patch"))).toBe("PATCH");
  });

  it("un GET nunca se convierte en otra cosa, aunque traiga la cabecera", () => {
    expect(metodoEfectivo(peticion("GET", "DELETE"))).toBe("GET");
  });

  it("ignora valores fuera de la lista cerrada", () => {
    // (Un valor con espacios alrededor no cuenta como "raro": Headers los recorta por especificacion.)
    for (const raro of ["GET", "TRACE", "CONNECT", "DELETEX", ""]) {
      expect(metodoEfectivo(peticion("POST", raro))).toBe("POST");
    }
  });

  it("los metodos directos siguen funcionando (local y pruebas)", () => {
    expect(metodoEfectivo(peticion("PATCH"))).toBe("PATCH");
  });
});
