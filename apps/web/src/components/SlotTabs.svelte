<script lang="ts">
  import { cn } from '../lib/utils';

  interface Props {
    currentSlot: number;
  }

  let { currentSlot }: Props = $props();

  const slots = [
    { id: 2, name: '胴' },
    { id: 1, name: '頭' },
    { id: 3, name: '手' },
    { id: 4, name: '脚' },
    { id: 5, name: '足' },
  ];
</script>

<div class="flex gap-1 border-b">
  {#each slots as slot}
    <a
      href={`/?slot=${slot.id}`}
      class={cn(
        'px-4 py-2 text-sm font-medium transition-colors',
        currentSlot === slot.id
          ? 'border-b-2 border-blue-500 text-blue-600'
          : 'text-gray-500 hover:text-gray-700'
      )}
    >
      {slot.name}
    </a>
  {/each}
</div>
