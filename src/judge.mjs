/**
 * The judge — added lines on one side, the learned system on the other.
 * All detection comes from the roast engine's official doorway; this file
 * only decides what counts as "new mess" in the context of a diff.
 *
 * The rule for every sin: it must be NEW. A colour that is already a token,
 * a length the codebase already uses, a typeface the system already declares
 * — all invisible. The guard never asks anyone to clean the past.
 */
import {
  extractStyling, normalizeHex, nearestColor, nearestLength,
  isCodeFile, isStyleFile, typefaceOf, GENERIC_FONTS,
} from 'roast-my-design-system/engine';

// Same honesty exemptions the engine applies: email and print styling must be
// inline, and artwork files carry hex that is drawing, not styling.
const EXEMPT_FILE_RE = /email|(^|[/.])print([/.]|$)|(^|\/)[\w.-]*(icon|logo|badge|illustration|artwork)[\w.-]*\.(tsx|jsx)$/i;

const FONT_LINE_RE = /font-family\s*:\s*([^;{}]+)/i;

/**
 * Judge added lines against the learned system.
 * Returns [{ file, line, kind, value, advice }] sorted by file then line.
 * kinds: color | spacing | arbitrary | important | font
 */
export function judge(added, system) {
  const tokenSet = new Set(system.tokens);

  // The system was learned from the tree that already CONTAINS these added
  // lines, so a new value would vouch for itself. A value is only "known"
  // if the repo uses it more times than this change added it.
  const addedLengths = new Map(), addedFaces = new Map();
  for (const { file, line, text } of added) {
    if (EXEMPT_FILE_RE.test(file)) continue;
    const css = isStyleFile(file);
    if (!css && !isCodeFile(file)) continue;
    for (const s of extractStyling(text, { css }).spacing) {
      addedLengths.set(s.value, (addedLengths.get(s.value) ?? 0) + 1);
    }
    const fm = css ? FONT_LINE_RE.exec(text) : null;
    const face = fm ? typefaceOf(fm[1].trim()) : null;
    if (face) addedFaces.set(face, (addedFaces.get(face) ?? 0) + 1);
  }
  const knownLengths = new Set(
    system.spacing.filter((s) => s.count > (addedLengths.get(s.value) ?? 0)).map((s) => s.value)
  );
  const faceCounts = new Map();
  for (const f of system.fontFamilies) {
    const face = typefaceOf(f.value);
    if (face) faceCounts.set(face, (faceCounts.get(face) ?? 0) + f.count);
  }
  const knownFaces = new Set(
    [...faceCounts].filter(([face, n]) => n > (addedFaces.get(face) ?? 0)).map(([face]) => face)
  );
  const findings = [];

  for (const { file, line, text } of added) {
    if (EXEMPT_FILE_RE.test(file)) continue;
    const css = isStyleFile(file);
    if (!css && !isCodeFile(file)) continue;

    const seen = extractStyling(text, { css });

    for (const c of seen.colors) {
      if (tokenSet.has(c.value)) continue; // disciplined token use
      const near = c.value.startsWith('#') ? nearestColor(c.value, system.tokens) : null;
      findings.push({
        file, line, kind: 'color', value: c.value,
        advice: near && near.distance <= 48
          ? `nearest token: ${near.value}`
          : system.tokenFile
            ? `no token resembles it — if it is a real decision, it belongs in ${system.tokenFile}`
            : 'no token layer found to compare against',
      });
    }

    for (const s of seen.spacing) {
      if (knownLengths.has(s.value)) continue; // the codebase already uses it
      const near = nearestLength(s.value, [...knownLengths]);
      findings.push({
        file, line, kind: 'spacing', value: s.value,
        advice: near ? `nearest existing value: ${near.value}` : 'first value of its unit in this codebase',
      });
    }

    for (const a of seen.arbitrary) {
      findings.push({
        file, line, kind: 'arbitrary', value: a.value,
        advice: 'an arbitrary Tailwind value sidesteps the scale; use a scale step or add one',
      });
    }

    for (const _ of seen.important) {
      findings.push({
        file, line, kind: 'important', value: '!important',
        advice: 'the cascade admitting defeat; raise specificity or fix the source order',
      });
    }

    const fm = css ? FONT_LINE_RE.exec(text) : null;
    if (fm && !/^(var\(--[\w-]+\)|inherit)$/i.test(fm[1].trim())) {
      const face = typefaceOf(fm[1].trim());
      if (face && !GENERIC_FONTS.has(face.toLowerCase()) && !knownFaces.has(face)) {
        findings.push({
          file, line, kind: 'font', value: face,
          advice: knownFaces.size
            ? `the system declares: ${[...knownFaces].join(', ')}`
            : 'first typeface declared in this codebase',
        });
      }
    }
  }

  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}
