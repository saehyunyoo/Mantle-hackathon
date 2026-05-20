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

function ListingPill({ listing }: { listing: DeFiListing }) {
  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-1 text-[10px] font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-50"
      title={`${listing.kind} on ${PROTOCOL_LABEL[listing.protocol]} — TVL ${formatUsd(listing.tvlUsd)}`}
    >
      {PROTOCOL_LABEL[listing.protocol] ?? listing.protocol}
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
  const symbol = `m${entry.ticker}-${issuedAt.slice(0, 10).replaceAll("-", "")}`;
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
        <div className="text-xl font-semibold leading-tight text-zinc-100">
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
        <div className="mb-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
          <span>
            {distribution
              ? `Smart-routed to ${distribution.listings.length} venue${distribution.listings.length === 1 ? "" : "s"}`
              : "Routing soon"}
          </span>
          {distribution && (
            <Link
              href={`/route/${encodeURIComponent(distribution.tokenSymbol)}`}
              className="font-normal normal-case tracking-normal text-violet-300 hover:text-violet-200"
            >
              View routing →
            </Link>
          )}
        </div>
        {distribution ? (
          <div className="flex flex-wrap gap-1.5">
            {distribution.listings.map((l) => (
              <ListingPill key={`${l.protocol}-${l.listingAddress}`} listing={l} />
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-zinc-600">
            AI distribution will be assigned at issuance.
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-zinc-800 pt-4">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-sm font-medium text-zinc-200">{entry.ticker}</span>
          <span className="text-xs text-zinc-500">· {market}</span>
        </div>
        <div className="font-mono text-[10px] text-zinc-600">Token {symbol}</div>
      </div>
    </div>
  );
}
