<script lang="ts">
  import BaseLayout from '../layouts/BaseLayout.svelte';
  import SlotTabs from '../components/SlotTabs.svelte';
  import VersatilityRanking from '../components/VersatilityRanking.svelte';
  import type { PageProps } from '../pages.gen';

  let {
    items,
    freshness,
    currentSlot,
    versions,
    currentVersion,
    linkVersion,
  }: PageProps<'Ranking'> = $props();
</script>

<BaseLayout
  title="人気ランキング | ミラプリインサイト"
  {versions}
  {currentVersion}
  {freshness}
>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-balance">人気ランキング</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        多くの装備とベストマッチになっている人気アイテム
      </p>
    </div>

    <SlotTabs {currentSlot} basePath="/ranking" version={linkVersion} />

    <VersatilityRanking {items} version={linkVersion} />
  </div>
</BaseLayout>
