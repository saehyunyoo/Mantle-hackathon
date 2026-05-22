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
  // Added 2026-05-22 — completes coverage of NASDAQ top-10 mock fixture.
  AVGO: '0xd0c9aef79b28308b256db7742a0a9b08aaa5009db67a52ea7fa30ed6853f243b', // Broadcom
  PLTR: '0x11a70634863ddffb71f2b11f2cff29f73f3db8f6d0b78c49f2b5f4ad36e885f0', // Palantir
};

// Korean tickers use numeric KRX codes; see Pyth `Equity.KR.{code}/KRW`.
// Resolved via Hermes `/v2/price_feeds?query=...&asset_type=equity` on 2026-05-20
// and extended on 2026-05-22 to cover the rest of the KRX top-10 mock fixture.
export const PYTH_FEED_IDS_KR: Record<string, string> = {
  '005930': '0x58082ed1358b8e7ce7c598f9bba441f9671dd7e6fa891b3f93fac8f9bc2f9865', // 삼성전자
  '000660': '0x189f0b6276a37a09fa9d4305525d074d753b30d83f1d748ae12330b9c86622c2', // SK하이닉스
  '352820': '0xfe9dc190a935c61b215171a202ffa506cab387ba76bbc6c60ba713d73730e78f', // HYBE
  '373220': '0x1af3de0f3771a78aa553a36ae1d39d67e6f483c719266df167fde9c3d16f4a84', // LG에너지솔루션
  '207940': '0x2d07bc4562ee7e079f01eef874858f4075b1db99461be987650e6c57611481cd', // 삼성바이오로직스
  '005380': '0x24ee596816f1bd1b141c3498e079d7ae7dc6ad1f864c79a08768bfd08a735092', // 현대차
  '035420': '0x24b692660b2d419d1f632fba44fd94ec3ff02a6c94b059f4da580d7383c2b486', // 네이버
  '051910': '0xf5825985d10068026b2490514024c9e0e6d7673aaaffaa23abe18f1ac2a0a4bd', // LG화학
  '006400': '0xc315a9beae70ac84d3278987c4422a740cd8d28427d01e119b49892083ad105d', // 삼성SDI
  '035720': '0xee045c053ae51ed1e7ea63cca4a1ac5d0c27cfea0f663e4f3c8176a814764bc9', // 카카오
  '028260': '0x8deddcd16a150f73c07fd8e221cc0558ae6ab270fb7c755c75eaeae375babddd', // 삼성물산
};

// Japanese tickers use numeric TSE codes; see Pyth `Equity.JP.{code}/JPY`.
// Added 2026-05-22 to bring TSE coverage from 0/10 → 10/10 in the mock fixture.
export const PYTH_FEED_IDS_JP: Record<string, string> = {
  '7203': '0x7909557e51732bff437c6a72c5ac1ae7d6fa521edbce767b26017072dd85e991', // Toyota
  '6758': '0x9516f9e32a5f8715afc0dafd3f81c5045d9838dd1ba56f66ec8e4e9073bfa0d4', // Sony
  '8035': '0x1dcf3e46a48b9ca084f57b5345cc94aefcdf1b635e263224ef67aace457eef7b', // Tokyo Electron
  '6861': '0xacc21d4c4a14c7699d0aa1a84a02b8962fdcdc7522f7fbeb6923d5145235069d', // Keyence
  '9984': '0x07055494bc693ea7cc99f0f2c91d32d588d3af5caaa455d7575c4abe0d496a97', // SoftBank Group
  '6098': '0x3e45f921833571b7b068f0d7b735ebd108b15e5daeda6c03d2b6c6f331971bff', // Recruit Holdings
  '4063': '0x76801a2db0107f42d4c8b46b4dea16e59574ae7df48377364866f353c8510491', // Shin-Etsu Chemical
  '8306': '0x60cacb48961333acbce07ab761d3d1925306df8916c6470135c69f45de3a8885', // Mitsubishi UFJ
  '6594': '0x795954f1103e7e0e37d40b3384afb8afab324c3ca1eb53def93b791918ff5bce', // Nidec
  '7974': '0x671a121a8f83e67fb6bcd784136d086d25941fad095e85e7f62139e4a1e71730', // Nintendo
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

/** Pyth feed table for a given market. */
export function feedTableFor(market: MarketCode): Record<string, string> {
  if (market === 'KRX') return PYTH_FEED_IDS_KR;
  if (market === 'TSE') return PYTH_FEED_IDS_JP;
  return PYTH_FEED_IDS_US;
}

/**
 * Resolve a list of ticker symbols to known Pyth feed IDs.
 * Tickers that aren't in our known list throw — caller should surface them.
 */
export function resolveFeedIds(tickers: string[], market: MarketCode): string[] {
  const table = feedTableFor(market);
  const out: string[] = [];
  const missing: string[] = [];

  for (const t of tickers) {
    const id = table[t];
    if (id) out.push(id);
    else missing.push(t);
  }

  if (missing.length > 0) {
    const tableName =
      market === 'KRX' ? 'KR' : market === 'TSE' ? 'JP' : 'US';
    throw new Error(
      `Unknown Pyth feed for tickers: ${missing.join(', ')} (market=${market}). ` +
        `Add to PYTH_FEED_IDS_${tableName} or fetch via Hermes search.`
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

  const table = feedTableFor(market);
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
