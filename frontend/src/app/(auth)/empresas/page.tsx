import { PuertaEntrada } from "@/components/auth/puerta-entrada";

/** Puerta para empresas y distribuidores (sitios de Medinter, Ordan y A7). Ver src/lib/entradas.ts. */
export default function EmpresasPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  return <PuertaEntrada entrada="empresas" searchParams={searchParams} />;
}
