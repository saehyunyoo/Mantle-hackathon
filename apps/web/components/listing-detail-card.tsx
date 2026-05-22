import type { DeFiListing } from "@jion/types";
import { PROTOCOL_LABEL } from "@jion/mocks";
import { formatUsd } from "@/lib/format";
import { explorerAddress, shortAddress } from "@/lib/explorer";

interface ListingDetailCardProps {
  listing: DeFiListing;
  rank: number;
  /** Ticker (e.g. "NVDA") for labeling the token side of the seed. */
  ticker?: string;
}

const KIND_LABEL: Record<string, string> = {
  "amm-pool": "AMM Pool",
  collateral: "Collateral",
  "lending-market": "Lending Market",
};

const KIND_COLOR: Record<string, string> = {
  "amm-pool": "text-sky-300 border-sky-500/30 bg-sky-500/10",
  collateral: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  "lending-market": "text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/10",
};

export function ListingDetailCard({
  listing,
  rank,
  ticker,
}: ListingDetailCardProps) {
  const protocolLabel = PROTOCOL_LABEL[listing.protocol] ?? listing.protocol;
  const kindLabel = KIND_LABEL[listing.kind] ?? listing.kind;
  const kindColor =
    KIND_COLOR[listing.kind] ??
    "text-zinc-300 border-zinc-700 bg-zinc-800/60";

  const hasSeed =
    listing.seededTokenUnits !== undefined &&
    listing.seededUsdcUnits !== undefined;
  const weightPct =
    listing.weightBps !== undefined ? (listing.weightBps / 100).toFixed(1) : null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-zinc-500">#{rank}</span>
        <div className="flex items-center gap-1.5">
          {weightPct && (
            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              {weightPct}% mint
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${kindColor}`}
          >
            {kindLabel}
          </span>
        </div>
      </div>

      <div>
        <div className="text-lg font-semibold text-zinc-100">{protocolLabel}</div>
        <a
          href={explorerAddress(listing.listingAddress)}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[11px] text-zinc-500 hover:text-zinc-300"
        >
          {shortAddress(listing.listingAddress)} ↗
        </a>
      </div>

      {hasSeed && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              Initial seed
            </span>
            <span className="text-[10px] text-zinc-600">at oracle price</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-zinc-500">
                {ticker ? `m${ticker}` : "Token"}
              </div>
              <div className="font-mono text-sm font-semibold tabular-nums text-zinc-100">
                {Number(listing.seededTokenUnits).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500">USDC</div>
              <div className="font-mono text-sm font-semibold tabular-nums text-zinc-100">
                {formatUsd(listing.seededUsdcUnits ?? 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Initial TVL
          </div>
          <div className="font-mono text-sm font-semibold tabular-nums text-zinc-100">
            {formatUsd(listing.tvlUsd)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            24h Volume
          </div>
          <div className="font-mono text-sm tabular-nums text-zinc-300">
            {listing.volume24hUsd > 0 ? formatUsd(listing.volume24hUsd) : "—"}
          </div>
        </div>
      </div>

      {listing.reasoning && (
        <div className="border-t border-zinc-800 pt-3 text-xs leading-relaxed text-zinc-400">
          <span className="text-zinc-500">Why this venue: </span>
          {listing.reasoning}
        </div>
      )}

      <a
        href={listing.url}
        target="_blank"
        rel="noreferrer"
        className="mt-auto inline-flex w-fit items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-50"
      >
        Open on {protocolLabel}
        <span className="text-zinc-500">↗</span>
      </a>
    </div>
  );
}
