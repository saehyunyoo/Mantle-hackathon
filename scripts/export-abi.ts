#!/usr/bin/env bun
/**
 * Sync compiled contract ABIs from Foundry → web/lib/contracts/.
 *
 * Usage: bun run export-abi
 *
 * Run this:
 *  - after every `forge build` that changes a contract's interface
 *  - in CI, to detect drift (web/lib/contracts/ must match latest forge output)
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "contracts", "out");
const TARGET_DIR = join(ROOT, "web", "lib", "contracts");

const CONTRACTS = [
  "TokenFactory",
  "OracleAdapter",
  "Settlement",
  "AgentLogger",
  "Router",
];

if (!existsSync(TARGET_DIR)) {
  mkdirSync(TARGET_DIR, { recursive: true });
}

let indexExports = "// AUTO-GENERATED — do not edit. Run `bun run export-abi`.\n\n";
let exported = 0;
let skipped = 0;

for (const name of CONTRACTS) {
  const artifactPath = join(OUT_DIR, `${name}.sol`, `${name}.json`);
  if (!existsSync(artifactPath)) {
    console.warn(`⚠ skipped ${name} (not built yet)`);
    skipped++;
    continue;
  }
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const abi = artifact.abi;
  const target = join(TARGET_DIR, `${name}.abi.ts`);
  writeFileSync(
    target,
    `// AUTO-GENERATED — do not edit.\nexport const ${name}Abi = ${JSON.stringify(
      abi,
      null,
      2
    )} as const;\n`
  );
  indexExports += `export { ${name}Abi } from "./${name}.abi";\n`;
  console.log(`✓ exported ${name}`);
  exported++;
}

// Also re-export addresses for convenience.
indexExports += `\nexport * from "./addresses";\n`;

writeFileSync(join(TARGET_DIR, "index.ts"), indexExports);
console.log(`\n${exported} exported, ${skipped} skipped → ${TARGET_DIR}`);
