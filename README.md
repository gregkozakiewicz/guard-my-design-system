# guard-my-design-system

**No new mess.**

Design systems don't die in a redesign. They die one pull request at a time:
a colour that's nearly the token, a spacing value that's off the scale, an
`!important` that seemed harmless on a Friday.

This is the smoke alarm at the door. It checks **only the lines a pull request
adds**, says nothing about the past, and points each new sin at the on-system
value the author probably meant. Old wiring is not its business; new sparks
are.

It learns your system by scanning your repo with the
[roast-my-design-system](https://github.com/gregkozakiewicz/roast-my-design-system)
engine, then judges the diff against what it learned. No config files, no
rules to write, no tokens to register. Your codebase is the rulebook.

## What it catches

- a hard-coded colour where a token exists, with the nearest token named
- a spacing value the codebase has never used, with the nearest step named
- a typeface the system doesn't declare
- `!important`
- arbitrary Tailwind values (`w-[137px]`, `mt-[37px]`)

And what it deliberately ignores: everything that was already there. Even if
the codebase carries years of mess, the guard only asks one question of a
change: does it make things worse?

## On a pull request

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

Every pull request gets one comment, updated in place, like:

> **🛡 guard-my-design-system: 2 new issues in this pull request**
>
> - `Card.tsx:24` — new colour `#4a7be8`. Nearest token: `#3b6fe0`.
> - `Card.tsx:31` — new spacing value `13px`. Nearest existing value: `12px`.

Prefer a failed check over a comment? Strict mode is the one setting:

```yaml
      - uses: gregkozakiewicz/guard-my-design-system@v1
        with:
          strict: true
```

## On your machine

Judge your uncommitted work before anyone else sees it:

```bash
npx guard-my-design-system
```

Flags: `--base <ref>` to diff against something other than main,
`--strict` to exit 1 on findings, `--json` for machines,
`--exclude <paths>` to leave folders out of the system scan.

## The family

[roast-my-design-system](https://github.com/gregkozakiewicz/roast-my-design-system)
diagnoses the whole codebase and scores it against a 34-repo benchmark.
guard keeps new work from adding to the pile. Roast diagnoses it, guard
protects it.

## Licence

MIT © [Greg Kozakiewicz](https://gregkozakiewicz.com)
