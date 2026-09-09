import { exigirAlcance } from "@/lib/guardas";

/** Usuarios: solo quien administra alguna empresa (no editores). */
export default async function UsuariosLayout({ children }: { children: React.ReactNode }) {
  await exigirAlcance((a) => a.administraAlguna);
  return children;
}
