<script lang="ts">
  import { History } from 'lucide-svelte';
  import { cn } from '../lib/utils';

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

  let isOpen = $state(false);

  function toggle() {
    isOpen = !isOpen;
  }

  function close() {
    isOpen = false;
  }

  function formatDateSlash(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${m}/${d}`;
  }

  function getLabel(v: VersionInfo): string {
    const period = v.dataFrom && v.dataTo
      ? `${formatDateSlash(v.dataFrom)} - ${formatDateSlash(v.dataTo)}`
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

<button
  onclick={toggle}
  class={cn(
    "p-2 rounded-md hover:bg-primary-foreground/10 transition-colors relative",
    isViewingOldData && "text-amber-300"
  )}
  aria-label="データ期間を切り替え"
  aria-expanded={isOpen}
>
  <History class="size-6" />
  {#if isViewingOldData}
    <span class="absolute -top-0.5 -right-0.5 size-2 bg-amber-400 rounded-full"></span>
  {/if}
</button>

{#if isOpen}
  <button
    class="fixed inset-0 z-40 bg-black/50 transition-opacity"
    onclick={close}
    aria-label="バージョン選択を閉じる"
  ></button>

  <div class="fixed top-14 right-4 z-50 w-56 bg-white text-gray-900 rounded-lg shadow-xl border border-gray-200 overflow-hidden">
    <div class="p-3 border-b border-gray-200">
      <p class="text-sm font-medium">データ期間</p>
      {#if isViewingOldData}
        <p class="text-xs text-amber-600 mt-1">過去データを表示中</p>
      {/if}
    </div>
    <ul class="max-h-60 overflow-y-auto">
      {#each versions as v}
        <li>
          <button
            type="button"
            class={cn(
              'w-full px-4 py-3 text-left text-sm hover:bg-gray-100 transition-colors',
              v.version === currentVersion && 'bg-gray-100 font-medium'
            )}
            onclick={() => select(v.version)}
          >
            {getLabel(v)}
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}
