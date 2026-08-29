# Changelog

The promise behind every number: a patch release never changes what gets
flagged. If a version flags something new, it is a minor or major bump and
this file says what, in one plain line.

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
