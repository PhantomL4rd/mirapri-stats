<script lang="ts">
  import { cn, versionedHref } from '../lib/utils';

  interface Props {
    currentSlot: string;
    basePath?: string;
    version?: string;
  }

  let { currentSlot, basePath = '/', version }: Props = $props();

  const slots = [
    { slug: 'body', name: '胴' },
    { slug: 'head', name: '頭' },
    { slug: 'hands', name: '手' },
    { slug: 'legs', name: '脚' },
    { slug: 'feet', name: '足' },
  ];
</script>

<div class="flex gap-1 border-b border-border">
  {#each slots as slot}
    <a
      href={versionedHref(`${basePath}?slot=${slot.slug}`, version)}
      class={cn(
        'px-4 py-2 text-sm font-medium transition-colors',
        currentSlot === slot.slug
          ? 'border-b-2 border-foreground text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {slot.name}
    </a>
  {/each}
</div>
