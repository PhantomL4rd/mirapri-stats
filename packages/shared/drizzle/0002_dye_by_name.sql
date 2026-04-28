-- 染色を「JP色名キー」に再設計（手書きマイグレーション、参考用）
-- 通常運用は `pnpm db:push` で対話的に rename 検出 → 適用すれば同等。
-- 直接適用したい場合のみこの SQL を psql で流す。

ALTER TABLE "characters_glamour" RENAME COLUMN "stain1_id" TO "stain1_name";
--> statement-breakpoint
ALTER TABLE "characters_glamour" RENAME COLUMN "stain2_id" TO "stain2_name";
--> statement-breakpoint
ALTER TABLE "characters_glamour" ALTER COLUMN "stain1_name" TYPE varchar(100);
--> statement-breakpoint
ALTER TABLE "characters_glamour" ALTER COLUMN "stain2_name" TYPE varchar(100);
--> statement-breakpoint
DROP TABLE IF EXISTS "stains_cache";
