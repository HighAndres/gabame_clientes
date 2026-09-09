import { cn } from "@/lib/utils";

export function iniciales(nombre: string, apellidos: string): string {
  const a = nombre.trim()[0] ?? "";
  const b = apellidos.trim()[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

export function AvatarIniciales({ nombre, apellidos, className }: { nombre: string; apellidos: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary-soft-foreground",
        className,
      )}
    >
      {iniciales(nombre, apellidos)}
    </span>
  );
}
