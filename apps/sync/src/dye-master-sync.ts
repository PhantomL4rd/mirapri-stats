import 'dotenv/config';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StainInfo, WriterClientConfig } from './types.js';
import { createWriterClient } from './writer-client.js';

const DYES_JSON_URL = 'https://colorant-picker.pl4rd.com/data/dyes.json';

interface DyesJsonEntry {
  id: string;
  name: string;
  category?: string | null;
  rgb: { r: number; g: number; b: number };
  tags?: string[];
  lodestone?: string | null;
  source?: string | null;
}

interface DyeNamesJa {
  names: Record<string, string>;
}

/**
 * dyes.json + ja/dye.json をマージし、JP名を PK とする StainInfo[] を生成
 */
export function buildStainsFromDyesJson(
  entries: DyesJsonEntry[],
  jaNames: Record<string, string>,
): StainInfo[] {
  const stains: StainInfo[] = [];
  const skipped: string[] = [];
  for (const entry of entries) {
    if (!entry.rgb) continue;
    const nameJa = jaNames[entry.id];
    if (!nameJa) {
      skipped.push(entry.id);
      continue;
    }
    stains.push({
      name: nameJa,
      dyeId: entry.id,
      category: entry.category ?? null,
      r: entry.rgb.r,
      g: entry.rgb.g,
      b: entry.rgb.b,
    });
  }
  if (skipped.length > 0) {
    console.warn(`[DyeMaster] JP名がない dye_id: ${skipped.join(', ')}`);
  }
  return stains;
}

/**
 * 同梱 ja/dye.json を読み込む（apps/sync/data/dye-names-ja.json）
 */
export function loadJaNames(): Record<string, string> {
  const here = dirname(fileURLToPath(import.meta.url));
  // src 配置時 (tsx 開発): src/../data/...、dist 配置時: dist/../data/...
  const path = resolve(here, '..', 'data', 'dye-names-ja.json');
  const raw = readFileSync(path, 'utf-8');
  const parsed = JSON.parse(raw) as DyeNamesJa;
  return parsed.names ?? {};
}

export interface DyeMasterSyncDependencies {
  fetchFn?: typeof fetch;
  client: ReturnType<typeof createWriterClient>;
  jaNames?: Record<string, string>;
}

export async function syncDyeMaster(
  deps: DyeMasterSyncDependencies,
): Promise<{ inserted: number }> {
  const fetchFn = deps.fetchFn ?? fetch;
  const jaNames = deps.jaNames ?? loadJaNames();

  const response = await fetchFn(DYES_JSON_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch dyes.json: ${response.status}`);
  }
  const json = (await response.json()) as { dyes?: DyesJsonEntry[] } | DyesJsonEntry[];
  const entries = Array.isArray(json) ? json : (json.dyes ?? []);
  const stains = buildStainsFromDyesJson(entries, jaNames);
  console.log(`[DyeMaster] dyes.json から ${stains.length} 件のカララントを取得（JP名突合）`);
  const result = await deps.client.postStains(stains);
  console.log(`[DyeMaster] ${result.inserted} 件 UPSERT`);
  return result;
}

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`Error: ${key} is required`);
    process.exit(1);
  }
  return value;
}

// CLI として直接起動された場合のみ実行。
// pnpm/symlink 経由でも一致するよう realpath で正規化して比較。
function isMainEntry(): boolean {
  const argvPath = process.argv[1];
  if (!argvPath) return false;
  try {
    const selfPath = realpathSync(fileURLToPath(import.meta.url));
    const cliPath = realpathSync(argvPath);
    return selfPath === cliPath;
  } catch {
    return false;
  }
}

if (isMainEntry()) {
  const workerUrl = getEnv('WORKER_URL');
  const workerAuthToken = getEnv('WORKER_AUTH_TOKEN');
  const cfAccessClientId = process.env['CF_ACCESS_CLIENT_ID'];
  const cfAccessClientSecret = process.env['CF_ACCESS_CLIENT_SECRET'];
  const config: WriterClientConfig = {
    baseUrl: workerUrl,
    authToken: workerAuthToken,
    ...(cfAccessClientId && cfAccessClientSecret ? { cfAccessClientId, cfAccessClientSecret } : {}),
  };
  const client = createWriterClient(config);

  try {
    await syncDyeMaster({ client });
    console.log('Done');
  } catch (e) {
    console.error('Fatal error:', (e as Error).message);
    process.exit(1);
  }
}
