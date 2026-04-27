<script lang="ts">
  import { Link } from '@inertiajs/svelte';
  import { Lock } from 'lucide-svelte';
</script>

<div class="bg-banner/10 border-b border-banner/30">
  <div class="mx-auto max-w-4xl px-4 py-2">
    <Link
      href="/faq"
      class="flex items-center justify-center gap-2 text-sm text-banner hover:underline"
    >
      <Lock class="size-4" />
      <span>個人が特定されない仕組みで運営しています</span>
    </Link>
  </div>
</div>
