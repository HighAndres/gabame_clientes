import { exigirAlcance } from "@/lib/guardas";

/** Configuracion de espacios: admins y editores (cada uno sobre su empresa). */
export default async function EspaciosLayout({ children }: { children: React.ReactNode }) {
  await exigirAlcance((a) => a.esAdmin, "solo_panel");
  return children;
}
