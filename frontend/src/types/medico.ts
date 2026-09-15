/** Espejo de app/schemas/medico.py: la acreditación vista por el propio médico. */

import type { EstadoValidacion } from "@/types/auth";

export interface AcreditacionOut {
  /** La cédula nunca viaja completa: solo lo justo para reconocerla. */
  cedula_enmascarada: string;
  especialidad: string | null;
  institucion: string | null;
  estado: EstadoValidacion;
  motivo_rechazo: string | null;
  validado_en: string | null;
  /** Desde cuándo espera: es lo primero que pregunta quien lleva días en revisión. */
  solicitada_en: string;
  /** Qué puede hacer, decidido en el backend y no adivinado por la pantalla. */
  puede_editar_cedula: boolean;
  puede_reenviar: boolean;
}
