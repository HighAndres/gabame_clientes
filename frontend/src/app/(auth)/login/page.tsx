import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { conservarParams, leerOrigen } from "@/lib/origen";
import { destinoSeguro } from "@/lib/redirect";

type Params = Record<string, string | string[] | undefined>;

function lector(sp: Params) {
  return { get: (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null) };
}

export default function LoginPage({ searchParams }: { searchParams: Params }) {
  const params = lector(searchParams);
  const destino = destinoSeguro(params.get("redirect"));
  const origen = leerOrigen(params);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesion</CardTitle>
        <CardDescription>Entra con tu correo y contrasena.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm
          destino={destino}
          origen={origen}
          enlaceRegistro={`/registro${conservarParams(params)}`}
          enlaceRecuperar="/recuperar"
        />
      </CardContent>
    </Card>
  );
}
