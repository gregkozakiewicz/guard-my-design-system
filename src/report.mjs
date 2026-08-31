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
};

const FOOTER = 'Full picture of the whole codebase: `npx roast-my-design-system`';

export function terminalReport(findings) {
  if (!findings.length) {
    return 'guard-my-design-system: no new mess. Nothing added in this change strays from the system.';
  }
  const lines = [`guard-my-design-system: ${findings.length} new issue${findings.length === 1 ? '' : 's'} in this change\n`];
  for (const f of findings) {
    lines.push(`  ${f.file}:${f.line} — ${KIND_LABEL[f.kind]} ${f.value === '!important' ? '' : f.value}`.trimEnd() + `. ${capitalise(f.advice)}.`);
  }
  lines.push('');
  lines.push('  Only lines added in this change were counted. The existing codebase was not judged.');
  lines.push(`  ${FOOTER.replaceAll('`', '')}`);
  return lines.join('\n');
}

export function markdownReport(findings) {
  if (!findings.length) {
    return [
      '**🛡 guard-my-design-system: no new mess**',
      '',
      'Nothing added in this pull request strays from the design system.',
      '',
      `<sub>Only added lines are checked; the existing codebase is never judged. ${FOOTER}</sub>`,
    ].join('\n');
  }
  const out = [`**🛡 guard-my-design-system: ${findings.length} new issue${findings.length === 1 ? '' : 's'} in this pull request**`, ''];
  for (const f of findings) {
    const val = f.kind === 'important' ? '`!important`' : `\`${f.value}\``;
    out.push(`- \`${f.file}:${f.line}\` — ${KIND_LABEL[f.kind]} ${f.kind === 'important' ? '' : val}`.trimEnd() + `. ${capitalise(f.advice)}.`);
  }
  out.push('');
  out.push(`<sub>Only added lines are checked; the existing codebase is never judged. ${FOOTER}</sub>`);
  return out.join('\n');
}

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);
