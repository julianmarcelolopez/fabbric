CREATE TYPE "public"."afip_ambiente" AS ENUM('homologacion', 'produccion');--> statement-breakpoint
ALTER TABLE "catalog_configs" ADD COLUMN "afip_cuit" text;--> statement-breakpoint
ALTER TABLE "catalog_configs" ADD COLUMN "afip_punto_venta" integer;--> statement-breakpoint
ALTER TABLE "catalog_configs" ADD COLUMN "afip_ambiente" "afip_ambiente";--> statement-breakpoint
ALTER TABLE "catalog_configs" ADD COLUMN "afip_certificado" text;--> statement-breakpoint
ALTER TABLE "catalog_configs" ADD COLUMN "afip_clave_privada" text;--> statement-breakpoint
ALTER TABLE "catalog_configs" ADD COLUMN "afip_access_token" text;