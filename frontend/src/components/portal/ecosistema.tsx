import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion } from "@/lib/sesion";
import type { PiezaOut } from "@/types/admin";

const TIPO: Record<PiezaOut["tipo"], string> = { sitio: "Sitio", tienda: "Tienda", app: "App" };

/**
 * Marcas y tiendas del grupo como ENLACES. Nada mas: esta plataforma no consulta ninguna tienda.
 * Las piezas sin URL (pendientes del cliente o de 0.6) se muestran deshabilitadas.
 */
export async function Ecosistema({ titulo = "El grupo GABAME" }: { titulo?: string }) {
  let piezas: PiezaOut[] = [];
  try {
    piezas = await apiConSesion<PiezaOut[]>("/ecosistema");
  } catch {
    return null;
  }
  if (piezas.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {piezas.map((p) => (
          <Card key={p.producto} className={p.pendiente ? "opacity-60" : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{p.nombre}</CardTitle>
              <CardDescription>
                {TIPO[p.tipo]}
                {p.empresa ? ` · ${NOMBRE_EMPRESA[p.empresa]}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{p.descripcion}</p>
              {p.url ? (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Ir a {p.nombre} ↗
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">Proximamente</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
