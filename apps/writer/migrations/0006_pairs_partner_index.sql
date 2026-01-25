-- pairs テーブルの partner_item_id にインデックス追加
-- getSimilarItems クエリの JOIN 高速化のため

CREATE INDEX idx_pairs_partner ON pairs(version, partner_item_id);
