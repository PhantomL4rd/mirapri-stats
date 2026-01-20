import type { APIRoute } from 'astro';
import { searchItems } from '../../lib/queries';

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? '';
  const version = url.searchParams.get('version') ?? undefined;

  if (query.length < 1) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = locals.runtime?.env?.DB;

  if (!db) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const results = await searchItems(db, query, 10, version);
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Search error:', e);
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
