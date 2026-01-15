import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, smallint, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * スロットID定義
 * 1: head, 2: body, 3: hands, 4: legs, 5: feet
 */
export const SLOT_IDS = {
  head: 1,
  body: 2,
  hands: 3,
  legs: 4,
  feet: 5,
} as const;

/**
 * ミラプリデータテーブル
 * キャラクターごとの装備情報を保存
 */
export const charactersGlamour = pgTable(
  'characters_glamour',
  {
    /** 主キー（UUID自動生成） */
    id: uuid('id').primaryKey().defaultRandom(),
    /** LodestoneキャラクターID */
    characterId: varchar('character_id', { length: 20 }).notNull(),
    /** 部位ID（1:head, 2:body, 3:hands, 4:legs, 5:feet） */
    slotId: smallint('slot_id').notNull(),
    /** Lodestone装備ID（URLは /lodestone/playguide/db/item/{itemId}/ で再構築） */
    itemId: varchar('item_id', { length: 20 }).notNull(),
    /** 取得日時 */
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // インデックス
    index('idx_character_id').on(table.characterId),
    index('idx_slot_id').on(table.slotId),
    index('idx_fetched_at').on(table.fetchedAt),
    // CHECK制約：1-5のみ許可
    check('slot_id_check', sql`${table.slotId} BETWEEN 1 AND 5`),
  ],
);

/** SELECT時の型 */
export type CharacterGlamour = typeof charactersGlamour.$inferSelect;

/** INSERT時の型 */
export type NewCharacterGlamour = typeof charactersGlamour.$inferInsert;

/**
 * クロール進捗管理テーブル
 * クローラーごとの進捗状況を保存
 */
export const crawlProgress = pgTable('crawl_progress', {
  /** 主キー（UUID自動生成） */
  id: uuid('id').primaryKey().defaultRandom(),
  /** クローラー名（一意） */
  crawlerName: varchar('crawler_name', { length: 50 }).notNull().unique(),
  /** 最後に完了したキーインデックス（-1で未開始） */
  lastCompletedIndex: integer('last_completed_index').notNull().default(-1),
  /** 総キー数 */
  totalKeys: integer('total_keys').notNull(),
  /** 処理済みキャラクター数 */
  processedCharacters: integer('processed_characters').notNull().default(0),
  /** 更新日時 */
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** CrawlProgress SELECT時の型 */
export type CrawlProgress = typeof crawlProgress.$inferSelect;

/** CrawlProgress INSERT時の型 */
export type NewCrawlProgress = typeof crawlProgress.$inferInsert;
