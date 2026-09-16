import { describe, expect, it } from "vitest";

import { dia, fecha, fechaHora } from "@/lib/fechas";

describe("fechas en la zona del grupo", () => {
  it("un instante de la noche en Mexico no salta al dia siguiente", () => {
    // 21:30 del 15 de septiembre en Ciudad de Mexico = 03:30 UTC del 16. Antes se veia "16/9/2026".
    expect(fecha("2026-09-16T03:30:00+00:00")).toBe("15/9/2026");
    expect(fechaHora("2026-09-16T03:30:00+00:00")).toContain("15/09/26");
  });

  it("acepta opciones de formato", () => {
    expect(fecha("2026-09-15T18:00:00+00:00", { day: "numeric", month: "long", year: "numeric" })).toBe(
      "15 de septiembre de 2026",
    );
  });

  it("una fecha de calendario no se corre con ninguna zona", () => {
    expect(dia("2026-10-05")).toBe("5 de octubre");
    expect(dia("2026-12-31", { day: "numeric", month: "short" })).toBe("31 dic");
  });
});
