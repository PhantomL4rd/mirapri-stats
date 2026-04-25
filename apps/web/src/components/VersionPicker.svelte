<script lang="ts">
  import { Popover } from 'bits-ui';
  import { History } from 'lucide-svelte';
  import { cn, formatDateShort } from '../lib/utils';

  interface VersionInfo {
    version: string;
    dataFrom: string | null;
    dataTo: string | null;
    syncedAt: string;
    isActive: boolean;
  }

  interface Props {
    versions: VersionInfo[];
    currentVersion: string;
  }

  let { versions, currentVersion }: Props = $props();

  let open = $state(false);

  function getLabel(v: VersionInfo): string {
    const period = v.dataFrom && v.dataTo
      ? `${formatDateShort(v.dataFrom)} - ${formatDateShort(v.dataTo)}`
      : '期間不明';
    return v.isActive ? `${period} (最新)` : period;
  }

  function select(version: string) {
    const url = new URL(window.location.href);
    const activeVersion = versions.find(v => v.isActive)?.version;

    if (version === activeVersion) {
      url.searchParams.delete('version');
    } else {
      url.searchParams.set('version', version);
    }

    window.location.href = url.toString();
  }

  const isViewingOldData = $derived(
    currentVersion && versions.length > 0 && !versions.find(v => v.version === currentVersion)?.isActive
  );
</script>

<Popover.Root bind:open>
  <Popover.Trigger
    class={cn(
      "p-2 rounded-md hover:bg-primary-foreground/10 transition-colors relative",
      isViewingOldData && "text-warning"
    )}
    aria-label="データ期間を切り替え"
  >
    <History class="size-6" />
    {#if isViewingOldData}
      <span class="absolute -top-0.5 -right-0.5 size-2 bg-warning rounded-full"></span>
    {/if}
  </Popover.Trigger>

  <Popover.Portal>
    <Popover.Content
      class="z-30 w-56 bg-card text-card-foreground rounded-lg shadow-xl border border-border overflow-hidden"
      sideOffset={8}
      align="end"
    >
      <div class="p-3 border-b border-border">
        <p class="text-sm font-medium">データ期間</p>
        {#if isViewingOldData}
          <p class="text-xs text-warning mt-1">過去データを表示中</p>
        {/if}
      </div>
      <ul class="max-h-60 overflow-y-auto">
        {#each versions as v}
          <li>
            <button
              type="button"
              class={cn(
                'w-full px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors',
                v.version === currentVersion && 'bg-muted font-medium'
              )}
              onclick={() => select(v.version)}
            >
              {getLabel(v)}
            </button>
          </li>
        {/each}
      </ul>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
