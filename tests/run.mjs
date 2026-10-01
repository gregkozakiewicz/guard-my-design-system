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
    '--blue-500: #3b6fe0;\n--grey-100: #f5f5f5;\n' +
    '.card { padding: 12px; color: var(--blue-500); border-radius: 6px; font-size: 14px; box-shadow: 0 1px 2px #1a1a1a; }\n');
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
  ok(r.findings.length === 7, `finds 7 issues (got ${r.findings.length})`);
  // Since roaster 7.0.0 a bracket on a spacing utility (mt-[37px]) is judged
  // as off-scale spacing, not as an arbitrary value: one class, one finding.
  ok(kinds === 'color,color,font,important,inline,spacing,spacing', `kinds are right (${kinds})`);
  const stray = r.findings.find((f) => f.kind === 'color' && f.value === '#3564cc');
  ok(stray?.advice.includes('#3b6fe0'), 'stray colour names its nearest token');
  const spacing = r.findings.find((f) => f.kind === 'spacing' && f.value === '13px');
  ok(spacing && spacing.advice.includes('12px'), 'off-scale spacing names the nearest step');
  const bracket = r.findings.find((f) => f.kind === 'spacing' && f.value === '37px');
  ok(bracket && bracket.file.endsWith('Hero.tsx'), 'a bracket spacing class is off-scale spacing, judged once');
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
  // an email shows it is one (roast 9.2.3): here by the table attributes only
  // an email carries; a folder called emails no longer makes a file one
  const dir = makeRepo();
  mkdirSync(join(dir, 'emails'), { recursive: true });
  writeFileSync(join(dir, 'emails/welcome-email.tsx'),
    'export const E = () => <table cellPadding="0"><tr><td style={{color: "#ff8800", padding: "3px"}} /></tr></table>;\n');
  const r = run(dir);
  ok(r.findings.length === 0, 'email templates are exempt (inline styling there is correct practice)');
  rmSync(dir, { recursive: true, force: true });
}
{
  // a template built on the team's own email layout carries no kit itself:
  // its folder, which holds the layout, says what it is
  const dir = makeRepo();
  mkdirSync(join(dir, 'packages/emails'), { recursive: true });
  writeFileSync(join(dir, 'packages/emails/Layout.tsx'),
    'import { Html, Body } from "@react-email/components";\nexport const Layout = ({ children }) => <Html><Body>{children}</Body></Html>;\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'email layout');
  writeFileSync(join(dir, 'packages/emails/Receipt.tsx'),
    'import { Layout } from "./Layout";\nexport const Receipt = () => <Layout><p style={{color: "#ff8800"}}>Paid</p></Layout>;\n');
  const r = run(dir);
  ok(r.findings.length === 0, `a template built on the team's email layout is exempt (got ${r.findings.map((f) => f.kind).join(', ') || 'none'})`);

  // and a screen about email is a screen
  writeFileSync(join(dir, 'components/EmailSettings.tsx'),
    'export const EmailSettings = () => <div style={{color: "#ff8800"}}>Notify me</div>;\n');
  const r2 = run(dir);
  ok(r2.findings.some((f) => f.file.includes('EmailSettings')), 'a screen about email is judged like any screen');
  rmSync(dir, { recursive: true, force: true });
}

{
  // an icon set names its files for what they show (roast 9.2.5): an icon in
  // an icons folder is artwork, and it is not a second copy of the component
  // it is named after
  const dir = makeRepo();
  mkdirSync(join(dir, 'components/ui'), { recursive: true });
  writeFileSync(join(dir, 'components/ui/Switch.tsx'),
    'export const Switch = (props) => <button role="switch" className="switch" {...props} />;\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'switch');
  mkdirSync(join(dir, 'packages/icons/src'), { recursive: true });
  writeFileSync(join(dir, 'packages/icons/src/Switch.tsx'),
    'export const Switch = (props) => <svg viewBox="0 0 24 24" {...props}><path fill="#3B82F6" d="M4 12h16" /></svg>;\n');
  const r = run(dir);
  ok(r.findings.length === 0, `an icon in an icons folder is artwork, not a second Switch (got ${r.findings.map((f) => f.kind).join(', ') || 'none'})`);

  // a second Switch that is interface is still a second copy
  mkdirSync(join(dir, 'components/settings'), { recursive: true });
  writeFileSync(join(dir, 'components/settings/Switch.tsx'),
    'export const Switch = (props) => <button role="switch" className="switch" {...props} />;\n');
  const r2 = run(dir);
  ok(r2.findings.some((f) => f.kind === 'component' && f.file.includes('settings/Switch')), 'a second Switch component is still a second copy');
  rmSync(dir, { recursive: true, force: true });
}

{
  // a project generator's templates are not the product (roast 9.2.6): the
  // starter's spare sidebar is not a second copy of the real one
  const dir = makeRepo();
  mkdirSync(join(dir, 'scripts/cleanup-templates/clerk/components'), { recursive: true });
  writeFileSync(join(dir, 'scripts/cleanup-templates/clerk/components/AppSidebar.tsx'),
    'export const AppSidebar = () => <nav className="sidebar" />;\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'starter templates');
  writeFileSync(join(dir, 'components/AppSidebar.tsx'),
    'export const AppSidebar = () => <nav className="sidebar" />;\n');
  const r = run(dir);
  ok(!r.findings.some((f) => f.kind === 'component'), `a starter's template is not a second AppSidebar (got ${r.findings.map((f) => f.kind).join(', ') || 'none'})`);
  rmSync(dir, { recursive: true, force: true });
}

{
  // a page a headless browser prints to a PDF (roast 9.3.2): its styling is
  // inline because the page loads none of the app's stylesheets
  const dir = makeRepo();
  mkdirSync(join(dir, 'server/src/pdf/templates'), { recursive: true });
  writeFileSync(join(dir, 'server/package.json'), '{ "name": "server", "dependencies": { "puppeteer": "23.0.0" } }\n');
  writeFileSync(join(dir, 'server/src/pdf/service.ts'),
    "import puppeteer from 'puppeteer';\nimport { renderToStaticMarkup } from 'react-dom/server';\nimport { Report } from './templates/Report.js';\nexport const pdf = async () => { renderToStaticMarkup(Report()); return puppeteer.launch(); };\n");
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'pdf service');
  writeFileSync(join(dir, 'server/src/pdf/templates/Report.tsx'),
    'export const Report = () => <main style={{ color: "#ff8800", padding: "13px" }}>Weekly report</main>;\n');
  const r = run(dir);
  ok(r.findings.length === 0, `a page printed to a PDF by a headless browser is not judged (got ${r.findings.map((f) => f.kind).join(', ') || 'none'})`);
  rmSync(dir, { recursive: true, force: true });
}

{
  // one exemption rule for the report and the guard (roast 9.3.3): what the
  // guard learns as "already used" comes from the same files the report reads.
  // A plain component named like artwork is interface, so its values count;
  // an icon in an icons folder is artwork, so its values do not.
  const dir = makeRepo();
  mkdirSync(join(dir, 'components/status'), { recursive: true });
  writeFileSync(join(dir, 'components/status/StatusBadge.tsx'),
    'export const StatusBadge = () => <span style={{ padding: "11px" }}>ok</span>;\n');
  mkdirSync(join(dir, 'src/icons'), { recursive: true });
  writeFileSync(join(dir, 'src/icons/Server.tsx'),
    'export const Server = () => <svg style={{ padding: "7px" }} viewBox="0 0 16 16"><path d="M1 1h14" /></svg>;\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'badge and icon');
  writeFileSync(join(dir, 'components/Card.tsx'),
    'export const Card = () => <div className="card" style={{ margin: "11px", gap: "7px" }}>c</div>;\n');
  const r = run(dir);
  const spacing = r.findings.filter((f) => f.kind === 'spacing').map((f) => f.value).sort();
  ok(!spacing.includes('11px'), `a value a StatusBadge already uses is known (got ${spacing.join(', ') || 'none'})`);
  ok(spacing.includes('7px'), 'a value only an icon uses is new to the interface');
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

// ---- advice names the token, not just the hex ----
console.log('token names:');
{
  const dir = makeRepo();
  appendFileSync(join(dir, 'styles/site.css'), '.x { color: #3564cc; }\n');
  const r = run(dir);
  ok(r.findings[0]?.advice.includes('var(--blue-500)'), `nearest token is named (${r.findings[0]?.advice})`);
  rmSync(dir, { recursive: true, force: true });
}

// ---- radius, font-size and shadow are judged too ----
console.log('new kinds:');
{
  const dir = makeRepo();
  appendFileSync(join(dir, 'styles/site.css'),
    '.y { border-radius: 5px; font-size: 13.5px; box-shadow: 0 4px 12px; }\n');
  const r = run(dir);
  const kinds = r.findings.map((f) => f.kind).sort().join(',');
  ok(kinds === 'fontsize,radius,shadow', `all three kinds flagged (${kinds})`);
  const radius = r.findings.find((f) => f.kind === 'radius');
  ok(radius?.advice.includes('6px'), 'radius names the nearest existing value');
  rmSync(dir, { recursive: true, force: true });
}

// ---- inline style blocks ----
// The gap that let a whole class of change through (2026-09-08): a PR adding
// style={{ display: 'flex' }} carries no colour and no length, so nothing
// tripped. The engine had flagged inline blocks since 5.0; the guard had not.
console.log('inline styles:');
{
  const dir = makeRepo();
  writeFileSync(join(dir, 'components/Panel.tsx'),
    'export const Panel = () => <div style={{ display: "flex", gap: "12px" }}>x</div>;\n');
  const r = run(dir);
  const inline = r.findings.filter((f) => f.kind === 'inline');
  ok(inline.length === 1, `a colourless inline block is still caught (got ${inline.length})`);
  ok(inline[0]?.advice.includes('invisible'), 'advice says why it cannot be seen');

  // a block whose values come from variables is decided elsewhere; the guard
  // cannot know whether it is on-system, so it says nothing
  writeFileSync(join(dir, 'components/Panel.tsx'),
    'export const Panel = ({ w }) => <div style={{ width: w, color: theme.fg }}>x</div>;\n');
  const dyn = run(dir);
  ok(dyn.findings.filter((f) => f.kind === 'inline').length === 0,
    'a block built from variables is not judged');

  // and the label carries no redundant value
  const text = execFileSync('node', [CLI, dir, '--base', 'HEAD'], { encoding: 'utf8' });
  ok(!text.includes('style={{ }} .'), 'the report does not repeat the value after the label');

  rmSync(dir, { recursive: true, force: true });
}

// ---- a second definition of the same component ----
// The highest-value check the engine had, missing from the path that runs on
// every pull request (2026-09-08). Needs a ledger only a newer engine exports,
// so it is skipped rather than failed when the pin is behind.
console.log('duplicate components:');
{
  const engineApi = await import('roast-my-design-system/engine');
  if (typeof engineApi.definedComponents !== 'function' ) {
    console.log('  – skipped: the pinned engine exports no component ledger yet');
  } else {
    const dir = makeRepo();
    writeFileSync(join(dir, 'components/ButtonV2.tsx'),
      'export const Button = () => <button className="p-4">also ok</button>;\n');
    const r = run(dir);
    const dupes = r.findings.filter((f) => f.kind === 'component');
    ok(dupes.length === 1, `a second <Button> is caught (got ${dupes.length})`);
    ok(dupes[0]?.value === 'Button', 'the finding names the component');
    ok(dupes[0]?.advice.includes('components/Button.tsx'), 'the advice names the one to import');

    // editing the component that already exists is not a second one
    writeFileSync(join(dir, 'components/ButtonV2.tsx'), '');
    writeFileSync(join(dir, 'components/Button.tsx'),
      'export const Button = () => <button className="p-4 gap-2">ok</button>;\n');
    const edit = run(dir);
    ok(edit.findings.filter((f) => f.kind === 'component').length === 0,
      'editing the original is not a duplicate of itself');

    rmSync(dir, { recursive: true, force: true });
  }
}

// ---- a name that repeats by design ----
// A TanStack or Remix route file exports Route; every page has one. The
// report never called that a duplicate, the guard did: a pull request adding
// a page was told to import another page's route (2026-09-29).
console.log('names that repeat by design:');
{
  const route = (path, name) => `import { createFileRoute } from '@tanstack/react-router';\nexport const Route = createFileRoute('${path}')({ component: ${name} });\nfunction ${name}() { return <main className="p-4">${name}</main>; }\n`;
  const dir = makeRepo();
  mkdirSync(join(dir, 'src/routes/_app/tasks'), { recursive: true });
  mkdirSync(join(dir, 'src/routes/_app/users'), { recursive: true });
  writeFileSync(join(dir, 'src/routes/__root.tsx'), route('/', 'Root'));
  writeFileSync(join(dir, 'src/routes/_app/tasks/index.tsx'), route('/tasks', 'Tasks'));
  writeFileSync(join(dir, 'src/routes/_app/users/index.tsx'), route('/users', 'Users'));
  writeFileSync(join(dir, 'components/Button.stories.tsx'),
    'export const Primary = () => <button className="p-4">demo</button>;\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'routes');

  mkdirSync(join(dir, 'src/routes/_app/billing'), { recursive: true });
  writeFileSync(join(dir, 'src/routes/_app/billing/index.tsx'), route('/billing', 'Billing'));
  writeFileSync(join(dir, 'components/Card.stories.tsx'),
    'export const Primary = () => <div className="p-4">demo</div>;\n');
  const r = run(dir);
  ok(r.findings.filter((f) => f.kind === 'component').length === 0,
    `a new route file and a new story are not second copies (got ${r.findings.filter((f) => f.kind === 'component').map((f) => f.value).join(', ') || 'none'})`);

  // a wrapper built on the component it shares a name with, and a stub with
  // no markup in it: the report counts neither
  mkdirSync(join(dir, 'features'), { recursive: true });
  writeFileSync(join(dir, 'features/Button.tsx'),
    "import { Button as Base } from '../components/Button';\nexport const Button = (p) => <Base tone=\"quiet\" {...p} />;\n");
  mkdirSync(join(dir, 'templates'), { recursive: true });
  writeFileSync(join(dir, 'templates/Button.tsx'), 'export function Button() {\n  return null;\n}\n');
  const rw = run(dir);
  ok(rw.findings.filter((f) => f.kind === 'component').length === 0,
    `a wrapper and a stub are not second copies (got ${rw.findings.filter((f) => f.kind === 'component').map((f) => `${f.value} in ${f.file}`).join(', ') || 'none'})`);
  rmSync(join(dir, 'features'), { recursive: true, force: true });
  rmSync(join(dir, 'templates'), { recursive: true, force: true });

  // a drawing is excused its colours, not a second copy of itself
  mkdirSync(join(dir, 'brand'), { recursive: true });
  mkdirSync(join(dir, 'marketing'), { recursive: true });
  const logo = (d) => `export function Logo() { return <svg viewBox="0 0 32 32"><path fill="#ff5a1f" d="${d}" /></svg>; }\n`;
  writeFileSync(join(dir, 'brand/Logo.tsx'), logo('M4 4h24v24H4z'));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'logo');
  writeFileSync(join(dir, 'marketing/Logo.tsx'), logo('M6 6h20v20H6z'));
  const rl = run(dir);
  ok(rl.findings.length === 1 && rl.findings[0].kind === 'component' && rl.findings[0].value === 'Logo',
    `a second Logo is caught and its colour is not judged (got ${rl.findings.map((f) => `${f.kind} ${f.value}`).join(', ') || 'none'})`);
  rmSync(join(dir, 'marketing'), { recursive: true, force: true });

  // and a real second Button in the same change is still caught
  writeFileSync(join(dir, 'components/ButtonV2.tsx'),
    'export const Button = () => <button className="p-4">also ok</button>;\n');
  const r2 = run(dir);
  const dupes = r2.findings.filter((f) => f.kind === 'component');
  ok(dupes.length === 1 && dupes[0].value === 'Button', `a second <Button> beside them is still caught (got ${dupes.map((f) => f.value).join(', ') || 'none'})`);

  rmSync(dir, { recursive: true, force: true });
}

// ---- disciplined values of the new kinds stay silent ----
console.log('new kinds, clean:');
{
  const dir = makeRepo();
  appendFileSync(join(dir, 'styles/site.css'),
    '.z { border-radius: var(--radius); font-size: 14px; box-shadow: none; }\n');
  const r = run(dir);
  ok(r.findings.length === 0, 'var(), known value and none are not sins');
  rmSync(dir, { recursive: true, force: true });
}

// ---- one sin, one finding, even when two extractors see it ----
console.log('dedup:');
{
  const dir = makeRepo();
  writeFileSync(join(dir, 'components/Promo.tsx'),
    'export const Promo = () => <div className="bg-[#4a7be8]" style={{color: "#4a7be8"}}>go</div>;\n');
  const r = run(dir);
  const colours = r.findings.filter((f) => f.kind === 'color' && f.value === '#4a7be8');
  ok(colours.length === 1, `#4a7be8 on one line is one finding (got ${colours.length})`);
  rmSync(dir, { recursive: true, force: true });
}

// ---- a Badge that is plain UI is guarded; a Badge that draws SVG is not ----
console.log('artwork exemption earns itself:');
{
  const dir = makeRepo();
  writeFileSync(join(dir, 'components/PromoBadge.tsx'),
    'export const PromoBadge = () => <span style={{background: "#70b1ec"}}>new</span>;\n');
  const r = run(dir);
  ok(r.findings.some((f) => f.file.includes('PromoBadge')), 'styled Badge component is judged');
  writeFileSync(join(dir, 'components/ShieldBadge.tsx'),
    'export const ShieldBadge = () => <svg><path fill="#ff8800" d="M0 0"/></svg>;\n');
  const r2 = run(dir);
  ok(!r2.findings.some((f) => f.file.includes('ShieldBadge')), 'SVG-drawing badge stays exempt');
  rmSync(dir, { recursive: true, force: true });
}

// ---- excluded folders are invisible to the judge too ----
// ---- pictures drawn with code ----
// The report skipped these from roast 5.10 and the guard did not, so an OG
// card came up clean in one door and full of strays in the other (2026-09-08).
// The satori import sits at the top of a file the diff never touches, which is
// why the judge reads the whole file rather than the added lines.
console.log('pictures, not interface:');
{
  const dir = makeRepo();
  mkdirSync(join(dir, 'app/api/og'), { recursive: true });
  mkdirSync(join(dir, 'src/renderers'), { recursive: true });
  writeFileSync(join(dir, 'app/card.tsx'),
    "import { ImageResponse } from 'next/og';\nexport function GET() { return new ImageResponse(<div />); }\n");
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'og base');

  const STRAY = 'export const X = () => <div style={{ background: "#c0ffee", padding: "27px" }} />;\n';
  writeFileSync(join(dir, 'app/api/og/route.tsx'), STRAY);
  writeFileSync(join(dir, 'src/renderers/Board.tsx'), STRAY);
  writeFileSync(join(dir, 'components/Scene.tsx'),
    `export const Scene = () => <svg style={{ fill: "#c0ffee" }}>${'<path d="M0 0" />'.repeat(15)}</svg>;\n`);
  // the giveaway is in the committed part of the file, not in the added line
  writeFileSync(join(dir, 'app/card.tsx'),
    "import { ImageResponse } from 'next/og';\nexport function GET() { return new ImageResponse(<div style={{ background: '#c0ffee' }} />); }\n");

  const r = run(dir, '--base', 'HEAD');
  for (const [needle, label] of [
    ['api/og', 'an OG route is left alone'],
    ['renderers', 'a pixel renderer is left alone'],
    ['Scene', 'a file that is mostly drawing is left alone'],
    ['card.tsx', 'a next/og import above the diff still exempts the file'],
  ]) {
    ok(!r.findings.some((f) => f.file.includes(needle)), label);
  }

  // and an ordinary component in the same change is still judged
  writeFileSync(join(dir, 'components/Panel.tsx'), STRAY);
  const r2 = run(dir, '--base', 'HEAD');
  ok(r2.findings.some((f) => f.file.includes('Panel')), 'an ordinary component is still judged');

  rmSync(dir, { recursive: true, force: true });
}

// ---- the voice: no em-dashes in anything a person reads ----
console.log('copy:');
{
  const dir = makeRepo();
  writeFileSync(join(dir, 'components/Hero.tsx'),
    'export const Hero = () => <div style={{color: "#4a7be8"}} className="mt-[37px]">hi</div>;\n');
  const term = execFileSync('node', [CLI, dir, '--base', 'HEAD'], { encoding: 'utf8' });
  const md = execFileSync('node', [CLI, dir, '--base', 'HEAD', '--markdown'], { encoding: 'utf8' });
  ok(!term.includes('\u2014'), 'the terminal report carries no em-dash');
  ok(!md.includes('\u2014'), 'the markdown report carries no em-dash');
  rmSync(dir, { recursive: true, force: true });
}

console.log('exclusions:');
{
  const dir = makeRepo();
  mkdirSync(join(dir, 'lab'), { recursive: true });
  writeFileSync(join(dir, '.roastignore'), 'lab/\n');
  writeFileSync(join(dir, 'lab/experiment.css'), '.x { color: #cc0011; margin: 17px; }\n');
  const r = run(dir);
  ok(r.findings.length === 0, '.roastignore folder is not judged');
  const r2 = JSON.parse(execFileSync('node', [CLI, dir, '--base', 'HEAD', '--json', '--exclude', 'lab/'], { encoding: 'utf8' }));
  ok(r2.findings.length === 0, '--exclude folder is not judged');
  rmSync(dir, { recursive: true, force: true });
}

// ---- the escape hatch ----
// ---- a dark theme is the system working ----
console.log('dark theme:');
{
  const dir = makeRepo();
  writeFileSync(join(dir, 'styles/themes.css'),
    ':root { --surface: hsl(0 0% 100%); }\n.dark { --surface: 224 71% 4%; }\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'themes');
  appendFileSync(join(dir, 'styles/site.css'), '.panel { background: hsl(224 71% 4%); }\n');
  const r = run(dir);
  ok(r.findings.length === 0, 'a dark-theme token value is on-system, not a stray');
  appendFileSync(join(dir, 'styles/site.css'), '.panel-b { background: #04081a; }\n');
  const r2 = run(dir);
  const c = r2.findings.find((f) => f.kind === 'color');
  ok(c?.advice.includes('hsl(224 71% 4%)'), `near-dark stray snaps to the dark variant (${c?.advice})`);
  rmSync(dir, { recursive: true, force: true });
}

// ---- a var() with a fallback is still the system deciding ----
console.log('token reference with fallback:');
{
  const dir = makeRepo();
  appendFileSync(join(dir, 'styles/site.css'),
    '.x { border-radius: var(--radius, 4px); font-family: var(--font-sans, sans-serif); }\n');
  const r = run(dir);
  ok(r.findings.length === 0, 'var(--x, fallback) is benign for radius and font alike');
  rmSync(dir, { recursive: true, force: true });
}

console.log('escape hatch:');
{
  const dir = makeRepo();
  appendFileSync(join(dir, 'styles/site.css'),
    '/* guard-ignore-next-line — partner brand colour */\n.p { color: #e4002b; }\n');
  const r = run(dir);
  ok(r.findings.length === 0, 'ignored line stays silent');
  appendFileSync(join(dir, 'styles/site.css'), '.q { color: #e4002b; }\n');
  const r2 = run(dir);
  ok(r2.findings.length === 1 && r2.findings[0].line > 0, 'the exception covers one line, not the value');
  rmSync(dir, { recursive: true, force: true });
}

// ---- an old exception still protects its line ----
console.log('escape hatch, pre-existing:');
{
  const dir = makeRepo();
  appendFileSync(join(dir, 'styles/site.css'), '/* guard-ignore-next-line — legacy embed */\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'comment only');
  appendFileSync(join(dir, 'styles/site.css'), '.r { color: #cc0011 !important; }\n');
  const r = run(dir);
  ok(r.findings.length === 0, 'comment committed earlier still silences the new line below it');
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


// ---- the profile facts from roast 7.8: installed code, palette, registry ----
console.log('shadcn kit:');
const SHEET = ':root {\n' + ['background', 'foreground', 'primary', 'primary-foreground', 'muted', 'muted-foreground', 'border', 'input', 'ring', 'card'].map((r) => `  --${r}: oklch(0.5 0 0);`).join('\n') + '\n}\n.dark {\n' + ['background', 'foreground', 'primary', 'muted-foreground', 'border', 'ring'].map((r) => `  --${r}: oklch(0.2 0 0);`).join('\n') + '\n}\n';
function makeKit() {
  const dir = mkdtempSync(join(tmpdir(), 'guard-kit-'));
  mkdirSync(join(dir, 'app'), { recursive: true });
  mkdirSync(join(dir, 'components/ui'), { recursive: true });
  mkdirSync(join(dir, 'lib'), { recursive: true });
  git(dir, 'init', '-qb', 'main');
  writeFileSync(join(dir, 'package.json'), '{ "name": "kit", "dependencies": { "next": "16.0.0", "react": "19.0.0", "tailwindcss": "4.0.0" } }\n');
  writeFileSync(join(dir, 'tsconfig.json'), '{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }\n');
  writeFileSync(join(dir, 'components.json'), '{ "style": "base-nova", "tailwind": { "css": "app/globals.css", "baseColor": "neutral", "cssVariables": true }, "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui" } }\n');
  writeFileSync(join(dir, 'app/globals.css'), SHEET);
  writeFileSync(join(dir, 'lib/utils.ts'), 'export const cn = (...a) => a.join(" ");\n');
  writeFileSync(join(dir, 'components/ui/button.tsx'), 'export function Button(p) { return <button data-slot="button" className="bg-primary text-primary-foreground ring-[3px]" {...p} />; }\n');
  writeFileSync(join(dir, 'components/ui/card.tsx'), 'export function Card(p) { return <div data-slot="card" className="bg-card" {...p} />; }\n');
  writeFileSync(join(dir, 'app/page.tsx'), 'import { Button } from "@/components/ui/button";\nexport default function Page() { return <main className="p-6"><Button>ok</Button></main>; }\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'base');
  return dir;
}
{
  const dir = makeKit();
  // shadcn add sheet: a new door in the catalogue carries shadcn's brackets
  writeFileSync(join(dir, 'components/ui/sheet.tsx'), 'export function Sheet(p) { return <div data-slot="sheet" className="translate-x-[2.5rem] text-[0.8rem] bg-blue-500" {...p} />; }\n');
  const r = run(dir);
  ok(r.findings.length === 0, `a component added to the installed catalogue is not the change's sin (got ${r.findings.length})`);
  // the same class in own code is paint from a tin
  writeFileSync(join(dir, 'app/page.tsx'), 'export default function Page() { return <main className="p-6 text-slate-500 bg-blue-500/20">hi</main>; }\n');
  const r2 = run(dir);
  const palette = r2.findings.filter((f) => f.kind === 'palette');
  ok(palette.length === 2, `palette classes in own code are flagged where a theme variable exists (got ${palette.length})`);
  ok(palette[0]?.advice.includes('app/globals.css'), 'the advice names the theme file');
  ok(r2.findings.every((f) => !f.file.includes('components/ui/')), 'nothing inside the catalogue is judged');
  // a palette class named in a comment paints nothing (roast 8.4.4), whether
  // the comment sits on the line or opened on the line above
  writeFileSync(join(dir, 'app/page.tsx'), 'export default function Page() {\n  /* the old\n     bg-blue-500 look */\n  return <main className="p-6">{/* text-slate-500 is gone */}hi</main>; // ring-green-500\n}\n');
  const r3 = run(dir);
  ok(r3.findings.filter((f) => f.kind === 'palette').length === 0, `a palette class named in a comment is not flagged (got ${r3.findings.filter((f) => f.kind === 'palette').map((f) => f.value).join(', ') || 'none'})`);
  writeFileSync(join(dir, 'app/page.tsx'), 'export default function Page() {\n  return <main className="p-6 text-slate-500">{/* bg-blue-500 */}hi</main>;\n}\n');
  const r4 = run(dir);
  ok(r4.findings.filter((f) => f.kind === 'palette').map((f) => f.value).join() === 'text-slate-500', 'the class outside the comment on the same line is still flagged');
  // a story is a demo: the report leaves it out of the palette count, and so
  // does the guard (roast 9.3.2); a templates screen in the product is judged
  git(dir, 'checkout', '-q', '--', 'app/page.tsx');
  mkdirSync(join(dir, 'components/stories'), { recursive: true });
  writeFileSync(join(dir, 'components/stories/Badge.tsx'), 'export const Badge = () => <span className="text-slate-500">demo</span>;\n');
  mkdirSync(join(dir, 'app/templates'), { recursive: true });
  writeFileSync(join(dir, 'app/templates/Picker.tsx'), 'export const Picker = () => <div className="bg-blue-500">pick</div>;\n');
  const r5 = run(dir);
  const p5 = r5.findings.filter((f) => f.kind === 'palette');
  ok(!p5.some((f) => f.file.includes('stories/')), `a palette class in a story is not flagged (got ${p5.map((f) => f.file).join(', ') || 'none'})`);
  ok(p5.some((f) => f.file.includes('app/templates/')), 'a palette class in a templates screen of the product is flagged');
}

// ---- a product built on a kit (roast 8.4.6): the kit check ----
console.log('kit repo (MUI):');
function makeMui() {
  const dir = mkdtempSync(join(tmpdir(), 'guard-mui-'));
  mkdirSync(join(dir, 'src/theme'), { recursive: true });
  mkdirSync(join(dir, 'src/components'), { recursive: true });
  git(dir, 'init', '-qb', 'main');
  writeFileSync(join(dir, 'package.json'), '{ "name": "mui-app", "dependencies": { "@mui/material": "^7.3.0", "react": "19.0.0" } }\n');
  writeFileSync(join(dir, 'src/theme/theme.ts'), "import { createTheme } from '@mui/material/styles';\nexport const theme = createTheme({ spacing: 4, palette: { primary: { main: '#3355ff' }, text: { secondary: '#667085' } } });\n");
  for (let i = 0; i < 32; i++) {
    writeFileSync(join(dir, `src/components/Card${i}.tsx`), `import Box from '@mui/material/Box';\nexport const Card${i} = () => <Box sx={{ color: 'text.secondary', p: 2 }}>${i}</Box>;\n`);
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'base');
  return dir;
}
{
  const dir = makeMui();
  writeFileSync(join(dir, 'src/components/New.tsx'), "import Box from '@mui/material/Box';\nexport const New = () => (\n  <Box sx={{ color: '#667085' }}>\n    <Box sx={{ bgcolor: '#ff0000', p: '12px' }} />\n  </Box>\n);\n");
  const r = run(dir);
  const kinds = r.findings.map((f) => f.kind).sort().join(',');
  ok(kinds === 'kit-colour,kit-colour,kit-px', `a colour or a pixel size on a kit component is a kit finding, and nothing else says it (${kinds})`);
  const held = r.findings.find((f) => f.value === '#667085');
  ok(held?.line === 3 && held.advice.startsWith('the theme already holds it (src/theme/theme.ts)') && held.advice.includes("color: 'text.secondary' in sx"), 'a theme colour is told the theme already holds it, in the kit\'s words');
  const missing = r.findings.find((f) => f.value === '#ff0000');
  ok(missing?.line === 4 && missing.advice.startsWith('the theme has no such colour. Add it to the theme once (src/theme/theme.ts)'), 'a colour the theme lacks is told to add it once');
  const px = r.findings.find((f) => f.kind === 'kit-px');
  ok(px?.value === 'p: 12px' && px.advice.includes('write p: 3 in sx'), 'a pixel size becomes a spacing step on this theme');
  ok(r.findings.every((f) => f.label?.includes('an MUI component')), 'the label names the kit');
  const text = execFileSync('node', [CLI, dir, '--base', 'HEAD'], { encoding: 'utf8' });
  ok(text.includes('colour written onto an MUI component #667085. The theme already holds it'), 'the terminal line reads as agreed');
  // another kit's component in a kit file (roast 9.7.0): that kit is named,
  // and the first kit's fix stays off it; the first kit's own element in the
  // same file keeps the first kit's words
  writeFileSync(join(dir, 'src/components/Cells.tsx'), "import Box from '@mui/material/Box';\nimport { TableCell } from '@akamai/cds-components/react/Table';\nexport const Cells = () => (\n  <Box sx={{ p: '12px' }}>\n    <TableCell style={{ paddingLeft: '58px' }} />\n  </Box>\n);\n");
  const rk = run(dir).findings.filter((f) => f.file.endsWith('Cells.tsx') && f.kind.startsWith('kit-'));
  const cell = rk.find((f) => f.line === 5);
  ok(cell?.label === 'pixel size on an Akamai CDS component', `a value on another kit's component names that kit (got ${cell?.label})`);
  ok(cell?.advice === "it comes from @akamai/cds-components/react/Table, not MUI. Style it the way the repo styles its other Akamai CDS components. Never put one kit's styling on the other's components", `and gives the neutral rule, not the first kit's fix (got ${cell?.advice})`);
  ok(rk.find((f) => f.line === 4)?.advice.includes('write p: 3 in sx'), "the first kit's own element in the same file keeps its spacing step");
  rmSync(join(dir, 'src/components/Cells.tsx'));
  // a file that does not import the kit is judged by the generic rules
  writeFileSync(join(dir, 'src/components/Plain.tsx'), 'export const Plain = () => <div style={{ color: "#ff0000" }} />;\n');
  const r2 = run(dir);
  ok(r2.findings.some((f) => f.kind === 'color' && f.file.endsWith('Plain.tsx')), 'a colour off the kit is still a new colour');
  ok(!r2.findings.some((f) => f.kind === 'color' && f.file.endsWith('New.tsx')), 'a kit file is not reported twice for the same colour');
  // a theme colour pasted raw into a stylesheet is the value where the theme's
  // name belongs (guard 2.1.0, the rule roast 9.1.3 adopted); the advice
  // points at the theme file, since a kit theme has no var() to offer
  writeFileSync(join(dir, 'src/site.css'), '.x { color: #667085; }\n');
  const r3 = run(dir);
  const pasted = r3.findings.find((f) => f.file.endsWith('site.css'));
  ok(pasted?.kind === 'color' && pasted.advice.startsWith('the theme already holds this value (src/theme/theme.ts)'), `a theme value pasted into a stylesheet points at the theme (${pasted?.advice})`);
  rmSync(dir, { recursive: true, force: true });
}

console.log('!important as the medium:');
{
  const dir = makeRepo();
  appendFileSync(join(dir, 'styles/site.css'), '.cm-editor { font-family: monospace !important; }\n.cm-gutters { padding-right: 12px !important; }\n.hero { color: red !important; }\n');
  const r = run(dir);
  const imp = r.findings.filter((f) => f.kind === 'important');
  ok(imp.length === 1, `!important aimed at a code editor's class names is the medium; the team's own is not (got ${imp.length})`);
  ok(imp[0]?.line === 6 || imp[0]?.file.endsWith('site.css'), 'the remaining finding is the .hero one');
}
{
  const dir = makeRepo();
  writeFileSync(join(dir, 'styles/widget.css'), '@import "tailwindcss/utilities.css" layer(utilities) important;\n#w .btn { color: red !important; }\n');
  const r = run(dir);
  ok(r.findings.filter((f) => f.kind === 'important').length === 0, 'a widget stylesheet that must beat its host page is the medium');
}

console.log('registry: judged on what it publishes:');
{
  const dir = mkdtempSync(join(tmpdir(), 'guard-reg-'));
  mkdirSync(join(dir, 'registry/ui'), { recursive: true });
  mkdirSync(join(dir, 'app'), { recursive: true });
  git(dir, 'init', '-qb', 'main');
  writeFileSync(join(dir, 'package.json'), '{ "name": "reg" }\n');
  writeFileSync(join(dir, 'registry.json'), JSON.stringify({ name: 'reg', items: [{ name: 'pill', type: 'registry:ui', files: [{ path: 'registry/ui/pill.tsx', type: 'registry:ui' }] }] }) + '\n');
  writeFileSync(join(dir, 'registry/ui/pill.tsx'), 'export function Pill(p) { return <span className="rounded-md" {...p} />; }\n');
  writeFileSync(join(dir, 'app/page.tsx'), 'export default function Page() { return <main>docs</main>; }\n');
  writeFileSync(join(dir, 'app/site.css'), '--ink: #101010;\n.doc { color: var(--ink); }\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'base');
  // a stray colour in the docs site: not published, not judged
  appendFileSync(join(dir, 'app/site.css'), '.promo { color: #ff6600; }\n');
  const r = run(dir);
  ok(r.findings.length === 0, `the docs site of a registry is not judged (got ${r.findings.length})`);
  // the same stray in a published component: judged
  writeFileSync(join(dir, 'registry/ui/pill.tsx'), 'export function Pill(p) { return <span className="rounded-md" style={{ color: "#ff6600" }} {...p} />; }\n');
  const r2 = run(dir);
  ok(r2.findings.some((f) => f.file.includes('registry/ui/pill.tsx')), 'a published component is judged as the project\'s own work');
}

console.log('roast 8.6: twin tokens and imports of the copy to avoid:');
{
  const dir = mkdtempSync(join(tmpdir(), 'guard-twins-'));
  for (const d of ['src/styles', 'src/ui', 'src/features/invoices', 'src/layout']) mkdirSync(join(dir, d), { recursive: true });
  git(dir, 'init', '-qb', 'main');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'ledgerly', private: true, dependencies: { react: '^19.0.0', tailwindcss: '^4.1.0' } }) + '\n');
  const theme = (extraLight, extraDark) => '@import "tailwindcss";\n@theme {\n  --color-surface: #ffffff;\n  --color-ink: #101828;\n'
    + '  --color-brand: #3b5bdb;\n  --color-warning: #b25e09;\n  --color-warning-soft: #fdf5e6;\n  --color-negative-soft: #fcefeb;\n'
    + extraLight + '}\n\n.dark {\n  --color-brand: #6d8bff;\n  --color-warning-soft: #2b2112;\n' + extraDark + '}\n';
  writeFileSync(join(dir, 'src/styles/tokens.css'), theme('', ''));
  writeFileSync(join(dir, 'src/ui/Button.tsx'), 'export function Button(p) { return <button className="bg-brand text-surface" {...p} />; }\n');
  writeFileSync(join(dir, 'src/features/invoices/ButtonV2.tsx'), 'export function Button(p) { return <button className="bg-[#3d5ce0] text-white" {...p} />; }\n');
  const uses = (n) => Array.from({ length: n }, () => '<Button />').join('');
  writeFileSync(join(dir, 'src/layout/TopBar.tsx'), `import { Button } from '../ui/Button';\nexport function TopBar() { return <div className="bg-surface">${uses(8)}</div>; }\n`);
  writeFileSync(join(dir, 'src/features/invoices/InvoiceDetail.tsx'), `import { Button } from './ButtonV2';\nexport function InvoiceDetail() { return <div className="text-ink">${uses(4)}</div>; }\n`);
  writeFileSync(join(dir, 'src/features/invoices/InvoicesPage.tsx'), "import { Button } from '../../ui/Button';\nexport function InvoicesPage() { return <div className=\"bg-surface\"><Button /></div>; }\n");
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'base');

  // the "match the spec exactly" change: three tokens that copy existing ones,
  // one that copies nothing, and an import of the copy to avoid
  writeFileSync(join(dir, 'src/styles/tokens.css'), theme(
    '  --color-overdue-soft: #fff4e5;\n  --color-overdue-title: #8a4b08;\n  --color-overdue-action: #3d5ce0;\n',
    '  --color-overdue-soft: #2b1d0c;\n  --color-overdue-action: #6d8bff;\n'));
  writeFileSync(join(dir, 'src/features/invoices/InvoicesPage.tsx'), "import { Button } from '../../ui/Button';\nimport { Button as ButtonV2 } from './ButtonV2';\nexport function InvoicesPage() { return <div className=\"bg-surface\"><Button /><ButtonV2 /></div>; }\n");
  // an edit to a file that already imported the copy: not this change's
  writeFileSync(join(dir, 'src/features/invoices/InvoiceDetail.tsx'), `import { Button } from './ButtonV2';\nexport function InvoiceDetail() { return <div className="text-ink bg-surface">${uses(4)}</div>; }\n`);

  const r = run(dir);
  const twins = r.findings.filter((f) => f.kind === 'twin-token');
  ok(twins.length === 2, `two new tokens copy an existing one (got ${twins.length}: ${twins.map((f) => f.value).join(', ')})`);
  ok(twins.some((f) => f.value === '--color-overdue-soft' && /twin of the existing --color-warning-soft \(#fdf5e6\)/.test(f.advice)), 'the copied token names the one it copies');
  ok(twins.some((f) => f.value === '--color-overdue-action' && /the same dark value \(#6d8bff\)/.test(f.advice)), 'a shared dark value is said');
  ok(!twins.some((f) => f.value === '--color-overdue-title'), 'a token that copies nothing is left alone');
  ok(!r.findings.some((f) => /negative-soft|warning-soft/.test(f.value)), 'the tokens already there are not judged');
  const imp = r.findings.filter((f) => f.kind === 'avoided-copy');
  ok(imp.length === 1 && imp[0].file === 'src/features/invoices/InvoicesPage.tsx' && imp[0].line === 2, `the new import of the copy is flagged on its line (got ${imp.map((f) => `${f.file}:${f.line}`).join(', ')})`);
  ok(/The canonical one is src\/ui\/Button\.tsx/.test(imp[0]?.advice ?? ''), 'the import names the canonical copy');
  ok(/This copy hard-codes #3d5ce0/.test(imp[0]?.advice ?? ''), 'the colour hidden in the copy is named');
  const md = execFileSync('node', [CLI, dir, '--base', 'HEAD', '--markdown'], { encoding: 'utf8' });
  ok(md.includes('token that copies an existing one. --color-overdue-soft'), 'the PR comment words it once, without repeating the name');
}

// ---- charts (roast 8.8.0 / guard 2.0.0): the chart rule owns colours in a chart file ----
console.log('charts:');
{
  const chart = (colours, name = 'Donut') =>
    `import { PieChart, Pie } from 'recharts';\nconst C = [${colours.map((c) => `'${c}'`).join(', ')}];\nexport const ${name} = () => <PieChart><Pie fill={C[0]} /></PieChart>;\n`;
  // the first chart in a repo with no palette: one warning, no colour findings
  const dir = makeRepo();
  writeFileSync(join(dir, 'components/Donut.tsx'), chart(['#7c3aed', '#db2777', '#0891b2']));
  const r = run(dir);
  const kinds = r.findings.map((f) => f.kind).sort().join(',');
  ok(kinds === 'chart-palette', `first chart: one chart-palette warning, no colour findings (${kinds})`);
  // the scan already holds the new file, so the engine reads it as a chart
  // beside no palette rather than the first chart; the advice is the same
  ok(/no chart palette|First chart in this repo/.test(r.findings[0]?.advice ?? '') && /styles\/site\.css|the theme/.test(r.findings[0]?.advice ?? ''), 'the warning says the repo has no palette and where it belongs');
  ok(r.findings[0]?.line === 2, `the warning sits on the line of the first colour (line ${r.findings[0]?.line})`);
  // a second chart beside a hand-painted one: the precedent is named, once
  git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'first chart');
  writeFileSync(join(dir, 'components/Bars.tsx'), chart(['#16a34a', '#f59e0b'], 'Bars'));
  const r2 = run(dir);
  ok(r2.findings.length === 1 && r2.findings[0].kind === 'chart-palette', `second chart: one warning (${r2.findings.map((f) => f.kind).join(',')})`);
  ok(r2.findings[0]?.advice.includes('components/Donut.tsx already does the same with 3'), `the warning names the precedent (${r2.findings[0]?.advice.slice(0, 120)})`);
  rmSync(dir, { recursive: true, force: true });

  // a repo that keeps a chart palette: every hand-written chart colour names it
  const dir2 = makeRepo();
  // the repo's own names: shadcn's stock --chart-1..5 count as a palette
  // only when a chart reads them (roast 8.8.0), so they are not used here
  appendFileSync(join(dir2, 'styles/site.css'), '--chart-primary: #2563eb;\n--chart-secondary: #16a34a;\n');
  git(dir2, 'add', '-A'); git(dir2, 'commit', '-qm', 'palette');
  writeFileSync(join(dir2, 'components/Donut.tsx'), chart(['#7c3aed', '#db2777']));
  const r3 = run(dir2);
  const k3 = r3.findings.map((f) => f.kind).sort().join(',');
  ok(k3 === 'chart-colour,chart-colour', `with a palette: one chart-colour finding per colour (${k3})`);
  ok(r3.findings.every((f) => f.advice.includes('--chart-primary')), 'each finding names the palette');
  ok(r3.findings.every((f) => f.kind !== 'color'), 'the generic colour rule stays out of a chart file');
  // a chart that reads the palette is clean
  writeFileSync(join(dir2, 'components/Donut.tsx'), "import { Bar } from 'recharts';\nexport const Donut = () => <Bar fill=\"var(--chart-primary)\" />;\n");
  ok(run(dir2).findings.length === 0, 'a chart that reads the palette is clean');
  rmSync(dir2, { recursive: true, force: true });
}

// ---- a token's value pasted where its name belongs (roast 9.1.3 / guard 2.1.0) ----
console.log('token value pasted:');
{
  const dir = makeRepo();
  // a new stylesheet using the token's hex instead of var(--blue-500)
  writeFileSync(join(dir, 'styles/hero.css'), '.hero { color: #3b6fe0; }\n');
  const r = run(dir);
  const f = r.findings.find((x) => x.kind === 'color' && x.value === '#3b6fe0');
  ok(!!f, 'a token value pasted into a stylesheet is a finding');
  ok(f?.advice.includes('var(--blue-500)') && f?.advice.includes('use the name'), `the advice names the token and says use the name (${f?.advice})`);
  // the same value in a component
  writeFileSync(join(dir, 'components/Hero.tsx'), 'export const Hero = () => <div style={{ color: "#3b6fe0", padding: "12px" }}>x</div>;\n');
  const r2 = run(dir);
  ok(r2.findings.some((x) => x.kind === 'color' && x.value === '#3b6fe0' && x.file.endsWith('Hero.tsx')), 'and in a component');
  // the token file restating its own values is not
  appendFileSync(join(dir, 'styles/site.css'), '--blue-500-dup: #3b6fe0;\n');
  const r3 = run(dir);
  ok(!r3.findings.some((x) => x.kind === 'color' && x.file.endsWith('site.css')), 'a token file stating a value is not a pasted value');
  rmSync(dir, { recursive: true, force: true });
}

// ---- a button built from scratch where the repo has a Button (roast 9.2.0 / guard 2.1.0) ----
console.log('hand-made button:');
{
  const dir = makeRepo();
  mkdirSync(join(dir, 'pages'), { recursive: true });
  for (let i = 0; i < 22; i++) writeFileSync(join(dir, `pages/Page${i}.tsx`), "import { Button } from '../components/Button';\nexport const P = () => <Button>go</Button>;\n");
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'pages');
  const PAGE = "import styled from '@emotion/styled';\nconst StyledConnectButton = styled.button`\n  background: var(--blue-500);\n  color: white;\n  padding: 8px 14px;\n  font-weight: 600;\n`;\nexport const Settings = () => <StyledConnectButton>Connect</StyledConnectButton>;\n";
  writeFileSync(join(dir, 'pages/Settings.tsx'), PAGE);
  const r = run(dir);
  const f = r.findings.find((x) => x.kind === 'handmade-button');
  ok(!!f, 'a styled button next to a well-used Button is a finding');
  ok(f?.line === 2, `on the line the button starts (${f?.line})`);
  ok(f?.advice.includes("import { Button } from '../components/Button'"), `the advice gives the import line (${f?.advice})`);
  ok(!r.findings.some((x) => x.kind === 'color'), 'its token colours are not also flagged');
  const line = execFileSync('node', [CLI, dir, '--base', 'HEAD'], { encoding: 'utf8' }).split('\n').find((l) => l.includes('button built from scratch'));
  ok(!!line && !line.includes('undefined') && line.includes('StyledConnectButton'), `the terminal line reads whole (${line?.trim().slice(0, 90)})`);
  // a row on a button tag is not
  writeFileSync(join(dir, 'pages/Settings.tsx'), "import styled from '@emotion/styled';\nconst StyledRow = styled.button`\n  background: none;\n  border: none;\n  padding: 0;\n`;\nexport const S = () => <StyledRow>x</StyledRow>;\n");
  ok(!run(dir).findings.some((x) => x.kind === 'handmade-button'), 'a reset row on a button tag is not');
  // with the Button barely used, the repo has no answer and stays silent
  const dir2 = makeRepo();
  writeFileSync(join(dir2, 'components/Settings.tsx'), PAGE);
  ok(!run(dir2).findings.some((x) => x.kind === 'handmade-button'), 'no well-used Button, no finding');
  rmSync(dir, { recursive: true, force: true });
  rmSync(dir2, { recursive: true, force: true });
}

// ---- the palette rule, every door (roast 9.4.0 / guard 2.5.0) ----
// One rule in the engine, decided from what the theme holds rather than from
// the kind. Probed on the fleet 2026-10-01: the guard had no rule on a
// Tailwind theme, and its own gate (the configured sheet's :root rows) was
// shut on 11 of 48 shadcn repos where the live checks spoke.
console.log('palette rule, decided from what the theme holds:');
{
  const mk = (name) => { const dir = mkdtempSync(join(tmpdir(), `guard-pal-${name}-`)); git(dir, 'init', '-qb', 'main'); return dir; };
  const commit = (dir) => { git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'base'); };
  const CONFIG = (cssVars) => `{ "style": "base-nova", "tailwind": { "css": "app/globals.css", "baseColor": "neutral", "cssVariables": ${cssVars} }, "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui" } }\n`;
  const scaffold = (dir, cssVars = true) => {
    for (const d of ['app', 'components/ui', 'lib', 'features']) mkdirSync(join(dir, d), { recursive: true });
    writeFileSync(join(dir, 'package.json'), '{ "name": "kit", "dependencies": { "next": "16.0.0", "react": "19.0.0", "tailwindcss": "4.1.0" } }\n');
    writeFileSync(join(dir, 'tsconfig.json'), '{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }\n');
    writeFileSync(join(dir, 'components.json'), CONFIG(cssVars));
    writeFileSync(join(dir, 'lib/utils.ts'), 'export const cn = (...a) => a.join(" ");\n');
  };
  const doors = (dir, cls) => { for (const n of ['button', 'card', 'input', 'badge']) writeFileSync(join(dir, `components/ui/${n}.tsx`), `export function ${n[0].toUpperCase() + n.slice(1)}(p) { return <div data-slot="${n}" className="${cls}" {...p} />; }\n`); };
  const palette = (dir) => run(dir).findings.filter((f) => f.kind === 'palette');

  // 1. a Tailwind theme with no kit: the guard had no palette rule at all
  const tw = mk('tw');
  for (const d of ['src/styles', 'src/ui', 'src/features', 'src/stories']) mkdirSync(join(tw, d), { recursive: true });
  writeFileSync(join(tw, 'package.json'), JSON.stringify({ name: 'tw', private: true, dependencies: { react: '^19.0.0', tailwindcss: '^4.1.0' } }) + '\n');
  writeFileSync(join(tw, 'src/styles/tokens.css'), '@import "tailwindcss";\n@theme {\n  --color-surface: #ffffff;\n  --color-ink: #101828;\n  --color-ink-quiet: #667085;\n  --color-brand: #3b5bdb;\n  --color-warning: #d97706;\n  --color-edge: #e4e7ec;\n  --color-blue-500: #3b5bdb;\n}\n');
  writeFileSync(join(tw, 'src/ui/Button.tsx'), 'export function Button(p) { return <button className="bg-brand text-surface border-edge" {...p} />; }\n');
  writeFileSync(join(tw, 'src/features/Home.tsx'), 'export function Home() { return <div className="bg-surface text-ink"><p className="text-ink-quiet">x</p></div>; }\n');
  commit(tw);
  writeFileSync(join(tw, 'src/features/Alerts.tsx'), 'export function Alerts() { return <div className="bg-surface text-ink"><span className="text-amber-500">paused</span><span className="text-gray-500 dark:bg-black bg-blue-500">quiet</span></div>; }\n');
  writeFileSync(join(tw, 'src/stories/Alerts.stories.tsx'), 'export const Default = () => <span className="text-amber-500">x</span>;\n');
  const p1 = palette(tw);
  ok(p1.map((f) => f.value).join() === 'text-amber-500,text-gray-500', `tailwind theme: palette classes are flagged; a retuned name (bg-blue-500) and dark:bg-black are not, and a story is left out (got ${p1.map((f) => `${f.file}:${f.value}`).join(', ') || 'none'})`);
  ok(/src\/styles\/tokens\.css/.test(p1[0]?.advice ?? '') && /use text-warning as the class/.test(p1[0]?.advice ?? ''), `the advice names the theme file and the theme colour nearest by value (${p1[0]?.advice})`);
  ok(/use text-ink-quiet as the class/.test(p1[1]?.advice ?? ''), `a palette grey is pointed at the theme's grey (${p1[1]?.advice})`);

  // 2. a shadcn install whose configured sheet holds no :root rows, the rows
  //    kept by a sibling package (formbricks): the old gate was shut here
  const split = mk('split');
  scaffold(split);
  mkdirSync(join(split, 'packages/survey/styles'), { recursive: true });
  writeFileSync(join(split, 'app/globals.css'), '@import "tailwindcss";\n@theme {\n  --color-primary: #0f172a;\n  --color-primary-foreground: #fefefe;\n  --color-muted-foreground: #64748b;\n  --color-background: #ffffff;\n  --color-foreground: #0f172a;\n  --color-border: #e2e8f0;\n}\n');
  writeFileSync(join(split, 'packages/survey/styles/globals.css'), SHEET);
  doors(split, 'bg-primary text-primary-foreground');
  writeFileSync(join(split, 'app/page.tsx'), 'import { Button } from "@/components/ui/button";\nexport default function Page() { return <main className="p-6 text-foreground"><Button>ok</Button></main>; }\n');
  commit(split);
  writeFileSync(join(split, 'features/Members.tsx'), 'export function Members() { return <p className="text-slate-500 dark:bg-black">none</p>; }\n');
  const p2 = palette(split);
  ok(p2.map((f) => f.value).join() === 'text-slate-500,dark:bg-black', `shadcn with the rows in a sibling package: the contract holds and both spellings are flagged (got ${p2.map((f) => f.value).join(', ') || 'none'})`);
  // the engine names the file that carries the rows when the configured
  // sheet holds none (profiles/shadcn.mjs), so that is the file named here
  ok(/packages\/survey\/styles\/globals\.css/.test(p2[0]?.advice ?? '') && /use text-foreground as the class/.test(p2[0]?.advice ?? ''), `the advice names the sheet that carries the rows and a shadcn class (${p2[0]?.advice})`);

  // 3. utility-class mode: the palette is the theme, as the report scores it
  const util = mk('util');
  scaffold(util, false);
  writeFileSync(join(util, 'app/globals.css'), SHEET);
  doors(util, 'bg-zinc-900 text-zinc-50');
  writeFileSync(join(util, 'app/page.tsx'), 'import { Button } from "@/components/ui/button";\nexport default function Page() { return <main className="p-6 text-zinc-900"><Button>ok</Button></main>; }\n');
  commit(util);
  writeFileSync(join(util, 'features/Members.tsx'), 'export function Members() { return <p className="text-zinc-500 dark:bg-black">none</p>; }\n');
  ok(palette(util).length === 0, 'utility-class mode: a palette class is the kit\'s own style, not flagged');

  // 4. a shadcn kit with no shadcn rows but a theme of its own (Nango, Ghost):
  //    the theme's names are the vocabulary
  const own = mk('own');
  scaffold(own);
  writeFileSync(join(own, 'app/globals.css'), '@import "tailwindcss";\n@theme {\n  --color-surface: #ffffff;\n  --color-ink: #101828;\n  --color-ink-quiet: #667085;\n  --color-brand: #3b5bdb;\n  --color-danger: #dc2626;\n  --color-edge: #e4e7ec;\n}\n');
  doors(own, 'bg-surface text-ink border-edge');
  writeFileSync(join(own, 'app/page.tsx'), 'import { Button } from "@/components/ui/button";\nexport default function Page() { return <main className="bg-surface text-ink p-6"><Button className="bg-brand text-surface">ok</Button><span className="text-ink-quiet border-edge">x</span></main>; }\n');
  commit(own);
  writeFileSync(join(own, 'features/Members.tsx'), 'export function Members() { return <p className="text-gray-500 text-red-500 dark:bg-black">none</p>; }\n');
  const p4 = palette(own);
  ok(p4.map((f) => f.value).join() === 'text-gray-500,text-red-500', `a shadcn kit with a theme of its own: palette classes are judged against that theme (got ${p4.map((f) => f.value).join(', ') || 'none'})`);
  ok(/use text-ink-quiet as the class/.test(p4[0]?.advice ?? '') && /use text-danger as the class/.test(p4[1]?.advice ?? ''), `the advice names the theme's own classes (${p4.map((f) => f.advice).join(' | ')})`);
  const md = execFileSync('node', [CLI, own, '--base', 'HEAD', '--markdown'], { encoding: 'utf8' });
  ok(md.includes('palette colour where a theme variable exists `text-gray-500`. The theme names its colours in app/globals.css; use text-ink-quiet as the class.'), 'the PR comment reads as one sentence with the theme file and the class');
  for (const d of [tw, split, util, own]) rmSync(d, { recursive: true, force: true });
}

// ---- the catalogue folder, file by file (roast 9.5.0 / guard 2.6.0) ----
// A component of the team's own kept in components/ui used to be skipped as
// installed code. Probed on the fleet 2026-10-01: 33 of 44 shadcn repos keep
// their own components there.
console.log('the catalogue folder, file by file:');
{
  const dir = makeKit();
  writeFileSync(join(dir, 'components/ui/status-banner.tsx'), 'export function StatusBanner(p) { return <div className="px-3 text-[13px] text-slate-500" {...p} />; }\n');
  writeFileSync(join(dir, 'components/ui/sheet.tsx'), 'export function Sheet(p) { return <div data-slot="sheet" className="translate-x-[2.5rem] text-[0.8rem] bg-blue-500" {...p} />; }\n');
  const r = run(dir);
  const banner = r.findings.filter((f) => f.file === 'components/ui/status-banner.tsx').map((f) => f.kind).sort().join(',');
  ok(banner === 'arbitrary,palette', `a team component added to the catalogue folder is judged (got ${banner || 'none'})`);
  ok(!r.findings.some((f) => f.file === 'components/ui/sheet.tsx'), 'one of shadcn\'s own components added beside it is still left alone');
  rmSync(dir, { recursive: true, force: true });
}

// ---- class strings on the whole file (roast 9.6.0 / guard 2.7.0) ----
// A bracket value inside cn() or cva() was invisible to the guard: the engine
// read className only, and the guard reads one added line at a time while a
// cn() call usually runs over several lines. Probed 2026-10-01: 3,794 such
// values in 66 fleet repos, 88% on a line after the call opens.
console.log('class strings on the whole file:');
{
  const dir = makeKit();
  const probe = [
    'import { cn } from "@/lib/utils";',                                        // 1
    'import { cva } from "class-variance-authority";',                          // 2
    'const v = cva(',                                                           // 3
    '  "inline-flex h-[2.5rem]",',                                              // 4
    '  { variants: { size: { sm: "w-[137px]", lg: "w-[251px]" } } },',          // 5
    ');',                                                                       // 6
    'export function Probe({ a }) {',                                           // 7
    '  return (',                                                               // 8
    '    <div className={cn("text-[14px]")}>',                                  // 9
    '      <p className={cn(',                                                  // 10
    '        "flex",',                                                          // 11
    '        "text-[15px]",',                                                   // 12
    '        a && "rounded-[9px]",',                                            // 13
    '      )} />',                                                              // 14
    '      <span className={`gap-2',                                            // 15
    '        w-[73px]`} />',                                                    // 16
    '    </div>',                                                               // 17
    '  );',                                                                     // 18
    '}',                                                                        // 19
  ].join('\n') + '\n';
  writeFileSync(join(dir, 'app/probe.tsx'), probe);
  const got = run(dir).findings.filter((f) => f.file === 'app/probe.tsx' && f.kind === 'arbitrary').map((f) => `${f.value}@${f.line}`).sort().join(' ');
  ok(got === '[137px]@5 [14px]@9 [15px]@12 [2.5rem]@4 [251px]@5 [73px]@16 [9px]@13', `bracket values in cva() and cn() calls over several lines are flagged, each on its own line (got ${got || 'none'})`);
  rmSync(dir, { recursive: true, force: true });

  // an edit inside a call that was already there: only the added line counts
  const dir2 = makeKit();
  writeFileSync(join(dir2, 'app/list.tsx'), 'import { cn } from "@/lib/utils";\nexport const L = () => (\n  <ul className={cn(\n    "grid",\n    "text-[15px]",\n  )} />\n);\n');
  git(dir2, 'add', '-A'); git(dir2, 'commit', '-qm', 'list');
  writeFileSync(join(dir2, 'app/list.tsx'), 'import { cn } from "@/lib/utils";\nexport const L = () => (\n  <ul className={cn(\n    "grid",\n    "text-[15px]",\n    "leading-[1.65rem]",\n  )} />\n);\n');
  const got2 = run(dir2).findings.filter((f) => f.kind === 'arbitrary').map((f) => `${f.value}@${f.line}`).join(' ');
  ok(got2 === '[1.65rem]@6', `an added line inside an existing call is judged, the old lines are not (got ${got2 || 'none'})`);
  rmSync(dir2, { recursive: true, force: true });
}

// ---- a team's layer over the kit (roast 9.6.1 / guard 2.8.0) ----
// A file that imports only the team's layer (@linode/ui, metabase/ui) was
// never judged by the kit rule: the engine's live pattern for the layer was
// broken. Linode: 750 of 1,487 kit files judged (2026-10-01).
console.log('a team layer over the kit:');
{
  const dir = makeMui();
  mkdirSync(join(dir, 'packages/ui/src'), { recursive: true });
  writeFileSync(join(dir, 'packages/ui/package.json'), '{ "name": "@acme/ui", "private": true }\n');
  for (const c of ['Box', 'Stack', 'Typography']) writeFileSync(join(dir, `packages/ui/src/${c}.ts`), `export { default as ${c} } from '@mui/material/${c}';\n`);
  git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'layer');
  writeFileSync(join(dir, 'src/components/Banner.tsx'), "import { Box } from '@acme/ui';\nexport const Banner = () => (\n  <Box sx={{ bgcolor: '#ff0000', p: '12px' }}>x</Box>\n);\n");
  const kinds = run(dir).findings.filter((f) => f.file === 'src/components/Banner.tsx').map((f) => f.kind).sort().join(',');
  ok(kinds === 'kit-colour,kit-px', `a file that imports only the team's layer is judged by the kit rule (got ${kinds || 'none'})`);
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
