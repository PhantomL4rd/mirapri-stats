<script lang="ts">
  import { Link } from '@inertiajs/svelte';
  import BaseLayout from '../../layouts/BaseLayout.svelte';
  import PartnerList from '../../components/PartnerList.svelte';
  import { ArrowLeft } from 'lucide-svelte';
  import { versionedHref } from '$lib/utils';
  import type { PageProps } from '../../pages.gen';

  let {
    itemInfo,
    slotName,
    partnerGroups,
    similarItems,
    freshness,
    versions,
    currentVersion,
    linkVersion,
    isMultiSlotPartners,
  }: PageProps<'Item/Show'> = $props();

  function getLodestoneUrl(id: string): string {
    return `https://jp.finalfantasyxiv.com/lodestone/playguide/db/item/${id}/`;
  }
</script>

<BaseLayout
  title={`${itemInfo.itemName}のベストマッチ | ミラプリインサイト`}
  {versions}
  {currentVersion}
  {freshness}
>
  <div class="space-y-6">
    <div>
      <p class="text-sm text-muted-foreground">{slotName}</p>
      <div class="flex items-center gap-3">
        {#if itemInfo.iconUrl}
          <img src={itemInfo.iconUrl} alt="" width="48" height="48" class="rounded" loading="lazy" />
        {/if}
        <h1 class="text-2xl font-bold text-balance">
          <a
            href={getLodestoneUrl(itemInfo.itemId)}
            target="_blank"
            rel="noopener noreferrer"
            class="eorzeadb_link hover:underline"
          >
            {itemInfo.itemName}
          </a>
        </h1>
      </div>
      <p class="mt-1 text-sm text-muted-foreground text-pretty">のベストマッチ</p>
    </div>

    <div class="space-y-3">
      {#if partnerGroups.length === 0}
        <p class="text-center text-muted-foreground py-8">データがありません</p>
      {:else if isMultiSlotPartners}
        {#each partnerGroups as group (group.slotId)}
          <details class="group rounded-lg border border-border bg-card shadow-sm" open>
            <summary class="flex cursor-pointer items-center justify-between p-3 font-medium text-card-foreground hover:bg-muted/50">
              <span>{group.slotLabel}</span>
            </summary>
            <PartnerList items={group.items} variant="bordered" version={linkVersion} />
          </details>
        {/each}
      {:else}
        <PartnerList items={partnerGroups[0]?.items ?? []} variant="card" version={linkVersion} />
      {/if}
    </div>

    {#if similarItems.length > 0}
      <div class="space-y-3">
        <h2 class="text-lg font-semibold text-card-foreground">着こなしの似た装備</h2>
        <ul class="space-y-2">
          {#each similarItems as item (item.itemId)}
            <li class="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
              {#if item.iconUrl}
                <img src={item.iconUrl} alt="" width="40" height="40" class="rounded" loading="lazy" />
              {/if}
              <Link
                href={versionedHref(`/item/${item.itemId}`, linkVersion)}
                class="flex-1 font-medium text-card-foreground hover:underline"
              >
                {item.itemName}
              </Link>
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
        </ul>
      </div>
    {/if}

    <div class="pt-4">
      <Link
        href={versionedHref('/', linkVersion)}
        class="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
      >
        <ArrowLeft class="size-4" />
        ランキングに戻る
      </Link>
    </div>
  </div>
</BaseLayout>
