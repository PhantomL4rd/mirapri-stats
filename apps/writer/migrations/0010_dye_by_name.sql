-- 染色マスタ・組み合わせを「JP色名キー」に再設計
-- 旧設計（lodestone item ID キー）のテーブルは破棄して再作成
-- トレンド（順位変動）は機能要件外につき廃止

DROP TABLE IF EXISTS item_dye_combo_trends;
DROP TABLE IF EXISTS item_dye_combos;
DROP TABLE IF EXISTS stains;

-- カララントマスタ：JP色名を主キーに
-- dye_id（colorant-picker内部ID）は traceability のみ
CREATE TABLE stains (
  name TEXT PRIMARY KEY,
  dye_id TEXT,
  category TEXT,
  r INTEGER NOT NULL,
  g INTEGER NOT NULL,
  b INTEGER NOT NULL
);

-- 装備ごとの染色組み合わせ集計（k=3 匿名化済の全件を保存）
-- stain1_name / stain2_name は NULL = 未染色、JP名で stains.name と JOIN
-- rank は内部的な PK 一意化用（UI 非表示）
CREATE TABLE item_dye_combos (
  version TEXT NOT NULL,
  slot_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  stain1_name TEXT,
  stain2_name TEXT,
  combo_count INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  PRIMARY KEY (version, slot_id, item_id, rank)
);

CREATE INDEX idx_dye_combos_lookup ON item_dye_combos(version, item_id);
