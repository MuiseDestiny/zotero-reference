// Runs the unit tests for the parts that do not need Zotero: each
// test/*.test.ts is bundled to CommonJS and run with Node's built-in runner.
//   npm test              all tests
//   npm test -- citations only files whose name matches
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, '.test-build');
const filter = process.argv.slice(2).find((a) => !a.startsWith('-'));

fs.rmSync(outDir, { recursive: true, force: true });
const files = fs.readdirSync(path.join(root, 'test'))
  .filter((f) => f.endsWith('.test.ts') && (!filter || f.includes(filter)));

await esbuild.build({
  entryPoints: files.map((f) => path.join(root, 'test', f)),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outdir: outDir,
  outExtension: { '.js': '.cjs' },
  logLevel: 'warning',
});

const result = spawnSync(process.execPath, ['--test', ...fs.readdirSync(outDir).map((f) => path.join(outDir, f))], { stdio: 'inherit' });
process.exit(result.status ?? 1);
