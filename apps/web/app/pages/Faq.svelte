<script lang="ts">
  import BaseLayout from '../layouts/BaseLayout.svelte';
  import { ChevronDown } from 'lucide-svelte';
</script>

<BaseLayout title="よくある質問 | ミラプリインサイト">
  <div class="space-y-8">
    <h1 class="text-2xl font-bold text-balance">よくある質問</h1>

    <section class="space-y-6">
      <h2 class="text-lg font-semibold border-b border-border pb-2">プライバシーについて</h2>

      <div class="space-y-4">
        <details class="group rounded-lg border border-border bg-card">
          <summary class="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-accent">
            自分のキャラが特定されたりしない？
            <ChevronDown class="size-4 text-muted-foreground" />
          </summary>
          <div class="border-t border-border p-4 text-muted-foreground">
            <p class="text-pretty">されません。このサイトでは「3人未満しか使っていない組み合わせは表示しない」というルールを採用しています。</p>
            <p class="mt-2 text-pretty">
              珍しいミラプリほど表示されないので、あなたの個性的なコーディネートが特定されることはありません。
              これは国の統計調査でも使われている方法（k-匿名化）です。
            </p>
          </div>
        </details>

        <details class="group rounded-lg border border-border bg-card">
          <summary class="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-accent">
            キャラクター名やIDは載る？
            <ChevronDown class="size-4 text-muted-foreground" />
          </summary>
          <div class="border-t border-border p-4 text-muted-foreground">
            <p class="text-pretty">載りません。このサイトには個人のキャラクターページは存在しません。</p>
            <p class="mt-2 text-pretty">「このアイテムを何人が使っているか」という数字だけを集計しています。</p>
          </div>
        </details>

        <details class="group rounded-lg border border-border bg-card">
          <summary class="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-accent">
            非公開にしてる情報も見られてる？
            <ChevronDown class="size-4 text-muted-foreground" />
          </summary>
          <div class="border-t border-border p-4 text-muted-foreground">
            <p class="text-pretty">見ていません。使用しているのは<strong class="text-foreground">ログインしなくても誰でも見られるLodestoneの公開情報だけ</strong>です。</p>
            <p class="mt-2 text-pretty">ログインユーザー限定や非公開に設定されている情報には一切アクセスしていません。</p>
          </div>
        </details>

        <details class="group rounded-lg border border-border bg-card">
          <summary class="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-accent">
            自分のキャラを統計から除外したい
            <ChevronDown class="size-4 text-muted-foreground" />
          </summary>
          <div class="border-t border-border p-4 text-muted-foreground">
            <p class="text-pretty">
              Lodestoneのプロフィール欄に <code class="bg-muted px-1 rounded">#opt-out-stats</code> と書いておくと、クロール対象から除外されます。
            </p>
            <p class="mt-2 text-sm text-pretty">（サンプリング方式のため、そもそも収集されていない可能性もあります）</p>
          </div>
        </details>
      </div>
    </section>

    <section class="space-y-6">
      <h2 class="text-lg font-semibold border-b border-border pb-2">データの利用について</h2>

      <div class="space-y-4">
        <details class="group rounded-lg border border-border bg-card">
          <summary class="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-accent">
            勝手にデータを使っていいの？
            <ChevronDown class="size-4 text-muted-foreground" />
          </summary>
          <div class="border-t border-border p-4 text-muted-foreground">
            <p class="mt-2 text-pretty">
              スクエニが公式フォーラムで「Lodestoneで公開されているデータはオープンにしていく」という方針を示しています。
              （<a
                href="https://forum.square-enix.com/ffxiv/threads/10455?p=135343#post135343"
                class="underline hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer">公式フォーラム</a
              >）。
            </p>
            <p class="mt-2 text-pretty">
              街で見かけた素敵なミラプリを「いいな」と思う。それを数えて「今こういうのが人気だよ」とまとめる。
              このサイトがやっていることは、それだけです。
            </p>
          </div>
        </details>

        <details class="group rounded-lg border border-border bg-card">
          <summary class="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-accent">
            サーバーに負荷かけてない？
            <ChevronDown class="size-4 text-muted-foreground" />
          </summary>
          <div class="border-t border-border p-4 text-muted-foreground">
            <p class="text-pretty">サンプリング方式を採用しており、必要最小限のアクセスに抑えています。</p>
          </div>
        </details>
      </div>
    </section>

    <section class="space-y-6">
      <h2 class="text-lg font-semibold border-b border-border pb-2">運営について</h2>

      <div class="space-y-4">
        <details class="group rounded-lg border border-border bg-card">
          <summary class="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-accent">
            このサイトで儲けてるの？
            <ChevronDown class="size-4 text-muted-foreground" />
          </summary>
          <div class="border-t border-border p-4 text-muted-foreground">
            <p class="text-pretty">1円も儲けていません。広告もありません。</p>
            <p class="mt-2 text-pretty">「ミラプリの参考になるサイトがあったらいいな」という思いだけで作っています。運営費は自腹です。</p>
          </div>
        </details>

        <details class="group rounded-lg border border-border bg-card">
          <summary class="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-accent">
            AIの学習に使ってる？
            <ChevronDown class="size-4 text-muted-foreground" />
          </summary>
          <div class="border-t border-border p-4 text-muted-foreground">
            <p class="text-pretty">使っていません。AIや機械学習の訓練には一切使用していません。</p>
            <p class="mt-2 text-pretty">保持しているのは「このアイテムを何人が使っているか」という集計結果のみです。</p>
          </div>
        </details>
      </div>
    </section>
  </div>
</BaseLayout>
