/**
 * Diff reading — the guard's field of vision. It sees ONLY the lines a change
 * adds; the rest of the codebase is deliberately invisible. Old mess is not
 * its business; new sparks are.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The ref new work is measured against: merge-base with the main branch. */
export function defaultBase(cwd) {
  for (const ref of ['origin/main', 'origin/master', 'main', 'master']) {
    try {
      return execFileSync('git', ['merge-base', 'HEAD', ref], { cwd, encoding: 'utf8' }).trim();
    } catch { /* try the next spelling */ }
  }
  return null;
}

/**
 * Added lines between base and the working tree (committed or not), as
 * [{ file, line, text }]. Unified diff with zero context so every '+' line
 * is genuinely new.
 */
export function addedLines(cwd, base) {
  const out = execFileSync('git', ['diff', '-U0', '--no-color', base, '--'], {
    cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  const added = [];
  let file = null, line = 0;
  for (const raw of out.split('\n')) {
    if (raw.startsWith('+++ ')) {
      file = raw.slice(4).replace(/^b\//, '');
      if (file === '/dev/null') file = null;
      continue;
    }
    if (raw.startsWith('@@')) {
      const m = /\+(\d+)/.exec(raw);
      line = m ? parseInt(m[1], 10) : 0;
      continue;
    }
    if (!file) continue;
    if (raw.startsWith('+')) { added.push({ file, line, text: raw.slice(1) }); line++; }
    // '-' lines belong to the old world; context lines don't appear at -U0
  }
  // A brand-new file not yet staged never appears in git diff; every one of
  // its lines is added work all the same.
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
    cwd, encoding: 'utf8',
  }).split('\n').filter(Boolean);
  for (const f of untracked) {
    let text;
    try { text = readFileSync(join(cwd, f), 'utf8'); } catch { continue; }
    text.split('\n').forEach((t, i) => { if (t.trim()) added.push({ file: f, line: i + 1, text: t }); });
  }
  return added;
}
