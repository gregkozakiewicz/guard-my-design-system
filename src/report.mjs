/**
 * The voice — findings are blunt, advice is calm and starts from intent.
 * One format for the terminal, one for the PR comment (markdown). Both end
 * by pointing at the inspector for the full picture.
 */

const KIND_LABEL = {
  color: 'new colour',
  spacing: 'new spacing value',
  radius: 'new border radius',
  fontsize: 'new font size',
  shadow: 'new shadow',
  arbitrary: 'arbitrary Tailwind value',
  important: '!important',
  font: 'new typeface',
  inline: 'inline style block',
  component: 'second definition of',
  palette: 'palette colour where a theme variable exists',
  // on a kit repo the engine words the label with the kit's name (f.label)
  'kit-colour': 'colour written onto a kit component',
  'kit-px': 'pixel size on a kit component',
  // the engine's sentence names the token or the import itself (roast 8.6)
  'twin-token': 'token that copies an existing one',
  'avoided-copy': 'import of a duplicate',
  // the chart rule (roast 8.8): a colour beside a chart palette, or a chart
  // painting by hand where the repo keeps none
  'chart-colour': 'chart colour written by hand',
  'chart-palette': 'chart painted by hand',
  // a styled.button or a dressed button tag where the repo has a Button
  // (roast 9.2.0); the engine's sentence names the Button and its import
  'handmade-button': 'button built from scratch',
};
const labelOf = (f) => f.label ?? KIND_LABEL[f.kind];

// Kinds whose label already says everything; printing the value repeats it.
const VALUELESS = new Set(['important', 'inline', 'twin-token', 'avoided-copy', 'chart-palette', 'handmade-button']);

const FOOTER = 'Full picture of the whole codebase: `npx roast-my-design-system`';

// Files the change touches that the roast report does not read: a docs site,
// examples, demos, stories, tests. Said in one line, so a silent guard on a
// docs-only change is explained rather than taken for a pass on everything.
function leftOutLine(leftOut = [], code = (s) => s) {
  if (!leftOut.length) return '';
  const n = leftOut.length;
  const names = leftOut.slice(0, 3).map(code).join(', ') + (n > 3 ? ` and ${n - 3} more` : '');
  return `${n} changed file${n === 1 ? ' was' : 's were'} left out, because the roast report does not read ${n === 1 ? 'it' : 'them'} (docs sites, examples, stories, tests): ${names}.`;
}

export function terminalReport(findings, { leftOut = [] } = {}) {
  const left = leftOutLine(leftOut);
  if (!findings.length) {
    return 'guard-my-design-system: no new mess. Nothing added in this change strays from the system.' + (left ? `\n  ${left}` : '');
  }
  const lines = [`guard-my-design-system: ${findings.length} new issue${findings.length === 1 ? '' : 's'} in this change\n`];
  for (const f of findings) {
    lines.push(`  ${f.file}:${f.line} · ${labelOf(f)} ${VALUELESS.has(f.kind) ? '' : f.value}`.trimEnd() + `. ${capitalise(f.advice)}.`);
  }
  lines.push('');
  lines.push('  Only lines added in this change were counted. The existing codebase was not judged.');
  if (left) lines.push(`  ${left}`);
  lines.push(`  ${FOOTER.replaceAll('`', '')}`);
  return lines.join('\n');
}

export function markdownReport(findings, { leftOut = [] } = {}) {
  const left = leftOutLine(leftOut, (s) => `\`${s}\``);
  const sub = `<sub>Only added lines are checked; the existing codebase is never judged. ${left ? `${left} ` : ''}${FOOTER}</sub>`;
  if (!findings.length) {
    return [
      '**🛡 guard-my-design-system: no new mess**',
      '',
      'Nothing added in this pull request strays from the design system.',
      '',
      sub,
    ].join('\n');
  }
  const out = [`**🛡 guard-my-design-system: ${findings.length} new issue${findings.length === 1 ? '' : 's'} in this pull request**`, ''];
  for (const f of findings) {
    out.push(`- \`${f.file}:${f.line}\` · ${labelOf(f)} ${VALUELESS.has(f.kind) ? '' : `\`${f.value}\``}`.trimEnd() + `. ${capitalise(f.advice)}.`);
  }
  out.push('');
  out.push(sub);
  return out.join('\n');
}

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);
