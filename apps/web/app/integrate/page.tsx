import Link from "next/link";
import { MANTLE_SEPOLIA_ADDRESSES } from "@jion/types";

export const metadata = {
  title: "Build with Jion · Integrate",
  description:
    "Implement IJionAdapter and receive daily distribution flow from Jion-issued RWA tokens on Mantle.",
};

const ADAPTER_INTERFACE = `interface IJionAdapter {
    function name() external view returns (string memory);
    function kind() external view returns (uint8); // 0 AMM | 1 LENDING | 2 PERP | 3 OPTIONS

    function list(
        address token,
        address quote,
        uint256 amountToken,
        uint256 amountQuote
    ) external returns (bytes32 positionId);

    function withdraw(bytes32 positionId)
        external returns (uint256 amountTokenOut, uint256 amountQuoteOut);

    function volume24h(address token) external view returns (uint256 usdVolume);
    function isHealthy() external view returns (bool);
}`;

const TOKEN_METADATA = `// Every Jion-issued token exposes these alongside the standard ERC-20 surface.
contract JionToken is ERC20, Ownable {
    string  public underlying;       // "NVDA"
    string  public market;           // "NASDAQ" | "KRX" | "TSE"
    uint256 public immutable issuedAt;
    bytes32 public immutable pythFeedId;
}`;

const DEX_SNIPPET = `// DEX adapter — wrap your V2-style pool. Position id = pool address.
function list(address token, address quote, uint256 amountToken, uint256 amountQuote)
    external returns (bytes32 positionId)
{
    address pair = factory.getPair(token, quote);
    IERC20(token).transfer(pair, amountToken);
    IERC20(quote).transfer(pair, amountQuote);
    IMyDexPair(pair).mint(address(this));
    return bytes32(uint256(uint160(pair)));
}`;

const LENDING_SNIPPET = `// Lending adapter — register the new token as collateral, deposit seed liquidity.
function list(address token, address /*quote*/, uint256 amountToken, uint256 /*amountQuote*/)
    external returns (bytes32 positionId)
{
    uint64 marketId = pool.registerAsset(token, DEFAULT_LTV_BPS);
    IERC20(token).approve(address(pool), amountToken);
    uint256 shares = pool.supply(marketId, amountToken);
    return bytes32((uint256(marketId) << 192) | shares);
}`;

const TS_WATCHER = `import { createPublicClient, http, parseAbiItem } from "viem";
import { mantleSepoliaTestnet } from "viem/chains";

const client = createPublicClient({ chain: mantleSepoliaTestnet, transport: http() });

client.watchEvent({
  address: "${MANTLE_SEPOLIA_ADDRESSES.Distributor}", // Distributor
  event: parseAbiItem(
    "event TokenDistributed(address indexed token, address indexed adapter, uint256 amountToken, uint256 amountQuote, uint16 weightBps, bytes32 positionId)",
  ),
  onLogs: (logs) => logs.forEach((log) => console.log("listed:", log.args)),
});`;

const SEPOLIA_ROW_CLASS =
  "border-b border-zinc-900 last:border-0 [&>td]:py-2 [&>td]:align-top";

const SEPOLIA_DEPLOYMENTS: Array<{ label: string; addr: string; note?: string }> = [
  { label: "TokenFactory", addr: MANTLE_SEPOLIA_ADDRESSES.TokenFactory },
  { label: "Distributor", addr: MANTLE_SEPOLIA_ADDRESSES.Distributor },
  { label: "Settlement", addr: MANTLE_SEPOLIA_ADDRESSES.Settlement },
  { label: "OracleAdapter", addr: MANTLE_SEPOLIA_ADDRESSES.OracleAdapter },
  { label: "AgentLogger", addr: MANTLE_SEPOLIA_ADDRESSES.AgentLogger },
  {
    label: "SelfPoolAdapter",
    addr: MANTLE_SEPOLIA_ADDRESSES.SelfPoolAdapter,
    note: "real",
  },
  {
    label: "MerchantMoeMockAdapter",
    addr: MANTLE_SEPOLIA_ADDRESSES.MerchantMoeMockAdapter,
    note: "mock reference impl",
  },
  {
    label: "LendleMockAdapter",
    addr: MANTLE_SEPOLIA_ADDRESSES.LendleMockAdapter,
    note: "mock reference impl",
  },
  { label: "MockUSDC (quote)", addr: MANTLE_SEPOLIA_ADDRESSES.USDC },
  { label: "Pyth (Hermes)", addr: MANTLE_SEPOLIA_ADDRESSES.Pyth },
];

function explorer(addr: string) {
  return `https://explorer.sepolia.mantle.xyz/address/${addr}`;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-zinc-900 bg-zinc-950/80 p-4 text-xs leading-relaxed text-zinc-200">
      <code className="font-mono">{children}</code>
    </pre>
  );
}

function SectionHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-4">
      <div className="text-[10px] uppercase tracking-wider text-violet-400">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-xl font-semibold text-zinc-50">{title}</h2>
      {children && (
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">{children}</p>
      )}
    </header>
  );
}

export default function IntegratePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-8 lg:px-12">
      <header className="mb-12">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          Developer guide · Phase 1
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Build with Jion
        </h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-400">
          Jion is infrastructure, not a venue. Implement{" "}
          <span className="font-mono text-zinc-200">IJionAdapter</span> and your
          DEX, lending market, or options vault automatically receives flow when
          Jion issues a new daily RWA token. Five minutes to read, one
          Solidity file to ship.
        </p>
      </header>

      {/* --- Concept --- */}
      <section className="mb-14">
        <SectionHeader eyebrow="01 · Concept" title="What Jion gives you">
          Every market day, Jion auto-mints one synthetic ERC-20 per top-volume
          stock (one per ticker, symbol{" "}
          <span className="font-mono text-zinc-300">mTICKER</span>). The
          Distributor fans out the initial supply to all whitelisted adapters by
          AI-weighted distribution. If your venue implements the adapter, you
          get a fresh listing — with seed liquidity — every day for free.
        </SectionHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              t: "1. Issue",
              b: "TokenFactory mints mTICKER + seeds the Distributor with token + USDC.",
            },
            {
              t: "2. Route",
              b: "AI router emits per-adapter weights based on kind(), volume24h(), isHealthy().",
            },
            {
              t: "3. List",
              b: "Distributor pushes funds to each adapter and calls list() — you receive a position.",
            },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-lg border border-zinc-900 bg-zinc-950/60 p-4"
            >
              <div className="text-xs font-medium text-violet-400">{c.t}</div>
              <div className="mt-1 text-sm text-zinc-300">{c.b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Interface --- */}
      <section className="mb-14">
        <SectionHeader eyebrow="02 · Interface" title="IJionAdapter">
          The single Solidity interface every venue implements. Source on{" "}
          <a
            href="https://github.com/saehyunyoo/Mantle-hackathon/blob/main/contracts/src/adapters/IJionAdapter.sol"
            target="_blank"
            rel="noreferrer"
            className="text-violet-400 hover:underline"
          >
            GitHub
          </a>
          .
        </SectionHeader>
        <CodeBlock>{ADAPTER_INTERFACE}</CodeBlock>
        <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
          <p>
            <span className="text-zinc-200">list()</span> — Distributor transfers
            tokens to you <em>first</em>, then calls. Treat your own balance as
            source of truth.
          </p>
          <p>
            <span className="text-zinc-200">withdraw()</span> — called by
            Settlement on force-settle. Best-effort: return{" "}
            <span className="font-mono">(0,0)</span> if your venue is paused.
          </p>
          <p>
            <span className="text-zinc-200">volume24h()</span> — USD-equivalent,
            6 decimals (matches USDC). Drives the keep-alive decision at +24h.
          </p>
          <p>
            <span className="text-zinc-200">isHealthy()</span> — return false to
            be skipped by the AI router until your venue is back online.
          </p>
        </div>
      </section>

      {/* --- Token metadata --- */}
      <section className="mb-14">
        <SectionHeader
          eyebrow="03 · Token surface"
          title="JionToken metadata"
        >
          Vanilla ERC-20 plus four view fields pinning real-world identity. Read
          these to display the right name, source a live price, and check
          liveness.
        </SectionHeader>
        <CodeBlock>{TOKEN_METADATA}</CodeBlock>
      </section>

      {/* --- Examples --- */}
      <section className="mb-14">
        <SectionHeader
          eyebrow="04 · Examples"
          title="Two integrations in &lt; 50 lines each"
        >
          Copy-and-modify starting points. Full sources in{" "}
          <a
            href="https://github.com/saehyunyoo/Mantle-hackathon/blob/main/docs/INTEGRATION_EXAMPLES.md"
            target="_blank"
            rel="noreferrer"
            className="text-violet-400 hover:underline"
          >
            docs/INTEGRATION_EXAMPLES.md
          </a>
          .
        </SectionHeader>
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
              <span className="rounded-full border border-emerald-700/30 bg-emerald-900/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-400">
                kind 0 · AMM
              </span>
              <span>DEX — auto-create a pool, mint LP back to the adapter.</span>
            </div>
            <CodeBlock>{DEX_SNIPPET}</CodeBlock>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
              <span className="rounded-full border border-sky-700/30 bg-sky-900/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-sky-400">
                kind 1 · Lending
              </span>
              <span>
                Lending market — register the token as collateral with a
                conservative LTV.
              </span>
            </div>
            <CodeBlock>{LENDING_SNIPPET}</CodeBlock>
          </div>
        </div>
      </section>

      {/* --- API --- */}
      <section className="mb-14">
        <SectionHeader
          eyebrow="05 · Read-only API"
          title="Don't want to write an adapter?"
        >
          Indexers, terminals, and analytics can consume Jion data without
          deploying a contract.
        </SectionHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-900 bg-zinc-950/60 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs">
              <span className="rounded bg-emerald-900/30 px-1.5 py-0.5 font-mono text-[10px] uppercase text-emerald-300">
                GET
              </span>
              <span className="font-mono text-zinc-200">
                /api/distribution/[symbol]
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Returns the live routing plan, per-venue listings, and the AI
              reasoning narrative for a given Jion token symbol (e.g.{" "}
              <span className="font-mono">mNVDA</span>).
            </p>
          </div>
          <div className="rounded-lg border border-zinc-900 bg-zinc-950/60 p-4">
            <div className="mb-2 text-xs text-zinc-400">
              Or subscribe to the on-chain event directly:
            </div>
            <CodeBlock>{TS_WATCHER}</CodeBlock>
          </div>
        </div>
      </section>

      {/* --- Try it --- */}
      <section className="mb-14">
        <SectionHeader
          eyebrow="06 · Try it on Sepolia"
          title="Reference deployments"
        >
          All Phase 1 contracts are deployed on Mantle Sepolia (chain id{" "}
          <span className="font-mono">5003</span>). Mock adapters are full
          reference implementations of <span className="font-mono">IJionAdapter</span>{" "}
          — read their source as a working template.
        </SectionHeader>
        <div className="overflow-x-auto rounded-lg border border-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-2">Contract</th>
                <th className="px-4 py-2">Address</th>
                <th className="px-4 py-2 hidden sm:table-cell">Note</th>
              </tr>
            </thead>
            <tbody className="bg-zinc-950/30">
              {SEPOLIA_DEPLOYMENTS.map((row) => (
                <tr key={row.label} className={SEPOLIA_ROW_CLASS}>
                  <td className="px-4 font-mono text-zinc-300">{row.label}</td>
                  <td className="px-4">
                    <a
                      href={explorer(row.addr)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-violet-400 hover:underline"
                    >
                      {row.addr.slice(0, 10)}…{row.addr.slice(-6)}
                    </a>
                  </td>
                  <td className="hidden px-4 text-xs text-zinc-500 sm:table-cell">
                    {row.note ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- Registration --- */}
      <section className="mb-14">
        <SectionHeader
          eyebrow="07 · Register your adapter"
          title="How to get listed"
        />
        <ol className="ml-5 list-decimal space-y-1 text-sm text-zinc-300">
          <li>Deploy your adapter on Mantle Sepolia.</li>
          <li>
            Open a PR to{" "}
            <a
              href="https://github.com/saehyunyoo/Mantle-hackathon"
              target="_blank"
              rel="noreferrer"
              className="text-violet-400 hover:underline"
            >
              saehyunyoo/Mantle-hackathon
            </a>{" "}
            adding the address to{" "}
            <span className="font-mono">packages/types/src/addresses.ts</span>.
          </li>
          <li>
            The Jion multisig calls{" "}
            <span className="font-mono">Distributor.addAdapter(yourAdapter)</span>
            .
          </li>
          <li>
            From the next daily issuance, the AI router considers your venue.
          </li>
        </ol>
        <p className="mt-4 text-xs text-zinc-500">
          No KYC, no per-team review. The only gate is the multisig-controlled{" "}
          <span className="font-mono">isAdapter</span> mapping.
        </p>
      </section>

      <footer className="border-t border-zinc-900 pt-6 text-xs text-zinc-600">
        Full spec:{" "}
        <a
          href="https://github.com/saehyunyoo/Mantle-hackathon/blob/main/docs/TOKEN_STANDARD.md"
          target="_blank"
          rel="noreferrer"
          className="text-violet-400 hover:underline"
        >
          docs/TOKEN_STANDARD.md
        </a>{" "}
        · Worked examples:{" "}
        <a
          href="https://github.com/saehyunyoo/Mantle-hackathon/blob/main/docs/INTEGRATION_EXAMPLES.md"
          target="_blank"
          rel="noreferrer"
          className="text-violet-400 hover:underline"
        >
          docs/INTEGRATION_EXAMPLES.md
        </a>{" "}
        · Questions? Open an issue.{" "}
        <Link href="/" className="text-violet-400 hover:underline">
          ← Back to Trending
        </Link>
      </footer>
    </main>
  );
}
