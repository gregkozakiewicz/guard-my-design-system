#!/usr/bin/env node
/**
 * guard-my-design-system — no new mess.
 *
 * Judges ONLY the lines a change adds against the design system the repo
 * already has. Learns the system with the roast engine, reads the diff,
 * says what strayed and what was probably meant instead.
 *
 *   npx guard-my-design-system [path] [--base <ref>] [--strict] [--json]
 *                              [--exclude <path>]
 *
 * Exit codes: 0 clean (or findings without --strict), 1 findings with
 * --strict, 2 could not run.
 */
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { learnSystem } from 'roast-my-design-system/engine';
import { defaultBase, addedLines } from './src/diff.mjs';
import { judge } from './src/judge.mjs';
import { terminalReport, markdownReport } from './src/report.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 && argv[i + 1] ? argv[i + 1] : null;
};

if (flag('version') || argv.includes('-v')) {
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  console.log(`guard-my-design-system ${pkg.version}`);
  process.exit(0);
}

const cwd = resolve(argv[0] && !argv[0].startsWith('--') ? argv[0] : '.');

// The guard judges diffs, so a git repository is its whole world. Say so
// calmly instead of letting git's own fatals leak through.
try {
  execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd, stdio: 'ignore' });
} catch {
  console.error('guard: this is not a git repository, and the guard judges diffs. Run it inside a repo.');
  process.exit(2);
}
const base = opt('base') ?? defaultBase(cwd);
if (!base) {
  console.error('guard: cannot find a base to diff against (no origin/main, origin/master, main or master). Pass one with --base <ref>.');
  process.exit(2);
}

let added;
try {
  added = addedLines(cwd, base);
} catch (e) {
  console.error(`guard: git diff failed — ${e.message.split('\n')[0]}`);
  process.exit(2);
}

const exclude = opt('exclude') ? opt('exclude').split(',').map((s) => s.trim()) : [];

// Excluded folders are invisible to the whole tool: not learned from, and not
// judged either. Same sources as the scan (--exclude and .roastignore), same
// plain folder prefixes, nothing clever.
let ignorePrefixes = [...exclude];
try {
  ignorePrefixes.push(...readFileSync(resolve(cwd, '.roastignore'), 'utf8')
    .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));
} catch { /* no .roastignore, nothing to add */ }
ignorePrefixes = ignorePrefixes.map((p) => p.replace(/^\.?\//, '').replace(/\/?$/, '/'));
const judged = added.filter(({ file }) => !ignorePrefixes.some((p) => (file + '/').startsWith(p)));

const system = learnSystem(cwd, { exclude });
const findings = judge(judged, system);

if (flag('json')) {
  console.log(JSON.stringify({ base, addedLines: added.length, findings }, null, 2));
} else if (flag('markdown')) {
  console.log(markdownReport(findings));
} else {
  console.log(terminalReport(findings));
}

process.exit(findings.length && flag('strict') ? 1 : 0);
