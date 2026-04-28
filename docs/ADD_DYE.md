# カララント追加手順

FFXIV のアップデートで新しいカララント（染色）が追加された時の対応手順。

## 全体像

```
colorant-picker (兄弟リポジトリ)
  ├─ src/lib/translations/ja/dye.json   ← JP色名 (dye_NNN → "色名")
  └─ public/data/dyes.json              ← RGB / category / source（dyes.json として配信）
            ↓
mirapri-stats/apps/sync/data/dye-names-ja.json   ← コピー（同梱）
            ↓
pnpm -F @mirapri/sync dye-master                  ← D1 stains に UPSERT
            ↓
D1 stains (PK = JP色名)
            ↓
web 側で item_dye_combos と JOIN（stain1_name = stains.name）
```

## 前提

- D1 `stains` テーブルの **PK は JP 色名**（Lodestoneの "カララント:◯◯◯" と完全一致する文字列）
- `dye_id`（dye_NNN）は colorant-picker 内部IDで、traceability 目的のみ
- スクレイパは Lodestone HTML から **JP 色名のみ**を抽出して `characters_glamour.stain*_name` に保存

## 手順

### 1. `colorant-picker` 側に新色を追加

兄弟リポジトリ `~/Develop/Hobby/colorant-picker` で：

- `public/data/dyes.json` に新 entry 追加（id, name (英), category, rgb, lodestone, source）
- `src/lib/translations/ja/dye.json` の `names` に `"dye_NNN": "新色のJP名"` を追加
- ビルド & デプロイ（`https://colorant-picker.pl4rd.com/data/dyes.json` が更新されるまで反映）

### 2. mirapri-stats 側へ JP 名ファイルを同期

```bash
cd ~/Develop/Hobby/mirapri-stats
\cp ~/Develop/Hobby/colorant-picker/src/lib/translations/ja/dye.json apps/sync/data/dye-names-ja.json
```

`\cp` はエイリアスを無視して上書きするための prefix（macOS の `cp -i` 対策）。

### 3. テスト実行（同梱JP名の整合確認）

```bash
pnpm -F @mirapri/sync test dye-master-sync
```

- `loadJaNames` が 100件以上の names を返すことを確認
- 失敗したら `apps/sync/data/dye-names-ja.json` の中身を確認

### 4. 色マスタ反映

```bash
pnpm -F @mirapri/sync dye-master
```

実行ログで `dyes.json から N 件のカララントを取得（JP名突合）` の N が新しい総件数になっていれば成功。
JP名が無い `dye_id` は警告ログ `[DyeMaster] JP名がない dye_id: dye_XXX` が出るので、足りなければ手順1に戻る。

### 5. 確認

```bash
cd apps/writer
npx wrangler d1 execute mirapri-stats --remote --command \
  "SELECT name, dye_id, r, g, b FROM stains WHERE name = '新色のJP名'"
```

行が返ればOK。

### 6. コミット

`apps/sync/data/dye-names-ja.json` の差分をコミットしてpush（GitHub Actions の sync.yml が次回実行で自動UPSERTするため、`pnpm dye-master` を再度走らせる必要は無い）。

```bash
git add apps/sync/data/dye-names-ja.json
git commit -m "chore: dye master を最新に更新"
```

## 既存色のJP名が変更になった場合（rename）

`dye-master` は UPSERT のみで DELETE しないため、旧名と新名の**両方が `stains` に残ります**。
その状態で web 表示すると「旧名」と「新名」が別行として並びます。

対応：

```bash
cd apps/writer
# 旧名を確認
npx wrangler d1 execute mirapri-stats --remote --command \
  "SELECT name, dye_id FROM stains WHERE dye_id = 'dye_NNN'"
# 旧名行を削除
npx wrangler d1 execute mirapri-stats --remote --command \
  "DELETE FROM stains WHERE name = '旧JP名'"
```

## ロールバック

万一誤った色を入れた場合：

```bash
cd apps/writer
npx wrangler d1 execute mirapri-stats --remote --command \
  "DELETE FROM stains WHERE name = '誤って入れた色名'"
```

なお `item_dye_combos.stain*_name` は文字列として独立保存されているため、stains の行が消えても集計は残る（web表示で swatch のみ無色になる）。

## 補足: scraper が Lodestone HTML から色名を取れない場合

将来 FFXIV のアップデートで Lodestone HTML 構造が変わり、`<div class="stain"><a>カララント:◯◯◯</a></div>` の形式が崩れた場合：

1. `apps/scraper/src/parsers/character-page.ts` の `extractStains` を新仕様に合わせ修正
2. `apps/scraper/src/parsers/character-page.test.ts` に新仕様HTMLのfixtureを追加
3. デプロイ（GitHub Actions の deploy-scraper.yml）

`stains` マスタの構造変更は不要（JP名さえ Lodestone 表示と一致していればOK）。
