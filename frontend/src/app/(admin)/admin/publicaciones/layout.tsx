import { exigirAlcance } from "@/lib/guardas";

/** Publicaciones por espacio: admins y editores, cada uno sobre su empresa. */
export default async function PublicacionesLayout({ children }: { children: React.ReactNode }) {
  await exigirAlcance((a) => a.esAdmin);
  return children;
}
