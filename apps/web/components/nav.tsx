import Link from "next/link";

const LINKS = [
  { href: "/", label: "Trending" },
  { href: "/reasoning", label: "Reasoning" },
  { href: "/performance", label: "Performance" },
  { href: "/feed", label: "Oracle Feed" },
  { href: "/integrate", label: "Build" },
];

export function Nav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5">
          {/* brand mark */}
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white shadow-lg shadow-brand-900/40">
            J
          </span>
          <span className="text-lg font-semibold tracking-tight text-zinc-50">
            Jion
          </span>
          <span className="hidden rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500 sm:inline">
            Mantle Sepolia
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
