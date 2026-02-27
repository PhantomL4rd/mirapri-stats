<script lang="ts">
  import { ChevronDown } from 'lucide-svelte';

  interface PartnerItem {
    itemId: string;
    itemName: string;
    slotId: number;
    pairCount: number;
    iconUrl: string | null;
  }

  interface Props {
    items: PartnerItem[];
    topCount?: number;
    variant?: 'card' | 'bordered';
  }

  let { items, topCount = 5, variant = 'card' }: Props = $props();
  let showAll = $state(false);

  const topItems = $derived(items.slice(0, topCount));
  const restItems = $derived(items.slice(topCount));
  const hasMore = $derived(restItems.length > 0);

  function getLodestoneUrl(itemId: string): string {
    return `https://jp.finalfantasyxiv.com/lodestone/playguide/db/item/${itemId}/`;
  }
</script>

{#snippet itemRow(item: PartnerItem, isCard: boolean)}
  {#if isCard}
    <li class="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
      {#if item.iconUrl}
        <img src={item.iconUrl} alt="" width="32" height="32" class="rounded" loading="lazy" />
      {/if}
      <a
        href={`/item/${item.itemId}`}
        class="flex-1 font-medium text-card-foreground hover:underline inline-flex items-center gap-1"
      >
        {item.itemName}
      </a>
      <a
        href={getLodestoneUrl(item.itemId)}
        target="_blank"
        rel="noopener noreferrer"
        class="eorzeadb_link text-xs text-muted-foreground hover:text-foreground"
      >
        Lodestone
      </a>
    </li>
  {:else}
    <li class="flex items-center gap-3 border-b border-border last:border-b-0 p-3">
      {#if item.iconUrl}
        <img src={item.iconUrl} alt="" width="32" height="32" class="rounded" loading="lazy" />
      {/if}
      <a
        href={`/item/${item.itemId}`}
        class="flex-1 font-medium text-card-foreground hover:underline inline-flex items-center gap-1"
      >
        {item.itemName}
      </a>
      <a
        href={getLodestoneUrl(item.itemId)}
        target="_blank"
        rel="noopener noreferrer"
        class="eorzeadb_link text-xs text-muted-foreground hover:text-foreground"
      >
        Lodestone
      </a>
    </li>
  {/if}
{/snippet}

{#if variant === 'card'}
  <div class="space-y-2">
    <ul class="space-y-2">
      {#each topItems as item (item.itemId)}
        {@render itemRow(item, true)}
      {/each}
    </ul>
  </div>

  {#if hasMore}
    {#if showAll}
      <ul class="mt-2 space-y-2">
        {#each restItems as item (item.itemId)}
          {@render itemRow(item, true)}
        {/each}
      </ul>
    {:else}
      <button
        onclick={() => showAll = true}
        class="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <span>もっと見る（残り {restItems.length} 件）</span>
        <ChevronDown class="size-4" />
      </button>
    {/if}
  {/if}
{:else}
  <div>
    <ul class="border-t border-border">
      {#each topItems as item (item.itemId)}
        {@render itemRow(item, false)}
      {/each}
    </ul>
  </div>

  {#if hasMore}
    {#if showAll}
      <ul>
        {#each restItems as item (item.itemId)}
          {@render itemRow(item, false)}
        {/each}
      </ul>
    {:else}
      <button
        onclick={() => showAll = true}
        class="flex w-full items-center justify-center gap-1 p-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground border-t border-border"
      >
        <span>もっと見る（残り {restItems.length} 件）</span>
        <ChevronDown class="size-4" />
      </button>
    {/if}
  {/if}
{/if}
