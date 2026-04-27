<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Link } from '@inertiajs/svelte';
  import { History, Menu, Search, TrendingUp } from 'lucide-svelte';
  import HeaderMenu from '../components/HeaderMenu.svelte';
  import PrivacyRibbon from '../components/PrivacyRibbon.svelte';
  import type { VersionInfo } from '$lib/db';
  import type { DataFreshness } from '$lib/queries';
  import { formatDateFull, getNextUpdateDate, versionedHref } from '$lib/utils';

  // bits-ui の Dialog/Popover は svelte/server.render の getContext lifecycle と
  // 噛み合わないので SSR では描画できない。SSR は同寸法のアイコン入りボタン殻だけ出して
  // クライアントマウント後に本物の HeaderMenu に差し替える（レイアウトシフト最小化）。
  const isClient = typeof window !== 'undefined';

  interface Props {
    title?: string;
    description?: string;
    versions?: VersionInfo[];
    currentVersion?: string;
    freshness?: DataFreshness;
    showRibbon?: boolean;
    children: Snippet;
  }

  let {
    title = 'ミラプリインサイト',
    description = 'FF14プレイヤーのミラプリ傾向を集計・可視化',
    versions = [],
    currentVersion = '',
    freshness,
    showRibbon = true,
    children,
  }: Props = $props();

  const showFreshness = $derived(!!(freshness?.dataFrom && freshness?.dataTo));
  const isViewingOldData = $derived(
    !!(currentVersion && versions.length > 0 && !versions.find((v) => v.version === currentVersion)?.isActive),
  );
  const nextUpdateDate = $derived(showFreshness ? getNextUpdateDate(freshness?.dataTo ?? null) : null);
  const linkVersion = $derived(isViewingOldData ? currentVersion : undefined);
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

{#if showRibbon}
  <PrivacyRibbon />
{/if}

<header class="bg-primary text-primary-foreground mb-8">
  <div class="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between">
    <div class="flex-1">
      <Link
        href={versionedHref('/', linkVersion)}
        class="flex items-center gap-2 text-xl font-bold hover:opacity-80 transition-opacity"
      >
        <TrendingUp class="size-6" />
        ミラプリインサイト
      </Link>
    </div>
    <div class="flex items-center gap-1">
      {#if isClient}
        <HeaderMenu {versions} {currentVersion} />
      {:else}
        <!-- SSR placeholder: 本物の HeaderMenu と同じアイコン・寸法で出してマウント時の差替えを目立たなくする -->
        <span
          class="p-2 rounded-md text-primary-foreground/70"
          aria-hidden="true"
        >
          <Search class="size-6" />
        </span>
        {#if versions.length > 1}
          <span
            class="p-2 rounded-md text-primary-foreground/70"
            aria-hidden="true"
          >
            <History class="size-6" />
          </span>
        {/if}
        <span
          class="p-2 rounded-md text-primary-foreground/70"
          aria-hidden="true"
        >
          <Menu class="size-6" />
        </span>
      {/if}
    </div>
  </div>
</header>

<main class="mx-auto max-w-4xl px-4 py-8">
  {@render children()}
</main>

<footer class="border-t bg-card pt-4">
  {#if showFreshness && freshness}
    <div class="mx-auto max-w-4xl px-4 pb-1 text-center text-xs text-muted-foreground tabular-nums">
      統計期間: {formatDateFull(freshness.dataFrom)} - {formatDateFull(freshness.dataTo)}
      {#if isViewingOldData}<span class="text-warning ml-1">(過去データ)</span>{/if}
    </div>
  {/if}
  {#if nextUpdateDate && !isViewingOldData}
    <div class="mx-auto max-w-4xl px-4 pb-2 text-center text-xs text-muted-foreground tabular-nums">
      次回更新予定: {formatDateFull(nextUpdateDate)} ごろ
    </div>
  {/if}
  <div class="mx-auto max-w-4xl px-4 pb-4 text-center text-xs text-muted-foreground">
    © SQUARE ENIX
  </div>
</footer>
