import type { MiddlewareHandler, TypedResponse } from 'hono';
import { html, raw } from 'hono/html';
import type { Component } from 'svelte';
import { render as svelteRender } from 'svelte/server';
import { getSrcFromManifest } from 'vite-ssr-components/common';
import type { PageName } from '../app/pages.gen';

type PageObject = {
  component: string;
  props: Record<string, unknown>;
  url: string;
  version: string | null;
};

declare module 'hono' {
  interface ContextRenderer {
    // biome-ignore lint/style/useShorthandFunctionType: declaration merging requires interface form
    <C extends PageName, P = Record<string, never>>(
      component: C,
      props?: P,
    ): Response & TypedResponse<{ component: C; props: P }, 200, 'html'>;
  }
}

// `<` を `\u003c` にして </script> 等での早期終了を防ぐ。
// `"` は html`...` 補間が data-page="..." 属性として &quot; にエスケープしてくれる。
const serializePageJson = (page: PageObject) => JSON.stringify(page).replace(/</g, '\\u003c');

type AnyPageComponent = Component<Record<string, unknown>>;
type SvelteSSRModule = { default: AnyPageComponent };

const pageModules = import.meta.glob<SvelteSSRModule>('../app/pages/**/*.svelte', {
  eager: true,
});

function loadPage(component: string): SvelteSSRModule {
  const path = `../app/pages/${component}.svelte`;
  const mod = pageModules[path];
  if (!mod) {
    throw new Error(`Inertia page not found: ${component} (looked for ${path})`);
  }
  return mod;
}

type RendererOptions = {
  /** Inertia の asset version。デプロイ単位で変える */
  version?: string | null;
  /** OGP の絶対 URL を組み立てるサイトオリジン（末尾スラッシュなし） */
  siteUrl?: string;
};

export const renderer = (options: RendererOptions = {}): MiddlewareHandler => {
  const isDev = !import.meta.env?.PROD;

  return async (c, next) => {
    c.setRenderer((async (component: string, props: Record<string, unknown> = {}) => {
      const url = new URL(c.req.url);
      const page: PageObject = {
        component,
        props,
        url: url.pathname + url.search,
        version: options.version ?? null,
      };

      if (c.req.header('X-Inertia')) {
        c.header('X-Inertia', 'true');
        c.header('Vary', 'X-Inertia');
        return c.json(page);
      }

      const mod = loadPage(component);
      const ssr = svelteRender(mod.default, { props });

      const dataPage = serializePageJson(page);

      // dev: vite が /src/client.ts を直接配信。client.ts 側で global.css を import するので
      //      HMR が効くが、初回描画前に CSS が注入されないため FOUC が発生する。
      //      `?direct` で raw CSS を text/css として取得できるので link tag でも併用する。
      // prod: index.html エントリ経由でハッシュ化された assets/index-XXX.{js,css} を参照
      let clientSrc: string;
      let cssLinks: string[];
      if (isDev) {
        clientSrc = '/src/client.ts';
        cssLinks = ['/src/styles/global.css?direct'];
      } else {
        const entry = getSrcFromManifest({ src: 'index.html' });
        clientSrc = entry.src ?? '';
        cssLinks = entry.css ?? [];
      }

      const viteClientScript = isDev ? '<script type="module" src="/@vite/client"></script>' : '';
      const cssLinkTags = cssLinks.map((href) => html`<link rel="stylesheet" href="${href}" />`);
      const clientScriptTag = clientSrc
        ? html`<script type="module" src="${clientSrc}"></script>`
        : '';

      const siteUrl = options.siteUrl ?? `${url.protocol}//${url.host}`;
      const ogUrl = `${siteUrl}${url.pathname}${url.search}`;
      const ogImage = `${siteUrl}/ogp.png`;

      const document = html`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta property="og:url" content="${ogUrl}" />
<meta property="og:image" content="${ogImage}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="preconnect" href="https://lds-img.finalfantasyxiv.com" />
<link rel="dns-prefetch" href="https://lds-img.finalfantasyxiv.com" />
${raw(viteClientScript)}
${cssLinkTags}
${clientScriptTag}
<script>var eorzeadb = { dynamic_tooltip: true };</script>
<script src="https://lds-img.finalfantasyxiv.com/pc/global/js/eorzeadb/loader.js?v3" defer></script>
${raw(ssr.head)}
</head>
<body class="min-h-dvh bg-background text-foreground">
<div id="app" data-page="${dataPage}">${raw(ssr.body)}</div>
</body>
</html>`;

      return c.html(document);
    }) as unknown as Parameters<typeof c.setRenderer>[0]);
    await next();
  };
};
