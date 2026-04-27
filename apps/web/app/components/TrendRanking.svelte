<script lang="ts">
  import { Link } from '@inertiajs/svelte';
  import type { TrendItem } from '$lib/queries';
  import { versionedHref } from '$lib/utils';

  interface Props {
    items: TrendItem[];
    version?: string;
  }

  let { items, version }: Props = $props();

  function getLodestoneUrl(itemId: string): string {
    return `https://jp.finalfantasyxiv.com/lodestone/playguide/db/item/${itemId}/`;
  }

  function formatRankDelta(rankDelta: number | null): string | null {
    if (rankDelta === null) return null;
    if (rankDelta > 0) return `↑${rankDelta}`;
    if (rankDelta < 0) return `↓${Math.abs(rankDelta)}`;
    return '→';
  }
</script>

<div class="space-y-2">
  {#if items.length === 0}
    <div class="text-center py-12">
      <p class="text-muted-foreground text-pretty">トレンドデータがまだありません</p>
      <Link href="/ranking" class="mt-3 inline-block text-sm text-accent-foreground underline hover:text-foreground">
        人気ランキングを見る
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
          <div class="flex-1 min-w-0">
            <Link
              href={versionedHref(`/item/${item.itemId}`, version)}
              class="block font-medium text-card-foreground hover:underline truncate"
            >
              {item.itemName}
            </Link>
            <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {#if item.rankPrev === null}
                <span class="inline-flex items-center rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent-foreground">
                  NEW
                </span>
              {:else if formatRankDelta(item.rankDelta)}
                <span
                  class={item.rankDelta !== null && item.rankDelta > 0
                    ? 'text-rank-up font-medium'
                    : item.rankDelta !== null && item.rankDelta < 0
                      ? 'text-rank-down font-medium'
                      : 'text-muted-foreground'}
                >
                  {formatRankDelta(item.rankDelta)}
                </span>
              {/if}
            </div>
          </div>
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
