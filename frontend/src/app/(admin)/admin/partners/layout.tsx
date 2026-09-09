import { exigirAlcance } from "@/lib/guardas";

/** Cola y detalle de partners: solo quien administra alguna empresa (no editores). */
export default async function PartnersLayout({ children }: { children: React.ReactNode }) {
  await exigirAlcance((a) => a.administraAlguna);
  return children;
}
