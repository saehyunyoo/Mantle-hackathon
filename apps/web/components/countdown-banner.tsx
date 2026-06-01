"use client";

import { useEffect, useState } from "react";
import type { MarketCode } from "@jion/types";

interface CountdownBannerProps {
  market: MarketCode;
  marketLabel: string;
  marketFlag: string;
}

const DISMISS_KEY = "jion-countdown-dismissed-v1";

// Next-snapshot moment per market, in UTC. Hardcoded for the demo —
// real impl would respect DST + holiday calendar via the cron config.
const SNAPSHOT_UTC: Record<MarketCode, { hour: number; minute: number }> = {
  NASDAQ: { hour: 14, minute: 30 }, // 09:30 ET open + 1h = 10:30 ET ≈ 14:30 UTC (EDT)
  KRX: { hour: 1, minute: 0 }, // 09:00 KST open + 1h = 10:00 KST = 01:00 UTC
  TSE: { hour: 1, minute: 0 }, // 09:00 JST open + 1h = 10:00 JST = 01:00 UTC
  HKEX: { hour: 2, minute: 30 }, // placeholder
  LSE: { hour: 9, minute: 0 }, // placeholder
};

function nextSnapshotMs(market: MarketCode): number {
  const cfg = SNAPSHOT_UTC[market] ?? { hour: 14, minute: 30 };
  const now = new Date();
  const target = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      cfg.hour,
      cfg.minute,
      0,
    ),
  );
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target.getTime();
}

function formatDiff(ms: number): { h: string; m: string; s: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return {
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
  };
}

export function CountdownBanner({
  market,
  marketLabel,
  marketFlag,
}: CountdownBannerProps) {
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [target, setTarget] = useState(() => nextSnapshotMs(market));

  // hydrate dismiss flag from localStorage
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // recompute target when market changes
  useEffect(() => {
    setTarget(nextSnapshotMs(market));
  }, [market]);

  // tick once per second
  useEffect(() => {
    if (dismissed) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [dismissed]);

  if (!hydrated || dismissed) return null;

  const diff = target - now;
  const { h, m, s } = formatDiff(diff);

  const dismissPermanently = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const closeOnce = () => {
    setDismissed(true);
  };

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-violet-500/40 bg-gradient-to-r from-violet-500/[0.08] via-fuchsia-500/[0.06] to-violet-500/[0.08] p-4 shadow-[0_0_24px_-8px_rgba(168,85,247,0.45)]">
      <div
        className="pointer-events-none absolute inset-0 animate-pulse opacity-60"
        style={{
          background:
            "radial-gradient(circle at 20% 50%, rgba(168,85,247,0.18), transparent 60%), radial-gradient(circle at 80% 50%, rgba(232,121,249,0.14), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="flex items-center gap-2 text-sm">
          <span className="text-base">{marketFlag}</span>
          <span className="text-zinc-200">
            In{" "}
            <span className="font-mono text-base font-bold text-violet-200 tabular-nums">
              {h}:{m}:{s}
            </span>
            , the day&apos;s{" "}
            <span className="font-semibold text-zinc-50">hottest 10</span>{" "}
            <span className="font-medium text-zinc-100">{marketLabel}</span>{" "}
            stocks are tokenized.
          </span>
        </span>

        <div className="ml-auto flex items-center gap-3">
          <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200">
            <input
              type="checkbox"
              onChange={(e) => {
                if (e.target.checked) dismissPermanently();
              }}
              className="h-3 w-3 cursor-pointer rounded border-zinc-600 bg-zinc-900 text-violet-500 focus:ring-violet-500"
            />
            Don&apos;t show again
          </label>
          <button
            type="button"
            onClick={closeOnce}
            aria-label="Dismiss banner"
            className="rounded-md p-1 text-zinc-500 transition hover:bg-zinc-800/60 hover:text-zinc-200"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
