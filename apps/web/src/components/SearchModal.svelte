<script lang="ts">
  import { Search, X } from 'lucide-svelte';
  import { cn } from '../lib/utils';

  interface SearchResult {
    itemId: string;
    itemName: string;
    slotId: number;
    iconUrl: string | null;
  }

  interface Props {
    currentVersion?: string;
  }

  let { currentVersion = '' }: Props = $props();

  const SLOT_NAMES: Record<number, string> = {
    1: '頭',
    2: '胴',
    3: '手',
    4: '脚',
    5: '足',
  };

  let isOpen = $state(false);
  let query = $state('');
  let results = $state<SearchResult[]>([]);
  let isLoading = $state(false);
  let selectedIndex = $state(-1);
  let inputElement: HTMLInputElement | undefined = $state();
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  export function open() {
    isOpen = true;
    setTimeout(() => inputElement?.focus(), 50);
  }

  function close() {
    isOpen = false;
    query = '';
    results = [];
    selectedIndex = -1;
  }

  async function search(q: string) {
    if (q.length < 1) {
      results = [];
      return;
    }

    isLoading = true;
    try {
      const versionParam = currentVersion ? `&version=${encodeURIComponent(currentVersion)}` : '';
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}${versionParam}`);
      if (res.ok) {
        results = await res.json();
      }
    } catch (e) {
      console.error('Search error:', e);
      results = [];
    } finally {
      isLoading = false;
    }
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    query = target.value;
    selectedIndex = -1;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      search(query);
    }, 200);
  }

  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          selectItem(results[selectedIndex]);
        }
        break;
      case 'Escape':
        close();
        break;
    }
  }

  function selectItem(item: SearchResult) {
    window.location.href = `/item/${item.itemId}`;
  }
</script>

<button
  onclick={open}
  class="p-2 rounded-md hover:bg-primary-foreground/10 transition-colors"
  aria-label="検索を開く"
>
  <Search class="size-6" />
</button>

{#if isOpen}
  <button
    class="fixed inset-0 z-40 bg-black/50 transition-opacity"
    onclick={close}
    aria-label="検索を閉じる"
  ></button>

  <div class="fixed top-0 left-0 right-0 z-50 bg-card shadow-xl p-4">
    <div class="mx-auto max-w-2xl">
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <input
            bind:this={inputElement}
            type="text"
            placeholder="アイテム名で検索..."
            value={query}
            oninput={handleInput}
            onkeydown={handleKeydown}
            class="w-full pl-10 pr-4 py-3 text-lg rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onclick={close}
          class="p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="検索を閉じる"
        >
          <X class="size-6" />
        </button>
      </div>

      {#if results.length > 0 || isLoading || query.length >= 1}
        <div class="mt-2 rounded-lg border border-border bg-card overflow-hidden">
          {#if isLoading}
            <div class="p-3 text-center text-sm text-muted-foreground">検索中...</div>
          {:else if results.length === 0 && query.length >= 1}
            <div class="p-3 text-center text-sm text-muted-foreground">見つかりませんでした</div>
          {:else}
            <ul class="max-h-80 overflow-y-auto">
              {#each results as item, index}
                <li>
                  <button
                    type="button"
                    class={cn(
                      'w-full px-4 py-3 text-left flex items-center justify-between hover:bg-muted/50 transition-colors',
                      index === selectedIndex && 'bg-muted',
                    )}
                    onclick={() => selectItem(item)}
                    onmouseenter={() => (selectedIndex = index)}
                  >
                    <span class="inline-flex items-center gap-2 text-card-foreground">
                      {#if item.iconUrl}
                        <img src={item.iconUrl} alt="" width="24" height="24" class="rounded" loading="lazy" />
                      {/if}
                      {item.itemName}
                    </span>
                    <span class="text-xs text-muted-foreground">{SLOT_NAMES[item.slotId]}</span>
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
