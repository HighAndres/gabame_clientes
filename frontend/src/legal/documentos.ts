/**
 * Textos legales que se muestran en modales. Son DATO: cuando el cliente entregue los
 * definitivos se sustituye solo este archivo. Markdown sin HTML.
 *
 * # Pendiente — el cliente no ha entregado el aviso de privacidad ni los terminos. Estos textos
 * son provisionales y lo dicen en su primera linea; no son asesoria legal.
 */

export type DocumentoLegal = "aviso-privacidad" | "aviso-privacidad-simplificado" | "terminos";

export interface TextoLegal {
  titulo: string;
  actualizado: string; // fecha visible al pie del modal, ya en texto
  provisional: boolean;
  contenido: string; // markdown
}

export const DOCUMENTOS_LEGALES: Record<DocumentoLegal, TextoLegal> = {
  "aviso-privacidad": {
    titulo: "Aviso de privacidad",
    actualizado: "9 de septiembre de 2026",
    provisional: true,
    contenido: `**Texto provisional.** Este aviso se sustituirá por el aviso de privacidad integral que
entregue el grupo GABAME. Hasta entonces describe, de forma general, cómo se tratan los datos en la
Cuenta GABAME.

## Responsable

GABAME Human Health y las empresas del grupo (Medinter, Ordan y A7 Pharmaceutical Distributor) son
responsables del tratamiento de los datos personales que capturas en esta cuenta.

## Datos que se recaban

- Datos de identificación y contacto: nombre, apellidos, correo electrónico y teléfono.
- Profesionales de la salud: cédula profesional, especialidad e institución, únicamente para acreditar
  tu perfil. La cédula no se muestra públicamente.
- Empresas y distribuidores: razón social, RFC y los documentos que cargues para tu alta comercial.
- Desde qué sitio o tienda del grupo llegaste a la cuenta. No se registra tu dirección IP, tu navegador
  ni la huella de tu dispositivo.

## Para qué se usan

- Crear y administrar tu cuenta y permitirte entrar a los sitios y tiendas del grupo.
- Validar la acreditación de profesionales de la salud y dar acceso al contenido dirigido a ellos.
- Revisar y aprobar la relación comercial de empresas y distribuidores con cada empresa del grupo.
- Enviarte avisos relacionados con tu cuenta (verificación de correo, cambios de estado, restablecimiento
  de contraseña).

## Lo que no se guarda aquí

Esta cuenta no almacena recetas, diagnósticos, historial de medicación ni ningún otro dato clínico.

## Tus derechos

Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición (derechos ARCO), así como
revocar tu consentimiento, escribiendo al contacto que el grupo publicará en el aviso definitivo.

## Cambios a este aviso

Cualquier cambio se publicará en esta misma cuenta.`,
  },
  "aviso-privacidad-simplificado": {
    titulo: "Aviso de privacidad simplificado",
    actualizado: "9 de septiembre de 2026",
    provisional: true,
    contenido: `**Texto provisional.** GABAME Human Health y las empresas del grupo usarán tus datos para crear y
administrar tu Cuenta GABAME, validar tu perfil cuando aplique y enviarte avisos sobre tu cuenta.

No guardamos información clínica. Puedes consultar el aviso de privacidad integral desde el pie de
cualquier pantalla y ejercer tus derechos ARCO en el contacto que ahí se indica.`,
  },
  terminos: {
    titulo: "Términos de uso",
    actualizado: "9 de septiembre de 2026",
    provisional: true,
    contenido: `**Texto provisional.** Los términos de uso de la Cuenta GABAME los entregará el grupo. Mientras tanto:

- La cuenta es personal e intransferible. Eres responsable de mantener tu contraseña en secreto.
- El contenido dirigido a profesionales de la salud es exclusivo para profesionales acreditados y no debe
  compartirse con terceros.
- El grupo puede suspender una cuenta que incumpla estas condiciones.`,
  },
};
