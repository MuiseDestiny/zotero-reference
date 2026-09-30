// Bundles src/ with esbuild and assembles the plugin from addon/ in build/.
// `--pack` additionally zips build/ into dist/zotero-reference-<version>.xpi.
// `--e2e` builds the E2E variant (test harness bundled in) into build-e2e/.
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const e2e = process.argv.includes('--e2e');
const pack = process.argv.includes('--pack');
const buildDir = path.join(root, e2e ? 'build-e2e' : 'build');
// package.json is the single source of version and addon identifiers.
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const { config } = pkg;

fs.rmSync(buildDir, { recursive: true, force: true });
fs.cpSync(path.join(root, 'addon'), buildDir, { recursive: true });

// __placeholder__ substitution in text files of the plugin.
const replacements = {
  author: pkg.author,
  description: pkg.description,
  homepage: pkg.homepage,
  buildVersion: pkg.version,
  buildTime: new Date().toISOString(),
  ...config,
};
if (e2e) replacements.addonName += ' (E2E)';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}

// Fluent message ids get the addonRef prefix, so they cannot clash with Zotero's or other plugins'.
const messages = new Set();
for (const file of walk(path.join(buildDir, 'locale')).filter((f) => f.endsWith('.ftl'))) {
  const text = fs.readFileSync(file, 'utf8').split('\n').map((line) => {
    const m = line.match(/^([a-zA-Z]\S*)(\s*=)/);
    if (!m) return line;
    messages.add(m[1]);
    return `${config.addonRef}-${line}`;
  }).join('\n');
  fs.writeFileSync(path.join(path.dirname(file), `${config.addonRef}-${path.basename(file)}`), text);
  fs.rmSync(file);
}

for (const file of walk(buildDir).filter((f) => /\.(xhtml|html|json|js)$/.test(f))) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [k, v] of Object.entries(replacements)) text = text.replaceAll(`__${k}__`, String(v));
  if (file.endsWith('.xhtml')) {
    text = text.replace(/data-l10n-id="(\S*)"/g, (all, id) =>
      messages.has(id) ? `data-l10n-id="${config.addonRef}-${id}"` : all);
  }
  fs.writeFileSync(file, text);
}

await esbuild.build({
  entryPoints: [path.join(root, e2e ? 'test/e2e/entry.ts' : 'src/index.ts')],
  define: { __env__: JSON.stringify(e2e ? 'development' : 'production') },
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['firefox115'],
  outfile: path.join(buildDir, `chrome/content/scripts/${config.addonRef}.js`),
  logLevel: 'info',
});

if (pack) {
  const distDir = path.join(root, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  const xpi = path.join(distDir, `${pkg.name}-${pkg.version}${e2e ? '-e2e' : ''}.xpi`);
  fs.rmSync(xpi, { force: true });
  execFileSync('zip', ['-qr', xpi, '.'], { cwd: buildDir, stdio: 'inherit' });
  console.log(`Packed ${path.relative(root, xpi)}`);
}
