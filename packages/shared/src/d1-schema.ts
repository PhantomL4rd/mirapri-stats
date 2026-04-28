import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
    /** Lodestone アイコン画像URL */
    iconUrl: text('icon_url'),
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
 * ペア組み合わせテーブル（双方向対応）
 * 各アイテムの組み合わせ上位10件を保存（バージョン管理対象）
 * base_item_id を主語として、partner_item_id との組み合わせを保存
 */
export const pairs = sqliteTable(
  'pairs',
  {
    /** バージョン識別子 */
    version: text('version').notNull(),
    /** 主語側スロット (1:head, 2:body, 3:hands, 4:legs, 5:feet) */
    baseSlotId: integer('base_slot_id').notNull(),
    /** 相方側スロット (1:head, 2:body, 3:hands, 4:legs, 5:feet) */
    partnerSlotId: integer('partner_slot_id').notNull(),
    /** 主語アイテム */
    baseItemId: text('base_item_id').notNull(),
    /** 相方アイテム */
    partnerItemId: text('partner_item_id').notNull(),
    /** ペア出現回数 */
    pairCount: integer('pair_count').notNull(),
    /** ランク（1〜、pair_count DESC順） */
    rank: integer('rank').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.version, table.baseSlotId, table.partnerSlotId, table.baseItemId, table.rank],
    }),
    index('idx_pairs_lookup').on(
      table.version,
      table.baseSlotId,
      table.partnerSlotId,
      table.baseItemId,
    ),
  ],
);

/** SELECT時の型 */
export type Pairs = typeof pairs.$inferSelect;

/** INSERT時の型 */
export type NewPairs = typeof pairs.$inferInsert;

/**
 * Sync バージョン管理テーブル
 * 各バージョンの freshness（データ期間）を保存
 */
export const syncVersions = sqliteTable('sync_versions', {
  /** バージョン識別子（UUID） */
  version: text('version').primaryKey(),
  /** データ取得期間（開始）ISO8601 */
  dataFrom: text('data_from'),
  /** データ取得期間（終了）ISO8601 */
  dataTo: text('data_to'),
  /** Sync完了日時 ISO8601 */
  syncedAt: text('synced_at').notNull(),
});

/** SELECT時の型 */
export type SyncVersion = typeof syncVersions.$inferSelect;

/** INSERT時の型 */
export type NewSyncVersion = typeof syncVersions.$inferInsert;

/**
 * 使用数トレンドテーブル（蓄積型）
 * バージョン間の使用数差分サマリー
 * version rotation (cleanupOldVersions) の対象外
 */
export const usageTrends = sqliteTable(
  'usage_trends',
  {
    /** 新バージョン識別子 */
    newVersion: text('new_version').notNull(),
    /** 前バージョン識別子 */
    prevVersion: text('prev_version').notNull(),
    /** スナップショット日時 */
    snapshotDate: text('snapshot_date').notNull(),
    /** 部位ID */
    slotId: integer('slot_id').notNull(),
    /** アイテムID */
    itemId: text('item_id').notNull(),
    /** 新バージョンでの使用回数 */
    usageCountNew: integer('usage_count_new').notNull(),
    /** 前バージョンでの使用回数 */
    usageCountPrev: integer('usage_count_prev').notNull(),
    /** 使用数差分 (new - prev) */
    usageDelta: integer('usage_delta').notNull(),
    /** 新バージョンでの順位 */
    rankNew: integer('rank_new').notNull(),
    /** 前バージョンでの順位（NULL = 前回未登場） */
    rankPrev: integer('rank_prev'),
    /** 順位変動 (prev - new、正 = 上昇、NULL = 前回未登場) */
    rankDelta: integer('rank_delta'),
  },
  (table) => [
    primaryKey({ columns: [table.newVersion, table.slotId, table.itemId] }),
    index('idx_usage_trends_slot_delta').on(table.newVersion, table.slotId, table.usageDelta),
    index('idx_usage_trends_item').on(table.itemId, table.snapshotDate),
  ],
);

/** SELECT時の型 */
export type UsageTrend = typeof usageTrends.$inferSelect;

/** INSERT時の型 */
export type NewUsageTrend = typeof usageTrends.$inferInsert;

/**
 * カララント（染色）マスタ
 * PK は JP色名（Lodestone HTML から scraper が取得する公式日本語名）。
 * dye_id は colorant-picker 内部ID（dye_NNN）で traceability のみ。
 */
export const stains = sqliteTable('stains', {
  /** カララントJP名（主キー、Lodestone "カララント:{name}" と完全一致） */
  name: text('name').primaryKey(),
  /** colorant-picker 内部ID（dye_NNN、traceability 用） */
  dyeId: text('dye_id'),
  /** カテゴリ（white/red/.../rare 等） */
  category: text('category'),
  /** RGB赤 */
  r: integer('r').notNull(),
  /** RGB緑 */
  g: integer('g').notNull(),
  /** RGB青 */
  b: integer('b').notNull(),
});

/** SELECT時の型 */
export type Stain = typeof stains.$inferSelect;

/** INSERT時の型 */
export type NewStain = typeof stains.$inferInsert;

/**
 * 装備の染色組み合わせ集計（バージョン管理対象）
 * stain1_id / stain2_id は NULL = 未染色
 * 同一 (version, item_id) 内で combo_count DESC 順に rank を採番
 */
export const itemDyeCombos = sqliteTable(
  'item_dye_combos',
  {
    /** バージョン識別子 */
    version: text('version').notNull(),
    /** 部位ID */
    slotId: integer('slot_id').notNull(),
    /** 装備ID */
    itemId: text('item_id').notNull(),
    /** 主染色のJP名（NULL = 未染色、stains.name と JOIN） */
    stain1Name: text('stain1_name'),
    /** 副染色のJP名（NULL = 未染色、stains.name と JOIN） */
    stain2Name: text('stain2_name'),
    /** 組み合わせ出現回数 */
    comboCount: integer('combo_count').notNull(),
    /** ランク（1〜、combo_count DESC順） */
    rank: integer('rank').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.version, table.slotId, table.itemId, table.rank] }),
    index('idx_dye_combos_lookup').on(table.version, table.itemId),
  ],
);

/** SELECT時の型 */
export type ItemDyeCombo = typeof itemDyeCombos.$inferSelect;

/** INSERT時の型 */
export type NewItemDyeCombo = typeof itemDyeCombos.$inferInsert;
