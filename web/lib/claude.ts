/**
 * AI client abstraction.
 *
 * Owner: 세현
 * Used by: API routes that need natural-language reasoning.
 *
 * Default: Anthropic Claude (dev).
 * Demo: Z.ai (Mantle hackathon sponsor — points!).
 * Swap via env / config — interface stays the same.
 */

export type AskOptions = {
  model?: "sonnet" | "haiku" | "opus";
  maxTokens?: number;
  system?: string;
  /** Force a specific provider (default reads from env JION_AI_PROVIDER). */
  provider?: "anthropic" | "zai";
};

/**
 * Single-turn ask: prompt in → completion text out.
 */
export async function askClaude(prompt: string, opts?: AskOptions): Promise<string> {
  throw new Error("askClaude not implemented");
}

/**
 * Structured ask: returns JSON conforming to a Zod schema.
 * Internally uses tool-use / JSON-mode and validates.
 */
export async function askClaudeStructured<T>(
  prompt: string,
  schema: { parse: (raw: unknown) => T },
  opts?: AskOptions
): Promise<T> {
  throw new Error("askClaudeStructured not implemented");
}
