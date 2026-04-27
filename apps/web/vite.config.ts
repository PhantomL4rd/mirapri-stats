import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cloudflare } from '@cloudflare/vite-plugin';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { type Plugin, defineConfig } from 'vite';
import { inertiaPagesPlugin } from './src/vite-plugin';

/**
 * Vite ビルドを「client → worker」の順に走らせ、worker ビルドの transform で
 * `dist/client/.vite/manifest.json` を `import.meta.env.VITE_MANIFEST_CONTENT` に inline する。
 * これにより本番でも `getSrcFromManifest({ src: '/src/client.ts' })` がハッシュ付き
 * バンドル名を解決できる。
 *
 * ssrPlugin() (vite-ssr-components/plugin) を丸ごと使うと clientFirstBuild が
 * Vite のデフォルト `ssr` 環境まで走らせてしまい、@cloudflare/vite-plugin が独自に
 * 構築する worker 環境とバッティングするため、必要部分だけ自前で持つ。
 */
function clientFirstAndManifestPlugin(): Plugin[] {
  return [
    {
      name: 'mirapri-client-first-build',
      config(config) {
        config.builder ??= {};
        config.builder.buildApp = async (builder) => {
          const clientEnv = builder.environments.client;
          const workerEnvs = Object.entries(builder.environments)
            .filter(([name]) => name !== 'client' && name !== 'ssr')
            .map(([, env]) => env);

          if (clientEnv) {
            await builder.build(clientEnv);
          }
          for (const wenv of workerEnvs) {
            await builder.build(wenv);
          }
        };
      },
    },
    {
      name: 'mirapri-inject-manifest',
      transform(code, _id, options) {
        if (!options?.ssr) return;
        if (!code.includes('__VITE_MANIFEST_CONTENT__')) return;
        const manifestPath = resolve(process.cwd(), 'dist/client/.vite/manifest.json');
        let manifestContent: string;
        try {
          manifestContent = readFileSync(manifestPath, 'utf-8');
        } catch {
          return;
        }
        const newCode = code.replace(
          /"__VITE_MANIFEST_CONTENT__"/g,
          `{ "__manifest__": { default: ${manifestContent} } }`,
        );
        if (newCode !== code) {
          return { code: newCode, map: null };
        }
      },
    },
  ];
}

// Worker (SSR) 環境で esbuild に bits-ui / lucide-svelte / @inertiajs/svelte を
// 素のJSへ再展開させないため、optimizer から除外する。
// これらは svelte-vite-plugin の transform 経由でコンパイルさせる必要がある。
const SVELTE_LIBS_TO_EXCLUDE = ['bits-ui', 'lucide-svelte', '@inertiajs/svelte'];

export default defineConfig({
  resolve: {
    alias: {
      $lib: resolve(import.meta.dirname, './src/lib'),
    },
  },
  // mirapri-web Worker 環境は workerNameToEnvironmentName により mirapri_web になる
  environments: {
    client: {
      build: {
        outDir: 'dist/client',
        manifest: true,
      },
      // qs は CJS なのでブラウザ ESM 直で評価できない。@inertiajs/svelte 経由で
      // 引きずるので pre-bundle 対象に明示しておく。
      optimizeDeps: {
        include: ['@inertiajs/svelte', '@inertiajs/svelte > qs'],
      },
    },
    mirapri_web: {
      optimizeDeps: {
        exclude: SVELTE_LIBS_TO_EXCLUDE,
      },
    },
  },
  ssr: {
    noExternal: SVELTE_LIBS_TO_EXCLUDE,
  },
  plugins: [
    inertiaPagesPlugin(),
    svelte({
      // Worker (Cloudflare) 環境では vite-plugin-svelte の prebundle が
      // bits-ui 等を素のJSへ展開してしまい `$state` runes が壊れるため無効化
      prebundleSvelteLibraries: false,
    }),
    tailwindcss(),
    cloudflare(),
    ...clientFirstAndManifestPlugin(),
  ],
});
