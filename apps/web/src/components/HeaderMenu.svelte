<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { Crown, LayoutGrid, Menu, MessageCircle, SwatchBook, X, Info } from 'lucide-svelte';
  import SearchModal from './SearchModal.svelte';
  import VersionPicker from './VersionPicker.svelte';
  import { versionedHref } from '../lib/utils';

  interface VersionInfo {
    version: string;
    dataFrom: string | null;
    dataTo: string | null;
    syncedAt: string;
    isActive: boolean;
  }

  interface Props {
    versions?: VersionInfo[];
    currentVersion?: string;
  }

  let { versions = [], currentVersion = '' }: Props = $props();

  let isMenuOpen = $state(false);

  const hasMultipleVersions = $derived(versions.length > 1);
  const activeVersion = $derived(versions.find(v => v.isActive)?.version);
  const linkVersion = $derived(currentVersion === activeVersion ? undefined : currentVersion);
</script>

<SearchModal currentVersion={linkVersion} />

{#if hasMultipleVersions}
  <VersionPicker {versions} {currentVersion} />
{/if}

<Dialog.Root bind:open={isMenuOpen}>
  <Dialog.Trigger
    class="p-2 rounded-md hover:bg-primary-foreground/10 transition-colors"
    aria-label="メニューを開く"
  >
    <Menu class="size-6" />
  </Dialog.Trigger>

  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-20 bg-black/50" />
    <Dialog.Content
      class="fixed top-0 right-0 z-30 h-dvh w-64 bg-card text-card-foreground shadow-xl"
      aria-label="ナビゲーションメニュー"
    >
      <div class="flex items-center justify-between p-4 border-b">
        <span class="font-bold">メニュー</span>
        <Dialog.Close
          class="p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="メニューを閉じる"
        >
          <X class="size-5" />
        </Dialog.Close>
      </div>

      <nav class="p-2">
        <a
          href={versionedHref("/ranking", linkVersion)}
          class="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent transition-colors"
          onclick={() => isMenuOpen = false}
        >
          <Crown class="size-5" />
          人気ランキング
        </a>
        <a
          href="/readme"
          class="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent transition-colors"
          onclick={() => isMenuOpen = false}
        >
          <Info class="size-5" />
          このサイトについて
        </a>
        <p class="px-3 py-2 text-xs text-muted-foreground">外部リンク</p>
        <a
          href="https://colorant-picker.pl4rd.com"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent transition-colors"
          onclick={() => isMenuOpen = false}
        >
          <SwatchBook class="size-5" />
          カララントピッカー
        </a>
        <a
          href="https://4seasons.pl4rd.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent transition-colors"
          onclick={() => isMenuOpen = false}
        >
          <LayoutGrid class="size-5" />
          4seasons
        </a>
        <a href="https://jp.finalfantasyxiv.com/lodestone/character/27344914/blog/5649674/"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent transition-colors"
          onclick={() => isMenuOpen = false}
        >
          <MessageCircle class="size-5" />
          ご意見・ご要望
        </a>
      </nav>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
