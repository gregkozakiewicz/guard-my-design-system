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
// inline, always. Artwork-named files (Icon, Logo, Badge…) are exempt only
// when their added lines actually draw SVG — a Badge component that is plain
// styled UI gets guarded like everything else.
const EMAIL_PRINT_RE = /email|(^|[/.])print([/.]|$)/i;
const ARTWORK_NAME_RE = /(^|\/)[\w.-]*(icon|logo|badge|illustration|artwork)[\w.-]*\.(tsx|jsx)$/i;
const SVG_MARKUP_RE = /<(svg|path|rect|circle|ellipse|polygon|defs|mask)\b/i;

function exemptFiles(added) {
  const svgish = new Set();
  for (const { file, text } of added) {
    if (ARTWORK_NAME_RE.test(file) && SVG_MARKUP_RE.test(text)) svgish.add(file);
  }
  return (file) => EMAIL_PRINT_RE.test(file) || svgish.has(file);
}

const FONT_LINE_RE = /font-family\s*:\s*([^;{}]+)/i;

// The other declarations the engine harvests and the guard judges in style
// files. One regex per kind; the whole trimmed value is the unit of
// comparison, exactly as the harvest counts it.
const EXTRA_KINDS = [
  { kind: 'radius', re: /border-radius\s*:\s*([^;{}]+)/i, learned: 'radii' },
  { kind: 'fontsize', re: /(?:^|[^-\w])font-size\s*:\s*([^;{}]+)/i, learned: 'fontSizes' },
  { kind: 'shadow', re: /box-shadow\s*:\s*([^;{}]+)/i, learned: 'shadows' },
];
// Disciplined values that are never sins: token use, resets, inheritance.
const BENIGN_VALUE_RE = /^(var\(--[\w-]+\)|inherit|initial|unset|none|normal|0)$/i;
const extraValue = (re, text) => {
  const m = re.exec(text);
  if (!m) return null;
  const v = m[1].trim().replace(/\s+/g, ' ');
  return BENIGN_VALUE_RE.test(v) ? null : v;
};

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
  const exempt = exemptFiles(added);
  const addedLengths = new Map(), addedFaces = new Map();
  const addedExtras = { radius: new Map(), fontsize: new Map(), shadow: new Map() };
  for (const { file, line, text } of added) {
    if (exempt(file)) continue;
    const css = isStyleFile(file);
    if (!css && !isCodeFile(file)) continue;
    for (const s of extractStyling(text, { css }).spacing) {
      addedLengths.set(s.value, (addedLengths.get(s.value) ?? 0) + 1);
    }
    if (css) {
      for (const { kind, re } of EXTRA_KINDS) {
        const v = extraValue(re, text);
        if (v) addedExtras[kind].set(v, (addedExtras[kind].get(v) ?? 0) + 1);
      }
    }
    const fm = css ? FONT_LINE_RE.exec(text) : null;
    const face = fm ? typefaceOf(fm[1].trim()) : null;
    if (face) addedFaces.set(face, (addedFaces.get(face) ?? 0) + 1);
  }
  const knownLengths = new Set(
    system.spacing.filter((s) => s.count > (addedLengths.get(s.value) ?? 0)).map((s) => s.value)
  );
  const knownExtras = {};
  for (const { kind, learned } of EXTRA_KINDS) {
    knownExtras[kind] = new Set(
      (system[learned] ?? []).filter((e) => e.count > (addedExtras[kind].get(e.value) ?? 0)).map((e) => e.value)
    );
  }
  // "use var(--blue-500)", not "go hunt this hex": name a value when the
  // system defines it as a custom property.
  const named = (value) => {
    const n = system.tokenNames?.[value];
    return n ? `var(${n}), ${value}` : value;
  };
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
    if (exempt(file)) continue;
    const css = isStyleFile(file);
    if (!css && !isCodeFile(file)) continue;

    const seen = extractStyling(text, { css });

    for (const c of seen.colors) {
      if (tokenSet.has(c.value)) continue; // disciplined token use
      const near = c.value.startsWith('#') ? nearestColor(c.value, system.tokens) : null;
      findings.push({
        file, line, kind: 'color', value: c.value,
        advice: near && near.distance <= 48
          ? `nearest token: ${named(near.value)}`
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
        advice: near ? `nearest existing value: ${named(near.value)}` : 'first value of its unit in this codebase',
      });
    }

    if (css) {
      for (const { kind, re } of EXTRA_KINDS) {
        const v = extraValue(re, text);
        if (!v || knownExtras[kind].has(v)) continue;
        const near = nearestLength(v, [...knownExtras[kind]]);
        findings.push({
          file, line, kind, value: v,
          advice: near
            ? `nearest existing value: ${named(near.value)}`
            : knownExtras[kind].size
              ? `differs from every one the system declares`
              : 'first of its kind in this codebase',
        });
      }
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

  // Two extractors can see the same value on the same line (a hex inside a
  // Tailwind class is also a hex in the raw sweep). One sin, one line.
  const seen = new Set();
  const deduped = findings.filter((f) => {
    const key = `${f.file}|${f.line}|${f.kind}|${f.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}
