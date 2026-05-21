/**
 * Supabase implementation of @jion/integrations' SnapshotStore interface.
 *
 * Lazy-initializes the client on first use so the route can be imported in
 * environments without env vars (typecheck, dev preview without Supabase).
 *
 * Schema:
 *   create table snapshots (
 *     id text primary key,                  -- 'NASDAQ-2026-05-20'
 *     market text not null,
 *     captured_at timestamptz not null,
 *     entries jsonb not null,
 *     created_at timestamptz default now()
 *   );
 *
 * See docs/SUPABASE_SCHEMA.md for the full schema proposal.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SnapshotStore } from '@jion/integrations';
import type { MarketSnapshot } from '@jion/types';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase env missing. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local (server only).'
    );
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

export const supabaseSnapshotStore: SnapshotStore = {
  async saveSnapshot(snapshot: MarketSnapshot): Promise<void> {
    const supabase = getClient();
    const { error } = await supabase.from('snapshots').upsert({
      id: snapshot.id,
      market: snapshot.market,
      captured_at: snapshot.capturedAt,
      entries: snapshot.entries,
    });
    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }
  },
};
