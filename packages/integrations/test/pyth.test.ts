import { test, expect, describe } from 'bun:test';
import {
  fetchPythPrices,
  fetchPythPricesByTicker,
  resolveFeedIds,
  PYTH_FEED_IDS_US,
} from '../src/pyth';

const HERMES_SAMPLE = {
  binary: {
    encoding: 'hex',
    data: ['504e4155deadbeef', '504e4155cafebabe'],
  },
  parsed: [
    {
      id: PYTH_FEED_IDS_US.NVDA!.replace(/^0x/, ''),
      price: {
        price: '124720000000', // raw int64
        conf: '5000000',
        expo: -8,
        publish_time: 1_700_000_000,
      },
    },
    {
      id: PYTH_FEED_IDS_US.TSLA!.replace(/^0x/, ''),
      price: {
        price: '24560000000',
        conf: '3000000',
        expo: -8,
        publish_time: 1_700_000_000,
      },
    },
  ],
};

function mockFetch(body: unknown, status = 200): typeof fetch {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
}

describe('resolveFeedIds', () => {
  test('resolves known US tickers', () => {
    const ids = resolveFeedIds(['NVDA', 'TSLA'], 'NASDAQ');
    expect(ids).toEqual([PYTH_FEED_IDS_US.NVDA, PYTH_FEED_IDS_US.TSLA]);
  });

  test('throws on unknown ticker', () => {
    expect(() => resolveFeedIds(['FAKE_TICKER'], 'NASDAQ')).toThrow(
      /Unknown Pyth feed/
    );
  });
});

describe('fetchPythPrices', () => {
  test('parses Hermes response and applies expo scaling', async () => {
    const { prices, updateData } = await fetchPythPrices(
      [PYTH_FEED_IDS_US.NVDA!, PYTH_FEED_IDS_US.TSLA!],
      { fetchImpl: mockFetch(HERMES_SAMPLE) }
    );

    // expo = -8 → raw 124720000000 / 1e8 = 1247.2
    expect(prices[PYTH_FEED_IDS_US.NVDA!]?.price).toBeCloseTo(1247.2);
    expect(prices[PYTH_FEED_IDS_US.TSLA!]?.price).toBeCloseTo(245.6);
    expect(prices[PYTH_FEED_IDS_US.NVDA!]?.publishTime).toBe(1_700_000_000);

    expect(updateData.length).toBe(2);
    expect(updateData[0]?.startsWith('0x')).toBe(true);
  });

  test('returns empty result on empty input without HTTP call', async () => {
    let called = false;
    const result = await fetchPythPrices([], {
      fetchImpl: (async () => {
        called = true;
        return new Response('{}', { status: 200 });
      }) as typeof fetch,
    });
    expect(result.prices).toEqual({});
    expect(result.updateData).toEqual([]);
    expect(called).toBe(false);
  });

  test('throws on Hermes non-2xx', async () => {
    await expect(
      fetchPythPrices([PYTH_FEED_IDS_US.NVDA!], {
        fetchImpl: mockFetch({}, 503),
      })
    ).rejects.toThrow(/503/);
  });
});

describe('fetchPythPricesByTicker', () => {
  test('returns prices keyed by ticker symbol', async () => {
    const { prices, updateData } = await fetchPythPricesByTicker(
      ['NVDA', 'TSLA'],
      'NASDAQ',
      { fetchImpl: mockFetch(HERMES_SAMPLE) }
    );

    expect(prices.NVDA?.price).toBeCloseTo(1247.2);
    expect(prices.TSLA?.price).toBeCloseTo(245.6);
    expect(updateData.length).toBe(2);
  });
});
