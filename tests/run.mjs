#!/usr/bin/env node
/**
 * The gate. Builds a small git repo with a known base, applies a change with
 * known sins, and asserts the guard sees exactly those — and stays silent on
 * a disciplined change. No network, no snapshots, deterministic.
 *
 *   node tests/run.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, appendFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'index.mjs');

let passed = 0, failed = 0;
const ok = (cond, name) => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}`); }
};

const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf8' });

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'guard-test-'));
  mkdirSync(join(dir, 'styles'), { recursive: true });
  mkdirSync(join(dir, 'components'), { recursive: true });
  git(dir, 'init', '-qb', 'main');
  writeFileSync(join(dir, 'styles/site.css'),
    '--blue-500: #3b6fe0;\n--grey-100: #f5f5f5;\n.card { padding: 12px; color: var(--blue-500); }\n');
  writeFileSync(join(dir, 'components/Button.tsx'),
    'export const Button = () => <button className="p-4">ok</button>;\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'base');
  return dir;
}

const run = (dir, ...extra) =>
  JSON.parse(execFileSync('node', [CLI, dir, '--base', 'HEAD', '--json', ...extra], { encoding: 'utf8' }));

// ---- a change with known sins ----
console.log('sinful change:');
{
  const dir = makeRepo();
  appendFileSync(join(dir, 'styles/site.css'),
    '.hero { color: #3564cc; margin: 13px; font-family: "Comic Sans MS", cursive; }\n' +
    '.hero b { color: #3b6fe0 !important; }\n');
  writeFileSync(join(dir, 'components/Hero.tsx'),
    'export const Hero = () => <div className="mt-[37px]" style={{color: "#4a7be8"}}>hi</div>;\n');

  const r = run(dir);
  const kinds = r.findings.map((f) => f.kind).sort().join(',');
  ok(r.findings.length === 6, `finds 6 issues (got ${r.findings.length})`);
  ok(kinds === 'arbitrary,color,color,font,important,spacing', `kinds are right (${kinds})`);
  const stray = r.findings.find((f) => f.kind === 'color' && f.value === '#3564cc');
  ok(stray?.advice.includes('#3b6fe0'), 'stray colour names its nearest token');
  const spacing = r.findings.find((f) => f.kind === 'spacing');
  ok(spacing?.value === '13px' && spacing.advice.includes('12px'), 'off-scale spacing names the nearest step');
  ok(r.findings.every((f) => f.file && f.line > 0), 'every finding carries file and line');

  rmSync(dir, { recursive: true, force: true });
}

// ---- strict mode exit code ----
console.log('strict mode:');
{
  const dir = makeRepo();
  appendFileSync(join(dir, 'styles/site.css'), '.x { color: #4a7be8; }\n');
  let code = 0;
  try { execFileSync('node', [CLI, dir, '--base', 'HEAD', '--strict'], { encoding: 'utf8' }); }
  catch (e) { code = e.status; }
  ok(code === 1, `--strict exits 1 on findings (got ${code})`);
  rmSync(dir, { recursive: true, force: true });
}

// ---- a disciplined change stays invisible ----
console.log('clean change:');
{
  const dir = makeRepo();
  appendFileSync(join(dir, 'styles/site.css'), '.note { color: var(--grey-100); padding: 12px; }\n');
  const r = run(dir);
  ok(r.findings.length === 0, 'no findings for on-system code');
  rmSync(dir, { recursive: true, force: true });
}

// ---- extending the system is allowed ----
console.log('token definition:');
{
  const dir = makeRepo();
  appendFileSync(join(dir, 'styles/site.css'), '--green-500: #2fa14d;\n');
  const r = run(dir);
  ok(r.findings.length === 0, 'defining a new token is not a sin');
  rmSync(dir, { recursive: true, force: true });
}

// ---- the past is never judged ----
console.log('old mess ignored:');
{
  const dir = makeRepo();
  // plant mess in the BASE, then make a clean change
  appendFileSync(join(dir, 'styles/site.css'), '.legacy { color: #cc0011 !important; margin: 17px; }\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'legacy mess');
  appendFileSync(join(dir, 'styles/site.css'), '.tidy { color: var(--blue-500); }\n');
  const r = run(dir);
  ok(r.findings.length === 0, 'pre-existing mess produces no findings');
  rmSync(dir, { recursive: true, force: true });
}

// ---- exempt files ----
console.log('exemptions:');
{
  const dir = makeRepo();
  mkdirSync(join(dir, 'emails'), { recursive: true });
  writeFileSync(join(dir, 'emails/welcome-email.tsx'),
    'export const E = () => <td style={{color: "#ff8800", padding: "3px"}} />;\n');
  const r = run(dir);
  ok(r.findings.length === 0, 'email templates are exempt (inline styling there is correct practice)');
  rmSync(dir, { recursive: true, force: true });
}

// ---- markdown output ----
console.log('markdown:');
{
  const dir = makeRepo();
  appendFileSync(join(dir, 'styles/site.css'), '.x { color: #4a7be8; }\n');
  const md = execFileSync('node', [CLI, dir, '--base', 'HEAD', '--markdown'], { encoding: 'utf8' });
  ok(md.includes('guard-my-design-system: 1 new issue'), 'markdown header counts issues');
  ok(md.includes('npx roast-my-design-system'), 'markdown carries the roast footer');
  ok(md.includes('never judged'), 'markdown states the diff-only promise');
  rmSync(dir, { recursive: true, force: true });
}

// ---- --version ----
console.log('version flag:');
{
  const v = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
  const out = execFileSync('node', [CLI, '--version'], { encoding: 'utf8' }).trim();
  ok(out === `guard-my-design-system ${v}`, `--version prints the package version (${out})`);
}

// ---- outside a git repository ----
console.log('not a git repo:');
{
  const dir = mkdtempSync(join(tmpdir(), 'guard-nogit-'));
  let code = 0, err = '';
  try { execFileSync('node', [CLI, dir], { encoding: 'utf8' }); }
  catch (e) { code = e.status; err = e.stderr ?? ''; }
  ok(code === 2, `exits 2 outside a repo (got ${code})`);
  ok(err.includes('not a git repository') && !err.includes('fatal:'),
    'one calm sentence, no raw git noise');
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
