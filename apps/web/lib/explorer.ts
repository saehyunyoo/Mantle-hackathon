const MANTLE_SEPOLIA_EXPLORER = "https://explorer.sepolia.mantle.xyz";

export function explorerAddress(addr: string): string {
  return `${MANTLE_SEPOLIA_EXPLORER}/address/${addr}`;
}

export function explorerTx(hash: string): string {
  return `${MANTLE_SEPOLIA_EXPLORER}/tx/${hash}`;
}

export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
