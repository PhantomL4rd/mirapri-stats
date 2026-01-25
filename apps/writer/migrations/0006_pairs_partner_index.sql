-- pairs テーブルのクエリ高速化インデックス追加

-- getSimilarItems: JOIN で partner_item_id を使用
CREATE INDEX idx_pairs_partner ON pairs(version, partner_item_id);

-- getPartnerItems: WHERE で base_item_id を使用
CREATE INDEX idx_pairs_base ON pairs(version, base_item_id);
