# guard-my-design-system

[![npm](https://img.shields.io/npm/v/guard-my-design-system?color=2dd4bf&label=npm)](https://www.npmjs.com/package/guard-my-design-system) [![downloads](https://img.shields.io/npm/dm/guard-my-design-system?color=2dd4bf&label=downloads)](https://www.npmjs.com/package/guard-my-design-system) [![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE) [![no telemetry](https://img.shields.io/badge/no-telemetry-2dd4bf)](https://github.com/gregkozakiewicz/guard-my-design-system#what-makes-the-verdict-trustworthy) [![GitHub Action](https://img.shields.io/badge/GitHub_Action-v1-2dd4bf)](#on-a-pull-request)

## Your design system dies one pull request at a time. This makes sure it doesn't.

A pull request guard that checks **only the lines a change adds**, says nothing
about the past, and points each new sin at the on-system value the author
probably meant. Old wiring is not its business; new sparks are.

It speaks in nearests, not scoldings:

> `Card.tsx:24` — new colour `#4a7be8`. Nearest token: `#3b6fe0`.
>
> `site.css:31` — new spacing value `13px`. Nearest existing value: `12px`.
>
> `site.css:33` — new typeface `Comic Sans MS`. First typeface declared in this codebase.
>
> `site.css:35` — `!important`. The cascade admitting defeat; raise specificity or fix the source order.

It learns your system by scanning your repo with the
[roast-my-design-system](https://github.com/gregkozakiewicz/roast-my-design-system)
engine, then judges the diff against what it learned. No config files, no rules
to write, no tokens to register. Your codebase is the rulebook.

This is what a pull request sees, on real code, with the guard's own comment:

![The guard's comment on a pull request: six new issues, each with a file path and line, the stray colours shown with swatches next to their nearest token, an off-scale spacing value next to its nearest step, a new typeface, an !important, and an arbitrary Tailwind value, ending with the note that only added lines are checked](https://raw.githubusercontent.com/gregkozakiewicz/guard-my-design-system/main/docs/pr-comment.png?v=1.0.2)

One comment per pull request, updated in place as the author fixes things. Push
a fix and the same comment counts down instead of piling up:

![The same pull request after fixes were pushed: the guard's single comment has updated in place, now showing three remaining issues, with the fix commits visible in the timeline above it and all checks passing below](https://raw.githubusercontent.com/gregkozakiewicz/guard-my-design-system/main/docs/pr-comment-updated.png?v=1.0.2)

## What it catches

- **A hard-coded colour where a token exists**, with the nearest token named.
- **A spacing value the codebase has never used**, with the nearest step named.
- **A typeface the system does not declare.**
- **`!important`**, the cascade admitting defeat.
- **Arbitrary Tailwind values** (`w-[137px]`, `mt-[37px]`) that sidestep the scale.

And what it deliberately ignores: everything that was already there. Even if
the codebase carries years of mess, the guard asks one question of a change:
does it make things worse?

## Why this exists

Nobody can win the argument "please go and clean up the codebase". Everyone can
win "let us at least stop digging". The guard makes not-digging automatic, and
it matters more now than ever: AI agents write a growing share of UI code, and
they drift off-system faster than review can catch. Rules files ask nicely; the
guard checks.

## On a pull request

Five minutes, once:

```yaml
# .github/workflows/guard.yml
name: guard
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: gregkozakiewicz/guard-my-design-system@v1
```

After that you forget it exists, which is the whole point of a smoke alarm.

Prefer a failed check over a comment? Strict mode is the one setting:

```yaml
      - uses: gregkozakiewicz/guard-my-design-system@v1
        with:
          strict: true
```

`exclude` keeps folders out of the system scan, same syntax as the CLI below.

## On your machine

Judge your uncommitted work before anyone else sees it:

```bash
npx guard-my-design-system@latest
```

| Command&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | What you get |
|---|---|
| <code>npx&nbsp;guard-my-design-system@latest</code> | Your working tree's added lines judged against main, in the terminal |
| <code>npx&nbsp;guard-my-design-system@latest&nbsp;&lt;path&gt;</code> | Judge a different repo than the current directory |
| <code>...&nbsp;--base&nbsp;&lt;ref&gt;</code> | Diff against something other than main |
| `... --strict` | Exit 1 on findings, so it slots into scripts and hooks |
| `... --markdown` | The verdict as markdown, the same text the PR comment carries |
| `... --json` | Findings as JSON on stdout, for scripts and pipelines |
| <code>...&nbsp;--exclude&nbsp;lab/</code> | Leave folders out of the system scan (comma-separate for more). A `.roastignore` file at the repo root works too |

Requires Node 18+ and git.

## What makes the verdict trustworthy

- **Only added lines are checked.** The existing codebase is never judged,
  never counted, never mentioned. Nobody rips out a smoke alarm because it
  criticised their old wiring.
- **Deterministic, not AI sampling.** The same engine that powers
  roast-my-design-system reads the diff and returns the same verdict every
  run. No model, no sampling, no drift.
- **Read-only, no network, no telemetry.** The scan and the diff both happen
  locally in your CI runner or terminal. Nothing about your code leaves the
  machine it runs on.
- **Honest exemptions, inherited from roast.** Email and print styling must be
  inline, so it is never flagged. Artwork files carry hex that is drawing, not
  styling. Defining a new token is extending the system, not a sin.
- **Findings are blunt, advice starts from intent.** Every flag names the
  on-system value the author probably meant, so the fix takes thirty seconds
  and no meeting.

## Honest limits

Things the guard deliberately does not do, said here so they never surprise you
in a pull request:

- **Monorepos are judged as one world.** The system is learned from the whole
  repo, so a colour that is legitimate in `packages/ui` counts as known when it
  appears in `apps/web`. Per-package judgement is roast's territory today.
- **Spacing is compared within one unit.** A repo on a rem scale that receives
  `13px` gets the flag, but "nearest existing value" never converts units:
  claiming `0.75rem` is nearest to `13px` would be a judgement faked, not made.
- **Taste is not judged, and tokens are a passport.** The right token in the
  wrong place sails through, and defining a new token is never a sin. The
  guard polices drift, not decisions: extending the system is legitimate work.
- **On a fork's pull request, the comment cannot be posted** (GitHub hands the
  workflow a read-only token). The guard still runs; the verdict lands in the
  workflow log instead, with a line saying why. The same happens if the
  workflow is missing `pull-requests: write`.
- **Not on GitHub?** The CLI works anywhere git works: GitLab and Bitbucket CI
  can run `npx guard-my-design-system --strict --base <target branch sha>` and
  get the failing check. Only the comment-posting Action is GitHub-specific.

## The family

[roast-my-design-system](https://github.com/gregkozakiewicz/roast-my-design-system)
diagnoses the whole codebase: a health score against a 34-repo benchmark, the
receipts behind it, and the agent rules that keep AI-written UI on-system.
guard keeps new work from adding to the pile.

Roast diagnoses it. Guard protects it.

**Your design system dies one pull request at a time. This makes sure it doesn't.**

<a href="https://github.com/gregkozakiewicz/guard-my-design-system"><img src="https://img.shields.io/badge/If%20it%20caught%20something%20before%20review%20did%2C%20a%20star%20helps%20other%20people%20find%20it-a855f7?style=for-the-badge&logo=github&logoColor=white" alt="If it caught something before review did, a star helps other people find it"></a>

## License

MIT. The code is yours to fork, modify and redistribute; the copyright notice
travels with it.

If you build a report, summary or audit of your own from this tool's findings,
keep one line in it: *Built with
[guard-my-design-system](https://github.com/gregkozakiewicz/guard-my-design-system)
by Greg Kozakiewicz*.

**guard-my-design-system**™ and the GK mark are trademarks of Greg Kozakiewicz.
Forking is welcome, republishing under this name is not: see
[brand and attribution](https://gregkozakiewicz.github.io/guard-my-design-system/brand.html).

Built and designed by <a href="https://gregkozakiewicz.com"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gregkozakiewicz/roast-my-design-system/main/assets/gk-mark-dark.png?v=3.10.1"><img src="https://raw.githubusercontent.com/gregkozakiewicz/roast-my-design-system/main/assets/gk-mark.png?v=3.10.1" height="15" alt="GK mark"></picture> Greg Kozakiewicz</a>.
