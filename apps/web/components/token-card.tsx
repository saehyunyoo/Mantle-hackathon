import Link from "next/link";
import type {
  DeFiListing,
  MarketCode,
  SnapshotEntry,
  TokenDistribution,
} from "@jion/types";
import { PROTOCOL_LABEL } from "@jion/mocks";
import {
  formatPrice,
  formatUsd,
  formatUsdcPrice,
  marketCurrency,
  toUsd,
} from "@/lib/format";

interface TokenCardProps {
  entry: SnapshotEntry;
  livePrice?: number;
  market: MarketCode;
  issuedAt: string;
  distribution?: TokenDistribution;
}

const ISSUE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

function primaryTradeVenue(distribution?: TokenDistribution): DeFiListing | null {
  if (!distribution) return null;
  const amm = distribution.listings.find((l) => l.kind === "amm-pool");
  return amm ?? distribution.listings[0] ?? null;
}

function BuySellTabs({
  distribution,
  symbol,
}: {
  distribution?: TokenDistribution;
  symbol: string;
}) {
  const venue = primaryTradeVenue(distribution);
  if (!venue) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-center text-[11px] text-zinc-600">
        Trading opens once routing lands
      </div>
    );
  }

  const venueLabel = PROTOCOL_LABEL[venue.protocol] ?? venue.protocol;
  const buyHref = `${venue.url}${venue.url.includes("?") ? "&" : "?"}side=buy&token=${encodeURIComponent(symbol)}`;
  const sellHref = `${venue.url}${venue.url.includes("?") ? "&" : "?"}side=sell&token=${encodeURIComponent(symbol)}`;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={buyHref}
          target="_blank"
          rel="noreferrer"
          className="group/btn inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-200"
          title={`Buy ${symbol} on ${venueLabel}`}
        >
          Buy
          <span className="text-[10px] opacity-70 group-hover/btn:opacity-100">↗</span>
        </a>
        <a
          href={sellHref}
          target="_blank"
          rel="noreferrer"
          className="group/btn inline-flex items-center justify-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:border-rose-400 hover:bg-rose-500/20 hover:text-rose-200"
          title={`Sell ${symbol} on ${venueLabel}`}
        >
          Sell
          <span className="text-[10px] opacity-70 group-hover/btn:opacity-100">↗</span>
        </a>
      </div>
      <div className="mt-1.5 text-center text-[10px] text-zinc-500">
        Trade on{" "}
        <span className="font-medium text-zinc-300">{venueLabel}</span>
      </div>
    </div>
  );
}

function ListingPill({ listing }: { listing: DeFiListing }) {
  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-1 text-[10px] font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-50"
      title={`${listing.kind} on ${PROTOCOL_LABEL[listing.protocol]} — TVL ${formatUsd(listing.tvlUsd)} · Mock listing (Phase 2+ live integration)`}
    >
      {PROTOCOL_LABEL[listing.protocol] ?? listing.protocol}
      <span
        className="rounded-sm border border-amber-700/40 bg-amber-900/20 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-amber-400"
        title="Mock listing — real venue integration in Phase 2+"
      >
        Mock
      </span>
      <span className="text-zinc-500">↗</span>
    </a>
  );
}

export function TokenCard({
  entry,
  livePrice,
  market,
  issuedAt,
  distribution,
}: TokenCardProps) {
  const currency = marketCurrency(market);
  const issueDate = new Date(issuedAt);
  const symbol = `m${entry.ticker}`;
  const displayPrice = livePrice ?? entry.price;
  const displayPriceUsd = toUsd(displayPrice, currency);
  const delta = displayPrice - entry.price;
  const deltaPercent = (delta / entry.price) * 100;
  const deltaColor =
    delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-zinc-500";

  return (
    <div className="group relative flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700 hover:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          Issued {issueDate.toLocaleDateString("en-US", ISSUE_DATE_FORMAT)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
            <span className="h-1 w-1 rounded-full bg-violet-400" />
            PYTH
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
            LIVE
          </span>
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-1 font-mono text-xs text-zinc-500">#{entry.rank}</div>
        <div
          className="line-clamp-2 min-h-[3rem] text-xl font-semibold leading-tight text-zinc-100"
          title={entry.name}
        >
          {entry.name}
        </div>
      </div>

      <div className="mb-5 space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-zinc-500">Price</span>
          <div className="flex flex-col items-end">
            <span className="font-mono text-base font-semibold tabular-nums text-zinc-100">
              {formatUsdcPrice(displayPriceUsd)}
            </span>
            {currency !== "USD" && (
              <span className="font-mono text-[10px] tabular-nums text-zinc-500">
                {formatPrice(displayPrice, currency)} native
              </span>
            )}
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-zinc-500">Change · live</span>
          <span className={`font-mono text-xs tabular-nums ${deltaColor}`}>
            {delta >= 0 ? "+" : ""}
            {deltaPercent.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-zinc-500">1H Volume</span>
          <span className="font-mono text-sm text-zinc-300">
            {formatUsd(entry.volume1h)}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-sm font-medium text-zinc-200">{entry.ticker}</span>
          <span className="text-xs text-zinc-500">· {market}</span>
          <span className="ml-auto font-mono text-[10px] text-zinc-600">
            {symbol}
          </span>
        </div>
        <BuySellTabs distribution={distribution} symbol={symbol} />
      </div>

      {distribution ? (
        <div className="mt-auto rounded-xl border border-violet-500/30 bg-violet-500/[0.04] p-3">
          <Link
            href={`/route/${encodeURIComponent(distribution.tokenSymbol)}`}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200"
          >
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500/20 px-1 text-[11px] font-bold leading-none text-violet-200">
              AI
            </span>
            Why this route →
          </Link>
          <div className="flex flex-wrap gap-1.5">
            {distribution.listings.map((l) => (
              <ListingPill key={`${l.protocol}-${l.listingAddress}`} listing={l} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-auto rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
            Routing soon
          </div>
          <div className="text-[11px] text-zinc-600">
            AI will assign best venues at issuance.
          </div>
        </div>
      )}
    </div>
  );
}
