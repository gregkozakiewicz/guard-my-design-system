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
import { learnSystem, isCodeFile, isStyleFile } from 'roast-my-design-system/engine';
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
  console.error(`guard: git diff failed. ${e.message.split('\n')[0]}`);
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
let judged = added.filter(({ file }) => !ignorePrefixes.some((p) => (file + '/').startsWith(p)));

const system = learnSystem(cwd, { exclude });

// The guard judges only what the report reads (2.9.5). The report's walk
// leaves out docs sites, examples, demos, stories and tests, and the guard
// used to judge every file a change touched: on 22 repos, 48% of its findings
// sat in files the report never opens (a docs site, a marketing site). The
// engine hands over the files its walk read (roast 10.1.4), so the two agree
// by construction, a website that holds the product included. git prints
// diff paths from the repository root and the walk lists them from the
// folder it scanned, so a path is tried both ways; a file outside the
// scanned folder is judged as before.
let leftOut = [];
if (system.filesRead) {
  let prefix = '';
  try { prefix = execFileSync('git', ['rev-parse', '--show-prefix'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* the root, then */ }
  const unread = (file) => {
    if (system.filesRead.has(file)) return false;
    if (!prefix) return true;
    return file.startsWith(prefix) && !system.filesRead.has(file.slice(prefix.length));
  };
  leftOut = [...new Set(judged.map((a) => a.file))].filter((f) => (isCodeFile(f) || isStyleFile(f)) && unread(f)).sort();
  const out = new Set(leftOut);
  judged = judged.filter((a) => !out.has(a.file));
}
// The judge asks for whole files when deciding what to leave alone: a satori
// import or an SVG drawing sits at the top of a file the diff never touches.
const wholeFile = new Map();
const readWhole = (file) => {
  if (!wholeFile.has(file)) {
    try { wholeFile.set(file, readFileSync(resolve(cwd, file), 'utf8')); }
    catch { wholeFile.set(file, null); }
  }
  return wholeFile.get(file);
};
// The file at the base, so a token or an import already there before this
// change is not reported as new. null: the change creates the file.
const readBase = (file) => {
  try {
    return execFileSync('git', ['show', `${base}:${file}`], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024 });
  } catch { return null; }
};
let findings = judge(judged, system, { readFile: readWhole, readBase });

// The escape hatch: a `guard-ignore-next-line` comment silences every finding
// on the line below it. Checked against the file as it stands (not just the
// diff), so an exception granted last month still protects its line today.
// Visible in code review by nature — that is the whole safety of it.
const fileCache = new Map();
const lineAbove = (file, line) => {
  if (!fileCache.has(file)) {
    try { fileCache.set(file, readFileSync(resolve(cwd, file), 'utf8').split('\n')); }
    catch { fileCache.set(file, []); }
  }
  return fileCache.get(file)[line - 2] ?? '';
};
findings = findings.filter((f) => !lineAbove(f.file, f.line).includes('guard-ignore-next-line'));

if (flag('json')) {
  console.log(JSON.stringify({ base, addedLines: added.length, findings, leftOut }, null, 2));
} else if (flag('markdown')) {
  console.log(markdownReport(findings, { leftOut }));
} else {
  console.log(terminalReport(findings, { leftOut }));
}

process.exit(findings.length && flag('strict') ? 1 : 0);
