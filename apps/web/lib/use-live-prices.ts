"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 3000;
const MAX_DRIFT_PERCENT = 0.3;

export function useLivePrices(basePrices: number[], intervalMs = POLL_INTERVAL_MS) {
  const [prices, setPrices] = useState<number[]>(basePrices);
  const [updatedAt, setUpdatedAt] = useState<string>(() => new Date().toISOString());

  useEffect(() => {
    setPrices(basePrices);
  }, [basePrices]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPrices((prev) =>
        prev.map((p) => {
          const drift = (Math.random() * 2 - 1) * (MAX_DRIFT_PERCENT / 100);
          return p * (1 + drift);
        }),
      );
      setUpdatedAt(new Date().toISOString());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return { prices, updatedAt };
}
