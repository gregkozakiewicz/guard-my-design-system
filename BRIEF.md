# guard-my-design-system — the brief

*Agreed with Greg before any code exists. This page is the contract for v1.*

**Tagline:** No new mess.

## The pitch, in one breath

Design systems don't die in a redesign. They die one pull request at a time:
a colour that's nearly the token, a spacing value that's off the scale, an
`!important` that seemed harmless on a Friday. guard-my-design-system is the
smoke alarm at the door. It checks only the lines a pull request adds, says
nothing about the past, and quietly points each new sin at the on-system value
the author probably meant.

## Why it exists

- AI agents now write a large share of UI code, and they drift off-system
  faster than review can catch. Rules files ask nicely; the guard checks.
- Nobody can win the argument "please clean up the codebase". Everyone can win
  "let's at least stop digging". The guard makes not-digging automatic.
- It is a devDependency that runs on every pull request, so adoption compounds:
  one team installing it is thousands of installs a year.

## What v1 does

1. Installs in five minutes: `npm install --save-dev guard-my-design-system`
   plus a copy-paste GitHub Action.
2. On every pull request, examines **only the added lines**. The existing
   codebase is never counted, never mentioned, never judged.
3. Flags the sins the roast scanner already knows how to see:
   - a hard-coded colour where a token exists (with the nearest token named)
   - a spacing value off the project's scale (with the nearest step named)
   - a font family not in the system
   - `!important`
   - arbitrary Tailwind values (`w-[137px]`, `mt-[37px]`)
4. Leaves one PR comment, calm in tone: every finding names the on-system
   value the author probably meant. Findings are blunt, advice starts from
   intent.
5. Strict mode is opt-in config: the check fails instead of commenting.
6. The comment's last line funnels to the inspector:
   *Full picture of the whole codebase: `npx roast-my-design-system`*

## What v1 deliberately does not do

- No score, no benchmark, no report. That is roast's job.
- No judgement of taste. A token used in the wrong place sails through.
- No opinion on the existing mess. Old sins are invisible to it, on purpose;
  nobody rips out a smoke alarm because it judged their old wiring.
- No config beyond strict mode and ignore paths. Configurability is where
  guards go to die.

## The relationship between the tools

roast diagnoses it. guard protects it. Each points at the other and neither
needs the other to be useful.

## Status

- npm name: free as of 29 Aug 2026, reserved with a placeholder publish.
- Engine: reuses the roast scanner's detectors; the guard is a thin wrapper.
- Releases: same discipline as roast, published by GitHub on a version tag,
  never by hand from a laptop.
