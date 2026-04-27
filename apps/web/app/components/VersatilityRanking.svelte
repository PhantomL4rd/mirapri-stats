<script lang="ts">
  import { Link } from '@inertiajs/svelte';
  import type { VersatilityItem } from '$lib/queries';
  import { versionedHref } from '$lib/utils';

  interface Props {
    items: VersatilityItem[];
    version?: string;
  }

  let { items, version }: Props = $props();

  function getLodestoneUrl(itemId: string): string {
    return `https://jp.finalfantasyxiv.com/lodestone/playguide/db/item/${itemId}/`;
  }
</script>

<div class="space-y-2">
  {#if items.length === 0}
    <div class="text-center py-12">
      <p class="text-muted-foreground text-pretty">ランキングデータがまだありません</p>
      <Link href="/" class="mt-3 inline-block text-sm text-accent-foreground underline hover:text-foreground">
        トレンドを見る
      </Link>
    </div>
  {:else}
    <ol class="space-y-2">
      {#each items as item, index (item.itemId)}
        <li class="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm hover:bg-muted/30 transition-colors">
          <span class="flex size-8 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent-foreground tabular-nums">
            {index + 1}
          </span>
          {#if item.iconUrl}
            <img src={item.iconUrl} alt="" width="40" height="40" class="rounded" loading="lazy" />
          {/if}
          <Link
            href={versionedHref(`/item/${item.itemId}`, version)}
            class="flex-1 font-medium text-card-foreground hover:underline"
          >
            {item.itemName}
          </Link>
          <a
            href={getLodestoneUrl(item.itemId)}
            target="_blank"
            rel="noopener noreferrer"
            class="eorzeadb_link text-xs text-muted-foreground hover:text-foreground"
          >
            Lodestone
          </a>
        </li>
      {/each}
    </ol>
  {/if}
</div>
