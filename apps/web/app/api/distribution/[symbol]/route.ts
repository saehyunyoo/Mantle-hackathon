import { NextResponse } from "next/server";
import { findEntryBySymbol, routeDistribution } from "@/lib/ai/distribution-router";
import { isClaudeEnabled } from "@/lib/ai/claude";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const decoded = decodeURIComponent(symbol);

  const resolved = findEntryBySymbol(decoded);
  if (!resolved) {
    return NextResponse.json(
      { error: `Unknown token symbol: ${decoded}` },
      { status: 404 },
    );
  }

  const distribution = await routeDistribution(resolved);

  return NextResponse.json({
    distribution,
    meta: {
      claudeEnabled: isClaudeEnabled(),
      generatedBy: isClaudeEnabled() ? "claude+heuristic" : "heuristic-only",
    },
  });
}
