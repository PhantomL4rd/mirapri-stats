-- usage_trends: バージョン間の使用数差分サマリー（蓄積型、version rotation 対象外）
CREATE TABLE IF NOT EXISTS usage_trends (
  new_version TEXT NOT NULL,
  prev_version TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  slot_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  usage_count_new INTEGER NOT NULL,
  usage_count_prev INTEGER NOT NULL,
  usage_delta INTEGER NOT NULL,
  rank_new INTEGER NOT NULL,
  rank_prev INTEGER,
  rank_delta INTEGER,
  PRIMARY KEY (new_version, slot_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_usage_trends_slot_delta
  ON usage_trends(new_version, slot_id, usage_delta DESC);

CREATE INDEX IF NOT EXISTS idx_usage_trends_item
  ON usage_trends(item_id, snapshot_date);
