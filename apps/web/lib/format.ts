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

export function formatPrice(value: number, market: "USD" | "KRW" | "JPY"): string {
  if (market === "KRW") return `₩${value.toLocaleString("ko-KR")}`;
  if (market === "JPY") return `¥${value.toLocaleString("ja-JP")}`;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function marketCurrency(marketCode: string): "USD" | "KRW" | "JPY" {
  if (marketCode === "KRX") return "KRW";
  if (marketCode === "TSE") return "JPY";
  return "USD";
}
