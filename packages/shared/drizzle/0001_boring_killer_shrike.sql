CREATE TABLE "stains_cache" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "characters_glamour" ADD COLUMN "stain1_id" varchar(20);--> statement-breakpoint
ALTER TABLE "characters_glamour" ADD COLUMN "stain2_id" varchar(20);