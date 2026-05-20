import Link from "next/link";

export function Nav() {
  return (
    <nav className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight text-zinc-50">
            Jion
          </span>
          <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Mantle Sepolia
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100"
          >
            Trending
          </Link>
          <Link
            href="/feed"
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100"
          >
            Oracle Feed
          </Link>
        </div>
      </div>
    </nav>
  );
}
