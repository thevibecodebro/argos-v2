ALTER TABLE "zoom_integrations" ADD COLUMN "webhook_id" text;--> statement-breakpoint
ALTER TABLE "training_modules" ADD CONSTRAINT "training_modules_org_order_unique" UNIQUE("org_id","order_index");