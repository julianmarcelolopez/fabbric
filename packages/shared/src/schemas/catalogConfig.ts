import { z } from "zod";
import { slugSchema } from "./category.js";

export const catalogConfigSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  // URL pública de la tienda (/store/<slug>) — único global
  slug: slugSchema,
  storeName: z.string().min(1),
  logoUrl: z.string().url().nullable(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  theme: z.string(),
  businessDescription: z.string().nullable(),
  bannerUrl: z.string().url().nullable(),
  whatsapp: z.string().nullable(),
  instagram: z.string().nullable(),
  // T21/08 — mismo patrón que instagram
  facebook: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  businessHours: z.string().nullable(),
  // T21/08 — [] = autogenerado desde zonas de envío (StoreLayout.tsx). 2+ =
  // carrusel con flechas; 1 = mensaje fijo sin flechas.
  announcementTexts: z.array(z.string()),
  // T21/04 — null = mid-banner del home sin overlay ni texto (T20/03)
  midBannerTitle: z.string().nullable(),
  midBannerSubtitle: z.string().nullable(),
  // T21/06 — null = la ficha de producto sigue derivando a WhatsApp (T20/06)
  returnPolicy: z.string().nullable(),
  // Imagen de fondo del hero del home; null = fondo navy sólido (T20/03).
  // Se setea vía su propio endpoint multipart, igual que logoUrl/bannerUrl.
  heroImageUrl: z.string().url().nullable(),
  // Mercado Pago propia de la org (T16): acá representan lo que devuelve el GET
  // admin — el valor YA enmascarado (ej. "····3421"), nunca el token real ni
  // cifrado. Ver updateMpIntegrationSchema para cómo se setean.
  mpAccessToken: z.string().nullable(),
  mpWebhookSecret: z.string().nullable(),
  lowStockThreshold: z.number().int().min(0),
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// T4 solo expone editar el umbral; el update completo de la config llega en T5
export const updateLowStockThresholdSchema = z.object({
  lowStockThreshold: z.number().int().min(0),
});

// Update completo de la identidad de la tienda (T5). El logo va por multipart aparte.
// bannerUrl (T14) y heroImageUrl tampoco entran acá por el mismo motivo: se
// setean solo vía su propio endpoint multipart, nunca como URL arbitraria por este PATCH.
export const updateCatalogConfigSchema = z
  .object({
    storeName: z.string().min(1),
    slug: slugSchema,
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "color en formato #rrggbb"),
    theme: z.string().min(1),
    businessDescription: z.string().max(2000).nullable(),
    // Perfil de tienda (T14) — para wa.me/<numero>; la limpieza de formato es del frontend
    whatsapp: z.string().min(6).max(20).nullable(),
    instagram: z.string().min(1).max(100).nullable(),
    // T21/08 — mismo patrón que instagram
    facebook: z.string().min(1).max(100).nullable(),
    email: z.string().email().nullable(),
    address: z.string().min(1).max(200).nullable(),
    businessHours: z.string().min(1).max(200).nullable(),
    // T21/08 — hasta 3 mensajes (decisión del usuario), 120 c/u: lo que entra
    // bien en una línea del announcement bar en mobile sin romper el layout.
    announcementTexts: z.array(z.string().min(1).max(120)).max(3),
    // T21/04 — límites del usuario (60 título / 120 subtítulo)
    midBannerTitle: z.string().max(60).nullable(),
    midBannerSubtitle: z.string().max(120).nullable(),
    // T21/06 — mismo límite que businessDescription (texto libre más largo)
    returnPolicy: z.string().max(2000).nullable(),
    active: z.boolean(),
  })
  .partial();

// Conectar/desconectar Mercado Pago propia (T16) — endpoint aparte del PATCH
// general, mismo motivo que logoUrl/bannerUrl: nunca se mezclan con datos de
// texto libre. Se guardan los dos juntos (o se limpian los dos juntos con
// "Desconectar") — no tiene sentido tener token sin secret o viceversa.
export const updateMpIntegrationSchema = z.object({
  mpAccessToken: z.string().min(1).max(300).nullable(),
  mpWebhookSecret: z.string().min(1).max(300).nullable(),
});

export type CatalogConfig = z.infer<typeof catalogConfigSchema>;
export type UpdateLowStockThresholdInput = z.infer<typeof updateLowStockThresholdSchema>;
export type UpdateCatalogConfigInput = z.infer<typeof updateCatalogConfigSchema>;
export type UpdateMpIntegrationInput = z.infer<typeof updateMpIntegrationSchema>;
