-- 0011 で追加した item_dye_combos の CHECK 制約をロールバック
-- k=3 強制は writer route の validation のみで行う方針に変更
-- 既存データを保持して再作成（INSERT FROM old）

CREATE TABLE item_dye_combos_new (
  version TEXT NOT NULL,
  slot_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  stain1_name TEXT,
  stain2_name TEXT,
  combo_count INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  PRIMARY KEY (version, slot_id, item_id, rank)
);

INSERT INTO item_dye_combos_new
  SELECT version, slot_id, item_id, stain1_name, stain2_name, combo_count, rank
  FROM item_dye_combos;

DROP TABLE item_dye_combos;
ALTER TABLE item_dye_combos_new RENAME TO item_dye_combos;

CREATE INDEX idx_dye_combos_lookup ON item_dye_combos(version, item_id);
