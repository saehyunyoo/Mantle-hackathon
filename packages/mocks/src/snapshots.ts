import type { MarketSnapshot } from '@jion/types';

export const MOCK_SNAPSHOT_NASDAQ: MarketSnapshot = {
  id: 'NASDAQ-2026-05-20',
  market: 'NASDAQ',
  capturedAt: '2026-05-20T14:30:00Z',
  entries: [
    { rank: 1, ticker: 'NVDA', name: 'NVIDIA Corp', volume1h: 1_280_000_000, price: 942.31 },
    { rank: 2, ticker: 'TSLA', name: 'Tesla Inc', volume1h: 845_000_000, price: 178.42 },
    { rank: 3, ticker: 'AAPL', name: 'Apple Inc', volume1h: 612_000_000, price: 207.55 },
    { rank: 4, ticker: 'MSFT', name: 'Microsoft Corp', volume1h: 488_000_000, price: 432.10 },
    { rank: 5, ticker: 'AMD', name: 'Advanced Micro Devices', volume1h: 421_000_000, price: 168.74 },
    { rank: 6, ticker: 'META', name: 'Meta Platforms', volume1h: 380_000_000, price: 489.23 },
    { rank: 7, ticker: 'AMZN', name: 'Amazon.com', volume1h: 355_000_000, price: 184.67 },
    { rank: 8, ticker: 'GOOGL', name: 'Alphabet Class A', volume1h: 312_000_000, price: 173.55 },
    { rank: 9, ticker: 'AVGO', name: 'Broadcom Inc', volume1h: 287_000_000, price: 1422.50 },
    { rank: 10, ticker: 'PLTR', name: 'Palantir Technologies', volume1h: 261_000_000, price: 22.18 },
  ],
};

export const MOCK_SNAPSHOT_KRX: MarketSnapshot = {
  id: 'KRX-2026-05-20',
  market: 'KRX',
  capturedAt: '2026-05-20T01:00:00Z',
  entries: [
    { rank: 1, ticker: '005930', name: 'Samsung Electronics', volume1h: 285_000_000, price: 78_500 },
    { rank: 2, ticker: '000660', name: 'SK Hynix', volume1h: 198_000_000, price: 198_000 },
    { rank: 3, ticker: '373220', name: 'LG Energy Solution', volume1h: 142_000_000, price: 412_000 },
    { rank: 4, ticker: '207940', name: 'Samsung Biologics', volume1h: 98_000_000, price: 891_000 },
    { rank: 5, ticker: '005380', name: 'Hyundai Motor', volume1h: 87_000_000, price: 245_500 },
    { rank: 6, ticker: '035420', name: 'Naver', volume1h: 71_000_000, price: 182_000 },
    { rank: 7, ticker: '051910', name: 'LG Chem', volume1h: 65_000_000, price: 365_000 },
    { rank: 8, ticker: '006400', name: 'Samsung SDI', volume1h: 58_000_000, price: 308_000 },
    { rank: 9, ticker: '035720', name: 'Kakao', volume1h: 47_000_000, price: 41_200 },
    { rank: 10, ticker: '028260', name: 'Samsung C&T', volume1h: 39_000_000, price: 152_500 },
  ],
};

export const MOCK_SNAPSHOT_TSE: MarketSnapshot = {
  id: 'TSE-2026-05-20',
  market: 'TSE',
  capturedAt: '2026-05-20T01:00:00Z',
  entries: [
    { rank: 1, ticker: '7203', name: 'Toyota Motor', volume1h: 198_000_000, price: 3_421 },
    { rank: 2, ticker: '6758', name: 'Sony Group', volume1h: 142_000_000, price: 14_580 },
    { rank: 3, ticker: '8035', name: 'Tokyo Electron', volume1h: 121_000_000, price: 31_240 },
    { rank: 4, ticker: '6861', name: 'Keyence', volume1h: 98_000_000, price: 72_300 },
    { rank: 5, ticker: '9984', name: 'SoftBank Group', volume1h: 87_000_000, price: 9_865 },
    { rank: 6, ticker: '6098', name: 'Recruit Holdings', volume1h: 72_000_000, price: 8_412 },
    { rank: 7, ticker: '4063', name: 'Shin-Etsu Chemical', volume1h: 65_000_000, price: 5_891 },
    { rank: 8, ticker: '8306', name: 'Mitsubishi UFJ', volume1h: 58_000_000, price: 1_745 },
    { rank: 9, ticker: '6594', name: 'Nidec', volume1h: 47_000_000, price: 6_120 },
    { rank: 10, ticker: '7974', name: 'Nintendo', volume1h: 39_000_000, price: 8_543 },
  ],
};

export const MOCK_SNAPSHOTS_TODAY: MarketSnapshot[] = [
  MOCK_SNAPSHOT_NASDAQ,
  MOCK_SNAPSHOT_KRX,
  MOCK_SNAPSHOT_TSE,
];
