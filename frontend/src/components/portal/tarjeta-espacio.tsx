import Link from "next/link";

import { LogoEmpresa } from "@/components/marca/logo-empresa";
import { Card, CardContent } from "@/components/ui/card";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import type { EspacioMioOut } from "@/types/espacios";
import { TEXTO_VINCULO } from "@/types/partner";

/** Tarjeta de un espacio de empresa en el portal: identidad, vinculo si aplica y cuanto hay dentro. */
export function TarjetaEspacio({ e }: { e: EspacioMioOut }) {
  const n = e.publicaciones.length;
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <LogoEmpresa empresa={e.empresa} nombre={e.nombre} />
            {e.empresa !== "gabame" && <span className="truncate text-[15px] font-bold">{e.nombre}</span>}
          </div>
          {e.vinculo_estado && <Estado tono={tonoDeValidacion(e.vinculo_estado)}>{TEXTO_VINCULO[e.vinculo_estado]}</Estado>}
        </div>
        <p className="text-[13px] text-muted-foreground">
          {n === 0 ? "Sin publicaciones por ahora." : `${n} ${n === 1 ? "publicación" : "publicaciones"} para ti.`}
          {e.contacto && !e.contacto.pendiente ? " Contacto comercial disponible." : ""}
        </p>
        <Link href={`/espacios/${e.empresa}`} className="text-sm font-bold text-primary hover:text-primary-hover">
          Entrar al espacio
        </Link>
      </CardContent>
    </Card>
  );
}
