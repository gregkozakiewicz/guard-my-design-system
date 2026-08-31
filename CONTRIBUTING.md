# Contributing

Thank you for looking under the hood. A few things worth knowing before you
open a pull request.

## The philosophy is the spec

The guard judges **only the lines a change adds**, stays **zero-config**, and
its findings are **deterministic** — no model, no sampling, no network, no
telemetry. Every finding names the on-system value the author probably meant.
A contribution that bends one of these is a different tool, however good;
it will be declined kindly.

## The one unforgivable sin is a false positive

A missed finding gets a second chance on the next pull request; a wrong flag
on legitimate code gets the tool uninstalled. When in doubt, the guard stays
silent. If your change makes it speak more often, the burden of proof is on
the change.

## Practicalities

- **Engine changes don't belong here.** Detection lives in the
  [roast-my-design-system](https://github.com/gregkozakiewicz/roast-my-design-system)
  engine, which the guard imports through `roast-my-design-system/engine`.
  This repo owns the diff reading, the judging policy, and the voice.
- **Tests are the gate:** `node tests/run.mjs` — deterministic, no network,
  builds throwaway git repos in your temp folder. Add a check for any
  behaviour you add or change.
- **A patch release never flags anything new.** If your change makes the guard
  flag something 1.x didn't, it ships as a minor bump and the changelog says
  plainly what is now flagged. That promise is in CHANGELOG.md and it is kept.
- Releases are cut from tags by GitHub; never `npm publish` from a machine.

## Not sure? Open an issue first

Especially for new rule kinds or judging-policy changes — describing the
false-positive risk you see gets you a faster, better answer than code.
