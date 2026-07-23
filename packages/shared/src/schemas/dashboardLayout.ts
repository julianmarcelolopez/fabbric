import { z } from "zod";

// Layout del dashboard por USUARIO (patrón bordart usuarios.dashboard_layout):
// dos zonas, cada una con orden + ocultas. Los ids son strings libres —
// FORWARD-COMPATIBLE: el server no valida contra el set de tarjetas; el
// cliente ignora ids desconocidos y agrega las tarjetas nuevas al final.

export const zoneLayoutSchema = z.object({
  orden: z.array(z.string().min(1).max(60)).max(50),
  ocultas: z.array(z.string().min(1).max(60)).max(50),
});

export const dashboardLayoutSchema = z.object({
  stats: zoneLayoutSchema,
  paneles: zoneLayoutSchema,
});

export type ZoneLayout = z.infer<typeof zoneLayoutSchema>;
export type DashboardLayout = z.infer<typeof dashboardLayoutSchema>;
