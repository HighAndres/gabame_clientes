import { describe, expect, it } from "vitest";

import { DESTINO_POR_DEFECTO, destinoSeguro, esDestinoExterno } from "@/lib/redirect";

/** destinoSeguro es la unica puerta de redireccion (ADR-0003). Sin redirecciones abiertas. */
describe("destinoSeguro", () => {
  it("acepta rutas internas simples", () => {
    expect(destinoSeguro("/perfil")).toBe("/perfil");
    expect(destinoSeguro("/medico/cardiologia?x=1")).toBe("/medico/cardiologia?x=1");
  });

  it("acepta dominios del grupo y sus subdominios por https", () => {
    expect(destinoSeguro("https://gabame.com/conocer-mas")).toBe("https://gabame.com/conocer-mas");
    expect(destinoSeguro("https://www.medinter.com.mx/")).toBe("https://www.medinter.com.mx/");
    expect(destinoSeguro("https://tiendagabame.com/cuenta")).toBe("https://tiendagabame.com/cuenta");
  });

  it("rechaza hosts ajenos y trucos de parecido", () => {
    for (const v of [
      "https://evil.com",
      "https://gabame.com.evil.com/x",
      "https://evilgabame.com",
      "https://gabame.com@evil.com/",
      "https://user:pw@gabame.com/",
      "//evil.com",
      "/\\evil.com",
      "javascript:alert(1)",
      "http://gabame.com/", // http solo en local, y la prueba corre como no-produccion pero el host importa
    ]) {
      const r = destinoSeguro(v);
      expect(r === DESTINO_POR_DEFECTO || r.startsWith("http://gabame.com"), v).toBe(true);
      if (v !== "http://gabame.com/") expect(r, v).toBe(DESTINO_POR_DEFECTO);
    }
  });

  it("no vuelve a pantallas de auth ni a route handlers", () => {
    expect(destinoSeguro("/login")).toBe(DESTINO_POR_DEFECTO);
    expect(destinoSeguro("/registro?x=1")).toBe(DESTINO_POR_DEFECTO);
    expect(destinoSeguro("/api/sesion")).toBe(DESTINO_POR_DEFECTO);
  });

  it("cae al dashboard en vacio, basura o muy largo", () => {
    expect(destinoSeguro(null)).toBe(DESTINO_POR_DEFECTO);
    expect(destinoSeguro("")).toBe(DESTINO_POR_DEFECTO);
    expect(destinoSeguro("no es url")).toBe(DESTINO_POR_DEFECTO);
    expect(destinoSeguro("/" + "a".repeat(3000))).toBe(DESTINO_POR_DEFECTO);
  });

  it("distingue destinos externos", () => {
    expect(esDestinoExterno("/perfil")).toBe(false);
    expect(esDestinoExterno("https://gabame.com/")).toBe(true);
  });
});
