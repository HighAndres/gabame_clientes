import { exigirAlcance } from "@/lib/guardas";

/** Validacion de medicos: quien administra GABAME. */
export default async function MedicosLayout({ children }: { children: React.ReactNode }) {
  await exigirAlcance((a) => a.veMedicos, "medicos_fuera_de_alcance");
  return children;
}
