import { cn } from "@/lib/utils";

/**
 * Chip de estado del sistema de diseno. Naranja solo para "pendiente": es el unico uso
 * del acento #ef8f00 en el portal.
 */
export type TonoEstado = "pendiente" | "validado" | "rechazado" | "publicada" | "borrador" | "neutro";

const TONOS: Record<TonoEstado, string> = {
  pendiente: "bg-[#fff3e0] text-[#9a5a00]",
  validado: "bg-[#e6f4ee] text-[#176b48]",
  rechazado: "bg-[#fbe9e9] text-[#9b2c2c]",
  publicada: "bg-primary-soft text-primary-soft-foreground",
  borrador: "bg-[#eef0f3] text-heading",
  neutro: "bg-[#eef0f3] text-heading",
};

const TEXTO: Partial<Record<TonoEstado, string>> = {
  pendiente: "Pendiente",
  validado: "Validado",
  rechazado: "Rechazado",
  publicada: "Publicada",
  borrador: "Borrador",
};

export function Estado({ tono, children, className }: { tono: TonoEstado; children?: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2.5 text-xs font-bold",
        TONOS[tono],
        className,
      )}
    >
      {children ?? TEXTO[tono]}
    </span>
  );
}

/** Mapea el enum EstadoValidacion del backend al tono del chip. */
export function tonoDeValidacion(estado: "pendiente" | "validado" | "rechazado" | null | undefined): TonoEstado {
  return estado ?? "neutro";
}
