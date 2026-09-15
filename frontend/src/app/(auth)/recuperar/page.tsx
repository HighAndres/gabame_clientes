import { RecuperarForm } from "@/components/auth/recuperar-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecuperarPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar contraseña</CardTitle>
        <CardDescription>Te enviamos un enlace al correo de tu cuenta.</CardDescription>
      </CardHeader>
      <CardContent>
        <RecuperarForm />
      </CardContent>
    </Card>
  );
}
