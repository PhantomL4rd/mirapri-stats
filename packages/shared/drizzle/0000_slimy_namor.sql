CREATE TABLE "characters_glamour" (
	"character_id" varchar(20) NOT NULL,
	"slot_id" smallint NOT NULL,
	"item_id" varchar(20) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "characters_glamour_character_id_slot_id_pk" PRIMARY KEY("character_id","slot_id"),
	CONSTRAINT "slot_id_check" CHECK ("characters_glamour"."slot_id" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "crawl_progress" (
	"crawler_name" varchar(100) PRIMARY KEY NOT NULL,
	"progress" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items_cache" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slot_id" smallint NOT NULL,
	"icon_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_cache_slot_id_check" CHECK ("items_cache"."slot_id" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE INDEX "idx_slot_character_item" ON "characters_glamour" USING btree ("slot_id","character_id","item_id");--> statement-breakpoint
CREATE INDEX "idx_items_cache_slot_id" ON "items_cache" USING btree ("slot_id");