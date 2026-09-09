import { cn } from "@/lib/utils";
import type { Empresa } from "@/types/auth";

/**
 * Identidad de una empresa dentro de su espacio (opcion A aprobada): nombre y, si existe, su
 * logotipo; la paleta es siempre la del grupo. Solo GABAME tiene logo entregado; las demas
 * muestran sus iniciales hasta que el cliente entregue el suyo.
 */
const LOGOS: Partial<Record<Empresa, string>> = {
  gabame: "/marca/logo-gabame.svg",
};

export function LogoEmpresa({
  empresa,
  nombre,
  tamano = "md",
  className,
}: {
  empresa: Empresa;
  nombre: string;
  tamano?: "sm" | "md" | "lg";
  className?: string;
}) {
  const logo = LOGOS[empresa];
  const alto = { sm: "h-8", md: "h-10", lg: "h-14" }[tamano];
  const caja = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-[13px]", lg: "h-14 w-14 text-base" }[tamano];
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt={nombre} className={cn(alto, "w-auto", className)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center rounded-md bg-primary-soft font-bold text-primary-soft-foreground", caja, className)}
    >
      {nombre.slice(0, 2).toUpperCase()}
    </span>
  );
}
