CREATE TYPE "public"."invoice_estado" AS ENUM('pendiente', 'emitida', 'error');--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"tipo" text DEFAULT 'C' NOT NULL,
	"numero" integer,
	"cae" text,
	"cae_vencimiento" text,
	"estado" "invoice_estado" DEFAULT 'pendiente' NOT NULL,
	"cliente_nombre" text,
	"cliente_email" text,
	"cliente_dni" text,
	"mensaje_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_org_idx" ON "invoices" USING btree ("org_id");