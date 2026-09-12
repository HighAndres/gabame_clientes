import { PuertaEntrada } from "@/components/auth/puerta-entrada";

/** Puerta "Portal de clientes" (boton de gabame.com). Ver src/lib/entradas.ts y docs/puntos-de-entrada.md. */
export default function ClientesPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  return <PuertaEntrada entrada="clientes" searchParams={searchParams} />;
}
