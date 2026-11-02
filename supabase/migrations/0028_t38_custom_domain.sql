ALTER TABLE "catalog_configs" ADD COLUMN "custom_domain" text;--> statement-breakpoint
ALTER TABLE "catalog_configs" ADD CONSTRAINT "catalog_configs_custom_domain_unique" UNIQUE("custom_domain");