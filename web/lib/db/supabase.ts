/**
 * Supabase client.
 *
 * Owner: 세현
 * Tables (planned, W2):
 *   - tokens         (address, symbol, underlying, created_at, status)
 *   - decisions      (agent_id, kind, payload, tx_hash, created_at)
 *   - snapshots      (market, date, payload)
 *   - settlements    (token_address, settled_at, total_distributed)
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env not set. Copy .env.example to .env and fill SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}
