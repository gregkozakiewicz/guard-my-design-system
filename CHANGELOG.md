# Changelog

The promise behind every number: a patch release never changes what gets
flagged. If a version flags something new, it is a minor or major bump and
this file says what, in one plain line.

## 1.0.2 — 29 Aug 2026

The shop window. The README grows up to match roast's: the slogan on top,
two real screenshots of the guard commenting on a live pull request (and the
same comment counting down after fixes), the command table, the trust section,
and the family footer. The npm description now opens with the slogan and the
keywords fill out. Docs only: same rules, same flags, nothing new is judged.

## 1.0.1 — 29 Aug 2026

The first live pull request earned its keep. The Action's comment step never
received the repository token (composite actions do not inherit it), so the
verdict was printed into the logs instead of posted on the pull request. The
token is now handed over explicitly. Same rules, same flags, nothing new is
judged: a patch, as promised. The publish workflow also learned to ignore the
floating `v1` tag, which moves on every release and must never start a publish.

## 1.0.0 — 29 Aug 2026

The guard exists. Judges only the lines a change adds, against the design
system the repo already has, learned with the roast engine.

- Catches: stray colours (nearest token named), spacing values new to the
  codebase (nearest step named), undeclared typefaces, `!important`,
  arbitrary Tailwind values.
- One sticky PR comment via the GitHub Action; strict mode fails the check
  instead.
- Local mode: `npx guard-my-design-system` judges uncommitted work.
- Exempt, same as roast: email and print styling, artwork files.

## 0.0.1 — 29 Aug 2026

Name reservation. The one hand-published version this package will ever have.
