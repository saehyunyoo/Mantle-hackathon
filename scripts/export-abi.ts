#!/usr/bin/env bun
/**
 * Sync compiled contract ABIs from Foundry → packages/types/src/abi/.
 *
 * Usage: bun run export-abi
 *
 * Run this after every `forge build` that changes a contract's interface,
 * and commit the result. FE / API import via:
 *   import { TokenFactoryAbi } from '@jion/types/abi';
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, 'contracts', 'out');
const TARGET_DIR = join(ROOT, 'packages', 'types', 'src', 'abi');

const CONTRACTS = [
  'TokenFactory',
  'OracleAdapter',
  'AgentLogger',
  'JionToken',
  'JionPool',
  'JionRouter',
  'Distributor',
  'Settlement',
  'SelfPoolAdapter',
  'MerchantMoeMockAdapter',
  'LendleMockAdapter',
  'IJionAdapter',
];

if (!existsSync(TARGET_DIR)) {
  mkdirSync(TARGET_DIR, { recursive: true });
}

let indexExports =
  '// AUTO-GENERATED — do not edit. Run `bun run export-abi` after forge build.\n\n';
let exported = 0;
let skipped = 0;

for (const name of CONTRACTS) {
  const artifactPath = join(OUT_DIR, `${name}.sol`, `${name}.json`);
  if (!existsSync(artifactPath)) {
    console.warn(`⚠ skipped ${name} (no artifact — run \`forge build\` first)`);
    skipped++;
    continue;
  }
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
  const abi = artifact.abi;
  const target = join(TARGET_DIR, `${name}.abi.ts`);
  writeFileSync(
    target,
    `// AUTO-GENERATED — do not edit.\nexport const ${name}Abi = ${JSON.stringify(abi, null, 2)} as const;\n`
  );
  indexExports += `export { ${name}Abi } from './${name}.abi';\n`;
  console.log(`✓ exported ${name}`);
  exported++;
}

writeFileSync(join(TARGET_DIR, 'index.ts'), indexExports);
console.log(`\n${exported} exported, ${skipped} skipped → ${TARGET_DIR}`);
