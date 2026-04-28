-- item_dye_combos に k=3 匿名化の CHECK 制約を追加
-- SQLite は ALTER TABLE で CHECK を追加できないため、テーブル再作成

CREATE TABLE item_dye_combos_new (
  version TEXT NOT NULL,
  slot_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  stain1_name TEXT,
  stain2_name TEXT,
  combo_count INTEGER NOT NULL CHECK (combo_count >= 3),
  rank INTEGER NOT NULL,
  PRIMARY KEY (version, slot_id, item_id, rank)
);

INSERT INTO item_dye_combos_new
  SELECT version, slot_id, item_id, stain1_name, stain2_name, combo_count, rank
  FROM item_dye_combos
  WHERE combo_count >= 3;

DROP TABLE item_dye_combos;
ALTER TABLE item_dye_combos_new RENAME TO item_dye_combos;

CREATE INDEX idx_dye_combos_lookup ON item_dye_combos(version, item_id);
