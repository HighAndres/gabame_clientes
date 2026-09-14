"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AVISOS_ACCESO, type MotivoAviso, PARAM_AVISO } from "@/lib/avisos-acceso";

/**
 * Explica por que una guarda devolvio a la persona a esta pantalla. Al cerrarlo se limpia el
 * parametro de la URL, para que recargar o compartir el enlace no lo vuelva a mostrar.
 */
export function AvisoAcceso({ motivo }: { motivo: MotivoAviso }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const { titulo, detalle } = AVISOS_ACCESO[motivo];

  function cerrar() {
    setVisible(false);
    const resto = new URLSearchParams(params);
    resto.delete(PARAM_AVISO);
    const q = resto.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  return (
    <div role="status" className="flex items-start gap-3 rounded-lg border border-[#f0dcb8] bg-[#fffaf3] px-5 py-4">
      <span className="flex flex-1 flex-col gap-1">
        <span className="text-[15px] font-bold text-heading">{titulo}</span>
        <span className="text-[13px] leading-relaxed text-muted-foreground">{detalle}</span>
      </span>
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={cerrar}
        className="rounded-md p-1 text-muted-foreground hover:bg-white hover:text-heading focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
