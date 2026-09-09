import { exigirAlcance } from "@/lib/guardas";

/** Bitacora: quien administra alguna empresa (no editores). */
export default async function BitacoraLayout({ children }: { children: React.ReactNode }) {
  await exigirAlcance((a) => a.administraAlguna);
  return children;
}
