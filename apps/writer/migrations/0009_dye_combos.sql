-- stains: カララント（染色）マスタ。dyes.json + scraper キャッシュから UPSERT
CREATE TABLE IF NOT EXISTS stains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  r INTEGER NOT NULL,
  g INTEGER NOT NULL,
  b INTEGER NOT NULL
);

-- item_dye_combos: 装備ごとの染色組み合わせ集計（version 管理対象）
-- stain1_id/stain2_id は NULL = 未染色（pairs と同じく rank を主キー要素に含める）
CREATE TABLE IF NOT EXISTS item_dye_combos (
  version TEXT NOT NULL,
  slot_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  stain1_id TEXT,
  stain2_id TEXT,
  combo_count INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  PRIMARY KEY (version, slot_id, item_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_dye_combos_lookup
  ON item_dye_combos(version, item_id);

-- item_dye_combo_trends: バージョン間差分（蓄積型）
-- PK 内で NULL を扱えないため stain1_id/stain2_id は '' を未染色 sentinel として保存
CREATE TABLE IF NOT EXISTS item_dye_combo_trends (
  new_version TEXT NOT NULL,
  prev_version TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  slot_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  stain1_id TEXT NOT NULL DEFAULT '',
  stain2_id TEXT NOT NULL DEFAULT '',
  combo_count_new INTEGER NOT NULL,
  combo_count_prev INTEGER NOT NULL,
  combo_delta INTEGER NOT NULL,
  rank_new INTEGER NOT NULL,
  rank_prev INTEGER,
  rank_delta INTEGER,
  PRIMARY KEY (new_version, slot_id, item_id, stain1_id, stain2_id)
);

CREATE INDEX IF NOT EXISTS idx_dye_combo_trends_item
  ON item_dye_combo_trends(item_id, snapshot_date);
