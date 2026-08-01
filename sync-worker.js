// Cloudflare Worker for 教学管理工作台 data sync
// Deploy: Workers & Pages -> Create application -> Create Worker -> Paste this code -> Deploy
// Then bind a KV namespace named "SYNC_KV" in Settings -> Variables -> KV Namespace Bindings

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Client-Id',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === '/api/health') {
      return jsonResponse({ ok: true, service: 'teach-sync' }, corsHeaders);
    }

    if (url.pathname === '/sync' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { local, clientId, lastVersion } = body;
        if (!local || !clientId) {
          return jsonResponse({ error: 'missing local or clientId' }, corsHeaders, 400);
        }

        if (!env.SYNC_KV) {
          return jsonResponse({ error: 'SYNC_KV not bound. Please bind a KV namespace in Cloudflare Worker settings.' }, corsHeaders, 500);
        }

        const key = 'sync-data';
        let stored = null;
        try {
          stored = await env.SYNC_KV.get(key, { type: 'json' });
        } catch (e) {}
        if (!stored || typeof stored !== 'object') {
          stored = { data: {}, version: 0, updatedAt: 0 };
        }

        const remote = stored.data || {};
        const merged = JSON.parse(JSON.stringify(remote));
        let changes = 0;

        const tables = ['teachers', 'students', 'lessons', 'sessions', 'supervisions', 'settings'];
        for (const table of tables) {
          for (const id in local[table] || {}) {
            const inc = local[table][id];
            const loc = merged[table]?.[id];
            if (!loc || (inc.updatedAt || 0) > (loc.updatedAt || 0)) {
              if (!merged[table]) merged[table] = {};
              if (inc._deleted) {
                delete merged[table][id];
              } else {
                merged[table][id] = inc;
              }
              changes++;
            }
          }
        }

        const version = (stored.version || 0) + 1;
        const updatedAt = Date.now();
        await env.SYNC_KV.put(key, JSON.stringify({ data: merged, version, updatedAt }));

        // Count how many remote records are newer than local (returned to client)
        let mergedChanges = 0;
        for (const table of tables) {
          for (const id in remote[table] || {}) {
            const inc = remote[table][id];
            const loc = local[table]?.[id];
            if (!loc || (inc.updatedAt || 0) > (loc.updatedAt || 0)) {
              mergedChanges++;
            }
          }
        }

        return jsonResponse({ ok: true, data: merged, version, mergedChanges }, corsHeaders);
      } catch (e) {
        return jsonResponse({ error: e.message || 'sync failed' }, corsHeaders, 500);
      }
    }

    return jsonResponse({ error: 'not found' }, corsHeaders, 404);
  }
};

function jsonResponse(data, corsHeaders, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}
