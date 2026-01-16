import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * メタデータテーブル
 * active_version など、システム設定を key-value で管理
 */
export const meta = sqliteTable('meta', {
  /** 設定キー */
  key: text('key').primaryKey(),
  /** 設定値 */
  value: text('value').notNull(),
});

/** SELECT時の型 */
export type Meta = typeof meta.$inferSelect;

/** INSERT時の型 */
export type NewMeta = typeof meta.$inferInsert;

/**
 * アイテムマスタテーブル
 * Lodestone から取得した装備情報
 * バージョン管理対象外（UPSERT で更新）
 */
export const items = sqliteTable(
  'items',
  {
    /** Lodestone 装備ID（主キー） */
    id: text('id').primaryKey(),
    /** アイテム名 */
    name: text('name').notNull(),
    /** 部位ID（1:head, 2:body, 3:hands, 4:legs, 5:feet） */
    slotId: integer('slot_id').notNull(),
  },
  (table) => [index('idx_items_slot_id').on(table.slotId)],
);

/** SELECT時の型 */
export type Item = typeof items.$inferSelect;

/** INSERT時の型 */
export type NewItem = typeof items.$inferInsert;

/**
 * 使用回数テーブル
 * 各アイテムの使用回数を集計（バージョン管理対象）
 */
export const usage = sqliteTable(
  'usage',
  {
    /** バージョン識別子 */
    version: text('version').notNull(),
    /** 部位ID */
    slotId: integer('slot_id').notNull(),
    /** アイテムID */
    itemId: text('item_id').notNull(),
    /** 使用回数 */
    usageCount: integer('usage_count').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.version, table.slotId, table.itemId] }),
    index('idx_usage_version_slot').on(table.version, table.slotId),
  ],
);

/** SELECT時の型 */
export type Usage = typeof usage.$inferSelect;

/** INSERT時の型 */
export type NewUsage = typeof usage.$inferInsert;

/**
 * ペア組み合わせテーブル
 * 各アイテムの組み合わせ上位10件を保存（バージョン管理対象）
 */
export const pairs = sqliteTable(
  'pairs',
  {
    /** バージョン識別子 */
    version: text('version').notNull(),
    /** ペア種類（'head-body', 'body-hands', 'body-legs', 'legs-feet'） */
    slotPair: text('slot_pair').notNull(),
    /** アイテムA（小さい slot_id 側） */
    itemIdA: text('item_id_a').notNull(),
    /** アイテムB（大きい slot_id 側） */
    itemIdB: text('item_id_b').notNull(),
    /** ペア出現回数 */
    pairCount: integer('pair_count').notNull(),
    /** ランク（1-10） */
    rank: integer('rank').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.version, table.slotPair, table.itemIdA, table.rank] }),
    index('idx_pairs_version_pair_a').on(table.version, table.slotPair, table.itemIdA),
  ],
);

/** SELECT時の型 */
export type Pairs = typeof pairs.$inferSelect;

/** INSERT時の型 */
export type NewPairs = typeof pairs.$inferInsert;
