<script lang="ts">
  import BaseLayout from '../layouts/BaseLayout.svelte';
  import SlotTabs from '../components/SlotTabs.svelte';
  import TrendRanking from '../components/TrendRanking.svelte';
  import type { PageProps } from '../pages.gen';

  let {
    trendItems,
    freshness,
    currentSlot,
    versions,
    currentVersion,
    linkVersion,
  }: PageProps<'Home'> = $props();
</script>

<BaseLayout
  title="ミラプリインサイト"
  {versions}
  {currentVersion}
  {freshness}
>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-balance">今月の急上昇ミラプリ</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        前回の更新から使用数が伸びたアイテム
      </p>
    </div>

    <SlotTabs {currentSlot} version={linkVersion} />

    <TrendRanking items={trendItems} version={linkVersion} />
  </div>
</BaseLayout>
