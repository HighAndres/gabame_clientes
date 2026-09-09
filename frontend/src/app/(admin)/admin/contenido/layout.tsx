import { exigirAlcance } from "@/lib/guardas";

/** Contenido Rx: quien edita GABAME (admin o editor). El modulo habilitado lo verifica el backend. */
export default async function ContenidoLayout({ children }: { children: React.ReactNode }) {
  await exigirAlcance((a) => a.editaContenidoRx);
  return children;
}
