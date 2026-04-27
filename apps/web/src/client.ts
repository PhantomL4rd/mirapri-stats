import { createInertiaApp, type ResolvedComponent, router } from '@inertiajs/svelte';
import { mount } from 'svelte';
import './styles/global.css';

declare global {
  interface Window {
    eorzeadb?: {
      dynamic_tooltip?: boolean;
      parse?: () => void;
    };
  }
}

const pages = import.meta.glob<{ default: ResolvedComponent }>('../app/pages/**/*.svelte');

createInertiaApp({
  resolve: async (name) => {
    const path = `../app/pages/${name}.svelte`;
    const loader = pages[path];
    if (!loader) {
      throw new Error(`Inertia page not found on client: ${name}`);
    }
    // @inertiajs/svelte の App.svelte は component.default にアクセスするため
    // モジュール全体（{ default: Component }）を返す必要がある（型定義は古いので as 強制）
    const mod = await loader();
    return mod as unknown as ResolvedComponent;
  },
  setup({ el, App, props }) {
    if (!el) throw new Error('Inertia mount target #app not found');
    // Svelte 5 mount() の前に SSR DOM をクリアして hydrate 経路を回避し fresh render させる
    while (el.firstChild) el.removeChild(el.firstChild);
    mount(App, { target: el, props });
  },
});

router.on('finish', () => {
  if (window.eorzeadb?.parse) {
    window.eorzeadb.parse();
  }
});
