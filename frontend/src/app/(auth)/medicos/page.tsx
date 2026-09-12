import { PuertaEntrada } from "@/components/auth/puerta-entrada";

/** Puerta "Área médica" (boton de gabame.com). Ver src/lib/entradas.ts y docs/puntos-de-entrada.md. */
export default function MedicosPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  return <PuertaEntrada entrada="medicos" searchParams={searchParams} />;
}
