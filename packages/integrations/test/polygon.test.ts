import { test, expect, describe } from 'bun:test';
import { fetchTopVolume } from '../src/polygon';

const POLYGON_SAMPLE = {
  status: 'OK',
  tickers: [
    {
      ticker: 'AAPL',
      day: { v: 50_000_000, c: 200, vw: 199.8 },
      lastTrade: { p: 200.5 },
    },
    {
      ticker: 'NVDA',
      day: { v: 100_000_000, c: 1000, vw: 999.5 },
      lastTrade: { p: 1001 },
    },
    {
      ticker: 'TSLA',
      day: { v: 75_000_000, c: 250 },
      lastTrade: { p: 251 },
    },
    {
      ticker: 'NOVOLUME',
      day: { v: 0, c: 1 }, // should be filtered out
    },
    {
      ticker: 'XYZ',
      day: { v: 1_000_000, c: 10 },
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

describe('fetchTopVolume', () => {
  test('ranks NASDAQ tickers by descending day.v and limits to N', async () => {
    const result = await fetchTopVolume('NASDAQ', 3, {
      apiKey: 'test',
      fetchImpl: mockFetch(POLYGON_SAMPLE),
    });

    expect(result.length).toBe(3);
    expect(result[0]?.ticker).toBe('NVDA'); // 100M
    expect(result[1]?.ticker).toBe('TSLA'); // 75M
    expect(result[2]?.ticker).toBe('AAPL'); // 50M
    expect(result[0]?.rank).toBe(1);
    expect(result[2]?.rank).toBe(3);
  });

  test('filters out tickers with zero volume', async () => {
    const result = await fetchTopVolume('NASDAQ', 10, {
      apiKey: 'test',
      fetchImpl: mockFetch(POLYGON_SAMPLE),
    });
    expect(result.find((e) => e.ticker === 'NOVOLUME')).toBeUndefined();
  });

  test('prefers lastTrade.p over day.c for price', async () => {
    const result = await fetchTopVolume('NASDAQ', 1, {
      apiKey: 'test',
      fetchImpl: mockFetch(POLYGON_SAMPLE),
    });
    expect(result[0]?.price).toBe(1001); // lastTrade.p, not day.c (1000)
  });

  test('attaches display name from whitelist', async () => {
    const result = await fetchTopVolume('NASDAQ', 1, {
      apiKey: 'test',
      fetchImpl: mockFetch(POLYGON_SAMPLE),
    });
    expect(result[0]?.name).toBe('NVIDIA Corp');
  });

  test('falls back to ticker when name unknown', async () => {
    const result = await fetchTopVolume('NASDAQ', 10, {
      apiKey: 'test',
      fetchImpl: mockFetch(POLYGON_SAMPLE),
    });
    const xyz = result.find((e) => e.ticker === 'XYZ');
    expect(xyz?.name).toBe('XYZ');
  });

  test('throws on non-NASDAQ markets (KRX / TSE not supported by Polygon)', async () => {
    await expect(
      fetchTopVolume('KRX', 10, { apiKey: 'test', fetchImpl: mockFetch({}) })
    ).rejects.toThrow(/US markets only/);
  });

  test('throws when API key missing', async () => {
    delete process.env.POLYGON_IO_API_KEY;
    await expect(fetchTopVolume('NASDAQ', 10)).rejects.toThrow(/POLYGON_IO_API_KEY/);
  });

  test('throws on non-2xx HTTP', async () => {
    await expect(
      fetchTopVolume('NASDAQ', 10, {
        apiKey: 'test',
        fetchImpl: mockFetch({ error: 'rate limited' }, 429),
      })
    ).rejects.toThrow(/429/);
  });
});
