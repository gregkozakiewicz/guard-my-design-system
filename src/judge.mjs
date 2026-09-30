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
  definedComponents, componentNamesIn, duplicateCopies, isPageFile, exemptReason,
  EXTRA_KINDS, extraValue, fontDeclarations,
  WIDGET_CSS_RE, isLibraryClass, kitPaintFindings, paletteFindings,
  tokenTwinFindings, avoidedImportFindings, isChartFile, chartFindings, handmadeButtonFindings,
} from 'roast-my-design-system/engine';

// Folder membership, the way the engine's own splits do it.
const underAny = (file, dirs) => (dirs ?? []).some((d) => file === d || file.startsWith(`${d}/`) || file.endsWith(`/${d}`) || file.includes(`/${d}/`));

// The selector of the innermost block an added line sits in, read from the
// whole file: scan back from the line to the nearest unclosed "{" and take
// what precedes it. Null when the line is not inside a block.
function selectorAt(whole, lineNo) {
  if (!whole) return null;
  const lines = whole.split('\n');
  // include the added line itself up to the declaration: the block often
  // opens on the same line (`.cm-editor { font: x !important; }`)
  const cur = lines[lineNo - 1] ?? '';
  const cut = cur.search(/!\s*important/i);
  const upto = lines.slice(0, Math.max(0, lineNo - 1)).join('\n') + '\n' + (cut >= 0 ? cur.slice(0, cut) : cur);
  let depth = 0;
  for (let i = upto.length - 1; i >= 0; i--) {
    const ch = upto[i];
    if (ch === '}') depth++;
    else if (ch === '{') {
      if (depth === 0) {
        const before = upto.slice(0, i);
        const start = Math.max(before.lastIndexOf('}'), before.lastIndexOf(';'), before.lastIndexOf('{'));
        return before.slice(start + 1).trim().split('\n').pop().trim();
      }
      depth--;
    }
  }
  return null;
}

// git prints diff paths from the repository root; the engine lists them from
// the directory it scanned. When the guard runs in a subdirectory the two
// disagree by a prefix, so a suffix match stands in for equality. It errs
// towards calling them the same file, which errs towards silence.
const samePath = (a, b) => a === b || a.endsWith(`/${b}`) || b.endsWith(`/${a}`);

// The honesty exemptions come from the engine now: email and print styling
// that must be inline, OG cards and PDF invoices, pixel renderers, and artwork
// that actually draws. This file used to keep its own copy and claim in a
// comment that the engine applied the same one. It did not, and that gap is
// how roast --check came to raise findings on email templates. One list, read
// from the doorway, so the claim is true by construction.

/**
 * Which files to leave alone. The whole file decides, not the added lines: a
 * satori import or an SVG drawing sits at the top of a file a diff may never
 * touch. readFile is how the caller hands over the working tree; without one
 * the added lines stand in, which sees less and so exempts less. email is
 * where the repo keeps its emails (roast 9.2.3): a file is an email because
 * it is one, not because its path mentions one.
 */
function exemptFiles(added, readFile, email = null) {
  const text = new Map();
  for (const { file } of added) {
    if (text.has(file)) continue;
    let whole = null;
    if (readFile) { try { whole = readFile(file); } catch { whole = null; } }
    text.set(file, whole ?? added.filter((a) => a.file === file).map((a) => a.text).join('\n'));
  }
  const verdict = new Map();
  return (file) => {
    if (!verdict.has(file)) verdict.set(file, Boolean(exemptReason(file, text.get(file) ?? '', { email })));
    return verdict.get(file);
  };
}

// Radius, font size and shadow, and what counts as a disciplined value, also
// come from the engine, so the harvest and the guard measure the same thing.

/**
 * Judge added lines against the learned system.
 * Returns [{ file, line, kind, value, advice }] sorted by file then line.
 * kinds: color | spacing | radius | fontsize | shadow | arbitrary |
 *        important | font | inline | component | palette | kit-colour |
 *        kit-px | twin-token | avoided-copy | chart-colour | chart-palette
 * readFile(file) gives the file as it stands; readBase(file) the file at the
 * base (null when the change creates it), so a token or an import the change
 * adds can be told from one that was already there.
 */
export function judge(added, system, { readFile, readBase } = {}) {
  const tokenSet = new Set(system.tokens);
  // How the repo was read, from the engine's own profiles (roast 7.8):
  // installed code is not the change's sin, a registry is judged on what it
  // publishes, and a palette class counts only where a theme variable exists.
  const prof = system.profile ?? {};
  const installed = prof.installedDirs ?? [];
  const counted = prof.registry?.countedDirs ?? [];
  const variants = prof.registry?.variants ?? [];
  const blockDirs = prof.registry?.blockDirs ?? [];
  const outOfScope = (file) => underAny(file, installed) || (counted.length > 0 && !underAny(file, counted));
  const whole = new Map();
  const wholeText = (file) => {
    if (!whole.has(file)) { let t = null; if (readFile) { try { t = readFile(file); } catch { t = null; } } whole.set(file, t); }
    return whole.get(file);
  };
  const isWidgetFile = (file) => underAny(file, prof.widgetDirs) || WIDGET_CSS_RE.test(wholeText(file) ?? '');
  // The palette rule, in the engine's words (roast 9.4.0, lib/palette.mjs):
  // which vocabulary a palette class is judged against was decided once by
  // the profile, a Tailwind theme's own names, shadcn's, or the repo's own
  // theme under a shadcn kit; null is the rule switched off (no theme, or
  // shadcn in utility-class mode, where the palette is the theme). The guard
  // used to keep a gate of its own (the configured sheet's :root rows) and
  // was silent on 11 of 48 fleet shadcn repos where the live checks spoke.
  const palette = prof.palette ?? null;
  const paletteAdvice = (f) => `the theme names its colours in ${f.themeFile}; use ${f.example} as the class. ${f.fix.replace(/^Use a theme token as the class \([^)]*\)\.\s*/, '').replace(/\.$/, '')}`;

  // The system was learned from the tree that already CONTAINS these added
  // lines, so a new value would vouch for itself. A value is only "known"
  // if the repo uses it more times than this change added it.
  const exempt = exemptFiles(added, readFile, system.email ?? null);
  const addedLengths = new Map(), addedFaces = new Map();
  const addedExtras = { radius: new Map(), fontsize: new Map(), shadow: new Map() };
  for (const { file, line, text } of added) {
    if (exempt(file) || outOfScope(file)) continue;
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
    if (css) {
      for (const d of fontDeclarations(text)) {
        const face = typefaceOf(d.raw);
        if (face) addedFaces.set(face, (addedFaces.get(face) ?? 0) + 1);
      }
    }
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
  const statesTokens = (file) => (system.tokenSources ?? []).some((t) => samePath(t, file));
  // on a kit repo the theme is where a colour is decided (mcp/knowledge reads it the same way)
  const themeFile = system.profile?.kit?.themeFiles?.[0] ?? system.tokenFile ?? null;
  const named = (value) => {
    // shadcn-style tokens are defined as bare triplets (--primary: 222.2 47.4%
    // 11.2%) but normalised to hsl(...); try the unwrapped form too.
    const n = system.tokenNames?.[value]
      ?? system.tokenNames?.[value.replace(/^hsla?\((.*)\)$/i, '$1')];
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
  // Components the repo already defines, by name: the whole ledger. What
  // counts as a second copy is the engine's call (duplicateCopies), so the
  // guard and the report give one answer. A page, a framework's Route, a
  // story, a wrapper and two icon libraries colliding are not second copies.
  const componentsByName = new Map();
  if (definedComponents && Array.isArray(system.components)) {
    for (const c of system.components) {
      const list = componentsByName.get(c.name) ?? [];
      list.push(c);
      componentsByName.set(c.name, list);
    }
  }

  // A product built on a kit (MUI, Mantine, Chakra UI, Ant Design), roast
  // 8.4.6: a colour or a pixel size written onto a kit component where the
  // theme has a value. The engine judges the whole file (the import that makes
  // it a kit file sits at the top, where the diff never looks) and the guard
  // keeps the hits on added lines. On a kit file the kit rule owns colours
  // and the pixel sizes it named, so the generic rules stay quiet about the
  // same value: one line, one finding, the same words as the roast report's
  // live checks.
  const kit = prof.kit ?? null;
  const kitJudged = new Map();
  const kitLines = (file) => {
    if (!kit) return null;
    if (!kitJudged.has(file)) {
      const w = wholeText(file);
      const j = w == null ? null : kitPaintFindings(w, kit, { file, email: system.email ?? null });
      if (!j || j.exempt) kitJudged.set(file, null);
      else {
        const byLine = new Map();
        for (const f of j.findings) {
          const ln = w.slice(0, f.index).split('\n').length;
          if (!byLine.has(ln)) byLine.set(ln, []);
          byLine.get(ln).push(f);
        }
        kitJudged.set(file, byLine);
      }
    }
    return kitJudged.get(file);
  };

  const findings = [];

  // A chart's series colours are judged against the chart palette, or its
  // absence, by the engine (roast 8.8.0, lib/charts): the report never
  // counted them, the live checks counted every one, and the guard did too.
  // On a chart file the chart rule owns colours, the same way it does in
  // roast_validate: the kit judge and the generic colour rule stay out.
  const chartColours = new Map(); // file → [{ value, index: line }]
  const isChart = (file) => {
    if (!system.charts) return false;
    const w = wholeText(file);
    return isChartFile(file, w ?? '');
  };

  // A hand-rolled second <Button> is the most expensive thing a pull request
  // can add, and it was the one thing the guard could not see. The scan
  // includes this change, so the new copy is in the ledger too: what counts
  // is whether the name lives anywhere ELSE, and the engine answers that the
  // way the report does (duplicateCopies).
  const definedByFile = new Map();
  const definedIn = (file) => {
    if (!definedByFile.has(file)) definedByFile.set(file, new Set(componentNamesIn(wholeText(file) ?? '', file)));
    return definedByFile.get(file);
  };
  const secondCopies = (file, line, text) => {
    const out = [];
    if (!componentsByName.size) return out;
    // what the whole file defines for the report, kept to what this line declares
    const onLine = new Set(definedComponents(text));
    const names = wholeText(file) === null
      ? [...onLine]
      : [...definedIn(file)].filter((n) => onLine.has(n) || new RegExp(`\\bclass\\s+${n}\\b`).test(text));
    for (const name of names) {
      const variantOf = (f) => variants.find((v) => underAny(f, [v])) ?? null;
      const counted = system.duplicates?.get?.(name)?.copies.map((c) => c.file) ?? null;
      const elsewhere = duplicateCopies({ name, file, isPage: isPageFile(file) }, componentsByName.get(name), counted, samePath)
        // a registry keeps the same component in sibling variants, and a
        // block installs alone: neither is a second Button
        .filter((c) => !(variantOf(file) && variantOf(c.file) && variantOf(c.file) !== variantOf(file)))
        .filter((c) => !(underAny(file, blockDirs) && underAny(c.file, blockDirs)));
      if (!elsewhere.length) continue;
      const best = [...elsewhere].sort((a, b) => b.usageCount - a.usageCount)[0];
      out.push({
        file, line, kind: 'component', value: name,
        // never open the advice with the path: the report capitalises the
        // first letter, and a capitalised path is the wrong path
        advice: elsewhere.length > 1
          ? `${elsewhere.length} other files define it too; import ${best.file}, the one the codebase leans on`
          : `import ${best.file} rather than starting a second one${best.usageCount ? `, which ${best.usageCount} place${best.usageCount === 1 ? '' : 's'} already do` : ''}`,
      });
    }
    return out;
  };

  for (const { file, line, text } of added) {
    if (outOfScope(file)) continue;
    const css = isStyleFile(file);
    if (!css && !isCodeFile(file)) continue;
    // The exemptions are about styling: what an email, a drawing or a crash
    // page cannot take from the system. A second copy of a component is a
    // second copy in any medium, and the report counts it.
    if (exempt(file)) { if (!css) findings.push(...secondCopies(file, line, text)); continue; }

    const seen = extractStyling(text, { css });

    const chart = !css && isChart(file);
    if (chart) {
      const list = chartColours.get(file) ?? [];
      for (const c of seen.colors) if (!tokenSet.has(c.value)) list.push({ value: c.value, index: line });
      chartColours.set(file, list);
    }

    const onKit = css || chart ? null : kitLines(file);
    const kitPx = new Set();
    for (const f of onKit?.get(line) ?? []) {
      if (f.rule === 'kit-px') kitPx.add(f.value.split(': ')[1]);
      findings.push({
        file, line, kind: f.rule, value: f.value, label: f.label,
        advice: f.note ? `${f.note}. ${f.fix.replace(/\.$/, '')}` : f.fix.replace(/\.$/, ''),
      });
    }

    for (const c of seen.colors) {
      if (onKit || chart) break; // the kit rule or the chart rule owns colours here
      if (tokenSet.has(c.value)) {
        // A token's raw value is the definition only inside a file that
        // states the palette (system.tokenSources, roast 9.1.3). Anywhere
        // else it is the value pasted where the name belongs: the system
        // cannot see it, and the next reader copies the hex.
        if (!system.tokenSources || statesTokens(file)) continue;
        const n = named(c.value);
        findings.push({
          file, line, kind: 'color', value: c.value,
          advice: n !== c.value
            ? `this is already the token ${n}; use the name, not the value`
            : `the theme already holds this value${themeFile ? ` (${themeFile})` : ''}; read it from there rather than pasting it`,
        });
        continue;
      }
      const near = c.value.startsWith('#') ? nearestColor(c.value, system.tokens) : null;
      findings.push({
        file, line, kind: 'color', value: c.value,
        advice: near && near.distance <= 48
          ? `nearest token: ${named(near.value)}`
          : system.tokenFile
            ? `no token resembles it, and if it is a real decision it belongs in ${system.tokenFile}`
            : 'no token layer found to compare against',
      });
    }

    for (const s of seen.spacing) {
      if (kitPx.has(s.value)) continue; // the kit rule said it
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

    // Styling inside style={{ }} is invisible to the system and to every
    // agent that reads the file, so it can never be on-system by definition.
    // Only static blocks count; extractStyling already ignores the ones built
    // from variables, where the values are decided elsewhere.
    for (const _ of seen.inlineBlocks) {
      findings.push({
        file, line, kind: 'inline', value: 'style={{ }}',
        advice: 'the values are invisible to the system and to every agent that reads the file; move them to classes or tokens',
      });
    }

    if (!css) findings.push(...secondCopies(file, line, text));

    for (const a of seen.arbitrary) {
      findings.push({
        file, line, kind: 'arbitrary', value: a.value,
        advice: 'an arbitrary Tailwind value sidesteps the scale; use a scale step or add one',
      });
    }

    // !important is the medium, not the mess, in two places the report also
    // sets aside: a widget stylesheet that must beat its host page, and a
    // selector aimed only at a library's own class names.
    if (seen.important.length && !(css && isWidgetFile(file))) {
      const sel = css ? selectorAt(wholeText(file), line) : null;
      const classes = sel ? [...sel.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]) : [];
      const libraryAimed = classes.length > 0 && classes.every(isLibraryClass);
      if (!libraryAimed) {
        for (const _ of seen.important) {
          findings.push({
            file, line, kind: 'important', value: '!important',
            advice: 'the cascade admitting defeat; raise specificity or fix the source order',
          });
        }
      }
    }

    // A palette class where the theme names its colours: judged on the
    // whole file below, with the twin and import checks, so a class named
    // in a comment opened on an earlier line still paints nothing. Without
    // the whole file the added line stands in.
    if (!css && palette && wholeText(file) == null) {
      for (const f of paletteFindings(text, palette, { file })) {
        findings.push({ file, line, kind: 'palette', value: f.value, advice: paletteAdvice(f) });
      }
    }

    // The engine's fontDeclarations decides what a judgeable font value is
    // (benign token references filtered inside it), so the counter and the
    // checker can never disagree about fonts either.
    if (css) {
      for (const d of fontDeclarations(text)) {
        const face = typefaceOf(d.raw);
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
  }

  // Two checks that read the whole file against its base, roast 8.6: a new
  // colour token that copies one the system already has, and a new import of
  // the duplicate the canonical copy replaces. The engine words both, the
  // same words roast_validate, roast_review and --check give; the guard keeps
  // the hits on added lines.
  const addedAt = new Map();
  for (const { file, line } of added) {
    if (!addedAt.has(file)) addedAt.set(file, new Set());
    addedAt.get(file).add(line);
  }
  const baseText = (file) => {
    if (!readBase) return undefined;
    try { return readBase(file); } catch { return undefined; }
  };
  const lineAt = (text, index) => text.slice(0, index).split('\n').length;
  for (const [file, lines] of addedAt) {
    if (exempt(file) || outOfScope(file)) continue;
    const css = isStyleFile(file);
    if (!css && !isCodeFile(file)) continue;
    const w = wholeText(file);
    if (w == null) continue;
    // the palette rule on the whole file, kept to the added lines; a story,
    // a demo and a kit door are left out by the engine, as in the report
    if (!css && palette) {
      for (const f of paletteFindings(w, palette, { file })) {
        const line = lineAt(w, f.index);
        if (lines.has(line)) findings.push({ file, line, kind: 'palette', value: f.value, advice: paletteAdvice(f) });
      }
    }
    const hits = css
      ? (system.tokenDefs && w.includes('--') ? tokenTwinFindings(w, {
          before: baseText(file),
          others: system.tokenDefs.filter((d) => !samePath(d.file, file)),
          tailwind: prof.kind === 'tailwind' || /@theme\b/.test(w),
        }) : [])
      : [
        ...(system.duplicates ? avoidedImportFindings(w, { file, before: baseText(file), dupes: system.duplicates }) : []),
        // a button built from scratch where the file's own package can
        // import the repo's Button (roast 9.2.0); a warning in the engine,
        // a finding here, on the line the button starts
        ...(system.buttons?.length ? handmadeButtonFindings(w, { file }, system) : []),
      ];
    for (const f of hits) {
      const line = lineAt(w, f.index);
      if (!lines.has(line)) continue;
      findings.push({
        file, line, kind: f.rule, value: f.name,
        advice: `${f.message} ${f.fix.replace(/\.$/, '')}`,
      });
    }
  }

  // The chart rule, once per chart file, in the engine's words: with a
  // palette every hand-written colour is a finding that names it; without
  // one the file gets a single line that names the precedent chart and asks
  // for the palette once (roast 8.8.0). `index` carries the diff line.
  for (const [file, colours] of chartColours) {
    if (!colours.length) continue;
    for (const f of chartFindings({ file, colours, charts: system.charts, tokenFile: system.tokenFile ?? null })) {
      findings.push({
        file, line: f.index, kind: f.rule,
        value: f.rule === 'chart-colour' ? f.message.match(/Chart colour (\S+)/)?.[1] ?? 'colour' : `${colours.length} series colour${colours.length === 1 ? '' : 's'} by hand`,
        advice: `${f.message} ${f.fix.replace(/\.$/, '')}`,
      });
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
