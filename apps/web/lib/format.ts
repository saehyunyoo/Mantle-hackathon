export type Currency = "USD" | "KRW" | "JPY";

const MOCK_FX_TO_USD: Record<Currency, number> = {
  USD: 1,
  KRW: 1 / 1380,
  JPY: 1 / 152,
};

export function formatUsd(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

export function formatPrice(value: number, currency: Currency): string {
  if (currency === "KRW") return `₩${value.toLocaleString("ko-KR")}`;
  if (currency === "JPY") return `¥${value.toLocaleString("ja-JP")}`;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatUsdcPrice(value: number): string {
  if (value >= 1000) {
    return `${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USDC`;
  }
  if (value >= 1) {
    return `${value.toFixed(2)} USDC`;
  }
  return `${value.toFixed(4)} USDC`;
}

export function toUsd(price: number, currency: Currency): number {
  return price * MOCK_FX_TO_USD[currency];
}

export function marketCurrency(marketCode: string): Currency {
  if (marketCode === "KRX") return "KRW";
  if (marketCode === "TSE") return "JPY";
  return "USD";
}
