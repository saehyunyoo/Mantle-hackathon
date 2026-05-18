import type { Market } from '@jion/types';

export const MOCK_MARKETS: Market[] = [
  {
    code: 'NASDAQ',
    name: 'NASDAQ',
    timezone: 'America/New_York',
    openHour: 9,
    snapshotHour: 10,
    isMainnet: true,
  },
  {
    code: 'KRX',
    name: 'KRX (Korea Exchange)',
    timezone: 'Asia/Seoul',
    openHour: 9,
    snapshotHour: 10,
    isMainnet: false,
  },
  {
    code: 'TSE',
    name: 'Tokyo Stock Exchange',
    timezone: 'Asia/Tokyo',
    openHour: 9,
    snapshotHour: 10,
    isMainnet: false,
  },
];
