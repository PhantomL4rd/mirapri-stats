<script lang="ts">
  import { ChevronDown } from 'lucide-svelte';

  interface DyeCombo {
    stain1Name: string | null;
    stain1Rgb: { r: number; g: number; b: number } | null;
    stain2Name: string | null;
    stain2Rgb: { r: number; g: number; b: number } | null;
  }

  interface Props {
    combos: DyeCombo[];
    topCount?: number;
  }

  let { combos, topCount = 3 }: Props = $props();
  let showAll = $state(false);

  const topCombos = $derived(combos.slice(0, topCount));
  const restCombos = $derived(combos.slice(topCount));
  const hasMore = $derived(restCombos.length > 0);

  function rgbStyle(rgb: { r: number; g: number; b: number } | null): string {
    if (!rgb) return '';
    return `background-color: rgb(${rgb.r}, ${rgb.g}, ${rgb.b});`;
  }
</script>

{#snippet stainPart(name: string | null, rgb: { r: number; g: number; b: number } | null)}
  <div class="flex items-center gap-1.5">
    {#if rgb}
      <span class="inline-block size-4 rounded border border-border/60" style={rgbStyle(rgb)} aria-hidden="true"></span>
    {:else}
      <span class="inline-block size-4 rounded border border-dashed border-muted-foreground/40" aria-hidden="true"></span>
    {/if}
    <span class={name ? 'font-medium text-card-foreground' : 'text-muted-foreground'}>
      {name ?? '未染色'}
    </span>
  </div>
{/snippet}

{#snippet comboRow(c: DyeCombo)}
  <li class="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm hover:bg-muted/30 transition-colors">
    <div class="flex flex-1 items-center gap-3 text-sm min-w-0">
      {@render stainPart(c.stain1Name, c.stain1Rgb)}
      <span class="text-muted-foreground">/</span>
      {@render stainPart(c.stain2Name, c.stain2Rgb)}
    </div>
  </li>
{/snippet}

{#if combos.length === 0}
  <p class="text-center text-muted-foreground py-6 text-sm">
    この装備の染色組み合わせデータはまだありません
  </p>
{:else}
  <div class="space-y-2">
    <ul class="space-y-2">
      {#each topCombos as c, i (i)}
        {@render comboRow(c)}
      {/each}
    </ul>
  </div>

  {#if hasMore}
    {#if showAll}
      <ul class="mt-2 space-y-2">
        {#each restCombos as c, i (i)}
          {@render comboRow(c)}
        {/each}
      </ul>
    {:else}
      <button
        onclick={() => (showAll = true)}
        class="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <span>もっと見る（残り {restCombos.length} 件）</span>
        <ChevronDown class="size-4" />
      </button>
    {/if}
  {/if}
{/if}
