import { test, expect, describe } from 'bun:test';
import { runDailySnapshot, NULL_STORE, type SnapshotStore } from '../src/snapshot';
import { PYTH_FEED_IDS_US } from '../src/pyth';
import type { MarketSnapshot } from '@jion/types';

const POLYGON_BODY = {
  status: 'OK',
  tickers: [
    { ticker: 'NVDA', day: { v: 100_000_000, c: 1000 }, lastTrade: { p: 1001 } },
    { ticker: 'TSLA', day: { v: 75_000_000, c: 250 }, lastTrade: { p: 251 } },
    { ticker: 'AAPL', day: { v: 50_000_000, c: 200 }, lastTrade: { p: 200 } },
  ],
};

const HERMES_BODY = {
  binary: { encoding: 'hex', data: ['504e4155abcd'] },
  parsed: [
    {
      id: PYTH_FEED_IDS_US.NVDA!.replace(/^0x/, ''),
      price: { price: '124720000000', conf: '0', expo: -8, publish_time: 1 },
    },
    {
      id: PYTH_FEED_IDS_US.TSLA!.replace(/^0x/, ''),
      price: { price: '24560000000', conf: '0', expo: -8, publish_time: 1 },
    },
    // AAPL omitted — should fall back to Polygon price (200)
  ],
};

function mockFetchRouting(): typeof fetch {
  // Polygon URL contains "polygon.io" or our test apiKey path;
  // Hermes URL contains "hermes.pyth.network".
  return (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : (input as URL).toString();
    if (url.includes('polygon')) {
      return new Response(JSON.stringify(POLYGON_BODY), { status: 200 });
    }
    if (url.includes('hermes')) {
      return new Response(JSON.stringify(HERMES_BODY), { status: 200 });
    }
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
}

describe('runDailySnapshot', () => {
  test('composes Polygon top-N + Pyth oracle prices', async () => {
    const fetchImpl = mockFetchRouting();
    const snapshot = await runDailySnapshot('NASDAQ', NULL_STORE, {
      polygon: { apiKey: 'test', fetchImpl },
      pyth: { fetchImpl },
      now: new Date('2026-05-20T13:30:00Z'),
    });

    expect(snapshot.id).toBe('NASDAQ-2026-05-20');
    expect(snapshot.market).toBe('NASDAQ');
    expect(snapshot.entries.length).toBe(3);

    // NVDA: Pyth price overrides Polygon
    expect(snapshot.entries[0]?.ticker).toBe('NVDA');
    expect(snapshot.entries[0]?.price).toBeCloseTo(1247.2);

    // AAPL: no Pyth → keeps Polygon last-trade price (200)
    const aapl = snapshot.entries.find((e) => e.ticker === 'AAPL');
    expect(aapl?.price).toBe(200);
  });

  test('persists snapshot via injected store', async () => {
    const saved: MarketSnapshot[] = [];
    const store: SnapshotStore = {
      async saveSnapshot(s) {
        saved.push(s);
      },
    };

    const fetchImpl = mockFetchRouting();
    await runDailySnapshot('NASDAQ', store, {
      polygon: { apiKey: 'test', fetchImpl },
      pyth: { fetchImpl },
      now: new Date('2026-05-20T13:30:00Z'),
    });

    expect(saved.length).toBe(1);
    expect(saved[0]?.id).toBe('NASDAQ-2026-05-20');
  });

  test('falls back gracefully when Pyth call fails', async () => {
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as URL).toString();
      if (url.includes('polygon')) {
        return new Response(JSON.stringify(POLYGON_BODY), { status: 200 });
      }
      // Hermes returns 500 → snapshot still works with Polygon prices.
      return new Response('boom', { status: 500 });
    }) as typeof fetch;

    const snapshot = await runDailySnapshot('NASDAQ', NULL_STORE, {
      polygon: { apiKey: 'test', fetchImpl },
      pyth: { fetchImpl },
      now: new Date('2026-05-20T13:30:00Z'),
    });

    expect(snapshot.entries.length).toBe(3);
    expect(snapshot.entries[0]?.price).toBe(1001); // Polygon lastTrade.p
  });

  test('throws when Polygon returns no tickers', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ status: 'OK', tickers: [] }), {
        status: 200,
      })) as typeof fetch;

    await expect(
      runDailySnapshot('NASDAQ', NULL_STORE, {
        polygon: { apiKey: 'test', fetchImpl },
      })
    ).rejects.toThrow(/0 tickers/);
  });
});
