import Link from "next/link";
import { redirect } from "next/navigation";

import { alcanceDe, navAdmin } from "@/lib/matriz-roles";
import { leerUsuarioActual } from "@/lib/sesion";

/** Guarda de layout del area admin + sub-navegacion segun alcance (ADR-0004). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await leerUsuarioActual();
  if (!u) redirect("/login");
  if (!alcanceDe(u).esAdmin) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <nav className="flex gap-4 border-b text-sm" aria-label="Administracion">
        {navAdmin(u).map((n) => (
          <Link key={n.href} href={n.href} className="-mb-px border-b-2 border-transparent py-2 text-muted-foreground hover:border-primary hover:text-foreground">
            {n.texto}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
