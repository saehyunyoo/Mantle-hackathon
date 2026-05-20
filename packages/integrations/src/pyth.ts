/**
 * Pyth Network — Hermes HTTP API wrapper.
 *
 * Used by:
 *   - T4 snapshot cron (read latest equity prices for display)
 *   - T5 TokenFactory cron (compute initial token price + supply on mint)
 *   - T6 settlement cron (oracle price for force-settle distribution)
 *
 * Pull-oracle pattern (per docs/RESEARCH.md §1.4):
 *   1. Off-chain code (this file) hits Hermes for fresh prices + update payloads
 *   2. The update payload is passed to OracleAdapter.updateAndRead()
 *      together with msg.value = pyth.getUpdateFee(...)
 *
 * Hermes does NOT require an API key — free, public, rate-limited.
 *
 * Mantle Sepolia Pyth contract: 0x98046Bd286715D3B0BC227Dd7a956b83D8978603
 */
import { z } from 'zod';
import type { MarketCode } from '@jion/types';

// ---------------------------------------------------------------------------
// Known Pyth feed IDs (per docs/RESEARCH.md §1.2 §1.3, verified against Hermes
// API on 2026-05-18). Full IDs — these are stable identifiers.
//
// Convention: equity tickers WITHOUT prefix (NVDA, not Equity.US.NVDA/USD).
// ---------------------------------------------------------------------------

export const PYTH_FEED_IDS_US: Record<string, string> = {
  NVDA: '0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593',
  TSLA: '0x713631e41c06db404e6a5d029f3eebfd5b885c59dce4a19f337c024e26584e26',
  AAPL: '0x8c320e4cd87c6cef41513aead15db413cf9253211923fef6e87187a7f6688906',
  MSFT: '0x556b3e4dcc1c66448ba4054a0d9485545e3227ffc90a269f630620c5a38241ab',
  MSTR: '0xc3055f49e1dc863a7f24d9b83e86fe10d7d16fb583bc6445505b01d230e0d647',
  AMD: '0x6969003ef4c5fbb3b57a6be3883102362d05572c2dc7f72b767ad48f4206204b',
  GOOGL: '0x07d24bb76843496a45bce0add8b51555f2ea02098cb04f4c6d61f7b5720836b4',
  META: '0xce0999c4f22f35f00e8f9913694868d00279c0b9efbd7cb1c358bf2fd76295c9',
  AMZN: '0x82c59e36a8e0247e15283748d6cd51f5fa1019d73fbf3ab6d927e17d9e357a7f',
};

// Korean tickers use numeric KRX codes; see Pyth `Equity.KR.{code}/KRW`.
// Resolved via Hermes `/v2/price_feeds?query=...&asset_type=equity` on 2026-05-20.
export const PYTH_FEED_IDS_KR: Record<string, string> = {
  '005930': '0x58082ed1358b8e7ce7c598f9bba441f9671dd7e6fa891b3f93fac8f9bc2f9865', // 삼성전자
  '000660': '0x189f0b6276a37a09fa9d4305525d074d753b30d83f1d748ae12330b9c86622c2', // SK하이닉스
  '352820': '0xfe9dc190a935c61b215171a202ffa506cab387ba76bbc6c60ba713d73730e78f', // HYBE
};

// ---------------------------------------------------------------------------
// Hermes API response schemas
// ---------------------------------------------------------------------------

const PriceInfo = z.object({
  price: z.string(), // int64 as string
  conf: z.string(),
  expo: z.number(),
  publish_time: z.number(),
});

const PriceFeed = z.object({
  id: z.string(),
  price: PriceInfo,
  ema_price: PriceInfo.optional(),
});

const LatestPriceUpdatesResponse = z.object({
  binary: z.object({
    encoding: z.string(),
    data: z.array(z.string()), // hex-encoded VAA payloads, pass to updatePriceFeeds
  }),
  parsed: z.array(PriceFeed),
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PythPrice {
  feedId: string;
  /** USD price as a JS number (decimal-applied via expo). */
  price: number;
  /** Confidence interval in USD. */
  conf: number;
  /** Pyth's `expo` field — internal scaling exponent (negative for stocks). */
  expo: number;
  /** Unix seconds when this update was published. */
  publishTime: number;
}

export interface PythBatchResult {
  /** Parsed prices, keyed by Pyth feed id (with leading 0x). */
  prices: Record<string, PythPrice>;
  /** Raw binary update payloads — pass to `OracleAdapter.updateAndRead`. */
  updateData: `0x${string}`[];
}

export interface FetchPythOptions {
  hermesUrl?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Resolve a list of ticker symbols to known Pyth feed IDs.
 * Tickers that aren't in our known list throw — caller should surface them.
 */
export function resolveFeedIds(tickers: string[], market: MarketCode): string[] {
  const table = market === 'KRX' ? PYTH_FEED_IDS_KR : PYTH_FEED_IDS_US;
  const out: string[] = [];
  const missing: string[] = [];

  for (const t of tickers) {
    const id = table[t];
    if (id) out.push(id);
    else missing.push(t);
  }

  if (missing.length > 0) {
    throw new Error(
      `Unknown Pyth feed for tickers: ${missing.join(', ')} (market=${market}). ` +
        `Add to PYTH_FEED_IDS_${market === 'KRX' ? 'KR' : 'US'} or fetch via Hermes search.`
    );
  }
  return out;
}

/**
 * Hit Hermes for fresh prices on the given feed IDs, plus the binary
 * update payloads needed for on-chain `updatePriceFeeds`.
 */
export async function fetchPythPrices(
  feedIds: string[],
  options: FetchPythOptions = {}
): Promise<PythBatchResult> {
  if (feedIds.length === 0) {
    return { prices: {}, updateData: [] };
  }

  const baseUrl = options.hermesUrl ?? 'https://hermes.pyth.network';
  const fetchFn = options.fetchImpl ?? fetch;

  // ids[]=... query string
  const params = feedIds.map((id) => `ids[]=${encodeURIComponent(id)}`).join('&');
  const url = `${baseUrl}/v2/updates/price/latest?${params}&encoding=hex`;

  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`Hermes returned ${res.status} ${res.statusText}`);
  }
  const raw = await res.json();
  const parsed = LatestPriceUpdatesResponse.parse(raw);

  const prices: Record<string, PythPrice> = {};
  for (const p of parsed.parsed) {
    const expo = p.price.expo;
    const rawPrice = Number(p.price.price);
    const rawConf = Number(p.price.conf);
    const id = p.id.startsWith('0x') ? p.id : `0x${p.id}`;
    prices[id] = {
      feedId: id,
      price: rawPrice * 10 ** expo,
      conf: rawConf * 10 ** expo,
      expo,
      publishTime: p.price.publish_time,
    };
  }

  const updateData = parsed.binary.data.map((d) =>
    (d.startsWith('0x') ? d : `0x${d}`) as `0x${string}`
  );

  return { prices, updateData };
}

/**
 * High-level convenience: tickers in → prices keyed by ticker out.
 *
 * Combines `resolveFeedIds` + `fetchPythPrices` and re-keys by ticker
 * so callers don't need to track feed IDs.
 */
export async function fetchPythPricesByTicker(
  tickers: string[],
  market: MarketCode,
  options: FetchPythOptions = {}
): Promise<{ prices: Record<string, PythPrice>; updateData: `0x${string}`[] }> {
  const feedIds = resolveFeedIds(tickers, market);
  const { prices, updateData } = await fetchPythPrices(feedIds, options);

  const table = market === 'KRX' ? PYTH_FEED_IDS_KR : PYTH_FEED_IDS_US;
  const idToTicker: Record<string, string> = {};
  for (const [t, id] of Object.entries(table)) {
    idToTicker[id.toLowerCase()] = t;
  }

  const byTicker: Record<string, PythPrice> = {};
  for (const [feedId, price] of Object.entries(prices)) {
    const ticker = idToTicker[feedId.toLowerCase()];
    if (ticker) byTicker[ticker] = price;
  }

  return { prices: byTicker, updateData };
}
