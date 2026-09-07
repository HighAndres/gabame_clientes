import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function Aviso({
  tipo = "error",
  titulo,
  children,
}: {
  tipo?: "error" | "ok" | "info";
  titulo?: string;
  children: React.ReactNode;
}) {
  const variant = tipo === "error" ? "destructive" : "default";
  return (
    <Alert variant={variant} role={tipo === "error" ? "alert" : "status"} className="mt-4">
      {titulo && <AlertTitle>{titulo}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
