# guard-my-design-system

[![npm](https://img.shields.io/npm/v/guard-my-design-system?color=2dd4bf&label=npm)](https://www.npmjs.com/package/guard-my-design-system) [![downloads](https://img.shields.io/npm/dm/guard-my-design-system?color=2dd4bf&label=downloads)](https://www.npmjs.com/package/guard-my-design-system) [![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE) [![no telemetry](https://img.shields.io/badge/no-telemetry-2dd4bf)](https://github.com/gregkozakiewicz/guard-my-design-system#what-makes-the-verdict-trustworthy) [![GitHub Action](https://img.shields.io/badge/GitHub_Action-v2-2dd4bf)](#on-a-pull-request)

## Your design system dies one pull request at a time. This makes sure it doesn't.

The guard checks pull requests for design-system drift. It looks only at the
lines a change adds. It never judges the code that was already there. For each
problem it finds, it names the closest value your system already has:

> `Card.tsx:24` · new colour `#4a7be8`. Nearest token: `var(--blue-500)`, `#3b6fe0`.
>
> `site.css:31` · new spacing value `13px`. Nearest existing value: `12px`.
>
> `site.css:32` · new border radius `5px`. Nearest existing value: `6px`.
>
> `site.css:33` · new typeface `Comic Sans MS`. First typeface declared in this codebase.
>
> `site.css:35` · `!important`. The cascade admitting defeat; raise specificity or fix the source order.
>
> `Panel.tsx:12` · inline style block. The values are invisible to the system and to every agent that reads the file; move them to classes or tokens.
>
> `ButtonV2.tsx:1` · second definition of `Button`. Import components/Button.tsx rather than starting a second one.

It learns your design system by scanning your repository with the
[roast-my-design-system](https://github.com/gregkozakiewicz/roast-my-design-system)
engine. It reads CSS, SCSS, styled components, Lit `` css`…` `` templates and
Stencil styling. You do not write any config, rules or token lists. Your
codebase is the rulebook.

This is the guard's comment on a real pull request:

![The guard's comment on a pull request: six new issues, each with a file path and line, the stray colours shown with swatches next to their nearest token, an off-scale spacing value next to its nearest step, a new typeface, an !important, and an arbitrary Tailwind value, ending with the note that only added lines are checked](https://raw.githubusercontent.com/gregkozakiewicz/guard-my-design-system/main/docs/pr-comment.png?v=1.0.2)

The guard posts one comment per pull request. When the author pushes fixes,
it updates that same comment. It never adds more comments:

![The same pull request after fixes were pushed: the guard's single comment has updated in place, now showing three remaining issues, with the fix commits visible in the timeline above it and all checks passing below](https://raw.githubusercontent.com/gregkozakiewicz/guard-my-design-system/main/docs/pr-comment-updated.png?v=1.0.2)

## What it catches

- **A hard-coded colour where a token exists.** The finding names the token:
  `var(--blue-500)`, not just a hex code. A token's own value pasted into a
  component or a stylesheet counts too: the finding says use the name, not
  the value. This works across colour notations:
  a hex stray is matched to an hsl or oklch token, including shadcn's
  bare-triplet variables. Dark-theme values count as the system too, so a
  stray in a dark block snaps to the dark token, never its light twin.
- **A spacing value your codebase has never used**, with the nearest existing
  step named.
- **A border radius, font size or shadow your system does not declare**, with
  the nearest existing value named.
- **A typeface your system does not declare.**
- **`!important`.**
- **Arbitrary Tailwind values** such as `w-[137px]` and `text-[10px]`. A bracket on a spacing utility, such as `mt-[37px]`, is reported as off-scale spacing instead, with the nearest scale step named.
- **An inline `style={{ }}` block.** Styling written there is invisible to the
  system and to every agent that reads the file. Blocks built from variables
  are decided elsewhere, so they are left alone.
- **A button built from scratch where the repo already has a Button.** A
  styled button, or a button tag dressed as one, in a file whose package
  can import a Button that at least 20 files already use. The finding
  gives the import line. Rows, tabs, close crosses and select triggers
  built on a button tag are left alone.
- **A second definition of a component you already have.** The finding names
  the file that already defines it, and how many places use that one. Web
  components registered by tag count too. What a copy is, is the roast
  report's answer: a framework's `Route` or `Layout`, a page, a story, an
  email template and a wrapper built on the component it shares a name with
  are not second copies.
- **A new import of a duplicate component.** When a name is defined in more
  than one file and one copy is clearly the main one, importing another copy
  is flagged. The finding names the main copy, how often each is used, and
  the colours the other copy hard-codes. If two copies are used about
  equally, nothing is flagged.
- **A new colour token that copies an existing one.** A token added to a
  stylesheet whose value is almost the same as a token the system already
  has, or whose dark value is exactly the same, is flagged with the existing
  token named: `--color-overdue-soft (#fff4e5) is a twin of the existing
  --color-warning-soft (#fdf5e6)`. Numbered steps such as `gray-100` and
  shadcn's own theme variables are never compared.
- **A palette colour where the theme names its colours.** On a repo with a
  Tailwind theme of its own, `text-gray-500` is flagged with the theme's
  nearest colour as the class to use (`text-ink-quiet`) and the theme file to
  add one to when none fits. On a shadcn repo, `text-slate-500` in the app's
  own code is flagged the same way, with a shadcn class named, whether the
  theme sits under `:root`, inside a `@theme` block or in a sibling package.
  A shadcn repo that keeps a theme of its own and none of shadcn's rows is
  judged against that theme. Off on utility-class installs, where the
  palette is the theme. The same rule, in the same words, as the roast
  report's live checks.
- **A chart colour written by hand.** A chart needs several colours that
  differ from each other, and most design systems never name them, so the
  chart rule (roast 8.8) has three answers. Where the repo keeps a chart
  palette (`--chart-*` or `--series-*` tokens, a `chartColors` entry in the
  theme, or shadcn's `--chart-1` to `--chart-5` when a chart actually reads
  them), a hex in a chart file is flagged and the palette named. Where the
  repo has charts but no palette, a new chart painting by hand gets one line
  that names the existing chart doing the same and asks for the palette
  once. The first chart in a repo gets one line asking for a name. The
  generic colour rule stays out of chart files, the same way it does in
  `roast_validate`.
- **A colour or a pixel size written onto a kit component.** On a product
  built on MUI, Mantine, Chakra UI or Ant Design, `color: '#667085'` in an
  `sx` prop or a style object is flagged and the finding says whether the
  theme already holds that colour, or tells you to add it there once. A
  pixel size such as `p: '12px'` is turned into the theme's spacing step. The
  advice is in the kit's own words: `sx` paths on MUI, props on Mantine,
  style props on Chakra, the theme config on Ant Design.

It reads the repo the way the roast report does. On a kit repo the theme's
colours are the token set, and a colour the theme already holds is flagged
on a kit component all the same: writing it by hand is the exact mistake the
check exists for. On a shadcn repo the
installed catalogue, installed registries and kit blocks are not judged:
`shadcn add` is not a sin. On a repo that publishes a shadcn registry only
the published folders are judged. `!important` in an embedded widget's
stylesheet, or on a selector made of a library's own class names, is the
medium and passes.

It ignores everything that was already in the codebase. It asks one question
of a change: does it make things worse?

## When the guard is wrong

Sometimes an off-system value is correct. A partner's brand colour, for
example. Write a comment on the line above, and the guard lets that one line
pass:

```css
/* guard-ignore-next-line — partner brand colour, agreed with design */
background: #e4002b;
```

This works in any file the guard reads: `//` in components, `/* */` in styles.
The comment is visible in code review. It silences exactly one line. It keeps
working on later pull requests that touch the same line. There is no config
file and there are no rule IDs.

## Why this exists

You cannot ask a team to clean up years of styling. You can stop new problems
getting in. The guard does that automatically, on every pull request.

It matters more now than ever. AI tools write a growing share of UI code, and
they drift off-system faster than review can catch. Rules files ask nicely;
the guard checks.

## On a pull request

Set it up once. It takes about five minutes:

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
      - uses: gregkozakiewicz/guard-my-design-system@v2
```

After that it runs on every pull request and needs no attention from you.

If you want the check to fail instead of commenting, turn on strict mode.
It is the only setting:

```yaml
      - uses: gregkozakiewicz/guard-my-design-system@v2
        with:
          strict: true
```

`exclude` keeps folders out of the system scan. It uses the same syntax as
the CLI below.

If your team pins actions for security, use an exact commit instead of a
version tag: `uses: gregkozakiewicz/guard-my-design-system@<commit-sha>`.

## On your machine

Check your own work before you open a pull request:

```bash
npx guard-my-design-system@latest
```

| Command&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | What you get |
|---|---|
| <code>npx&nbsp;guard-my-design-system@latest</code> | The lines you have added, judged against main, in the terminal |
| <code>npx&nbsp;guard-my-design-system@latest&nbsp;&lt;path&gt;</code> | Judge a different repository |
| <code>...&nbsp;--base&nbsp;&lt;ref&gt;</code> | Compare against a branch other than main |
| `... --strict` | Exit with code 1 when there are findings, for scripts and hooks |
| `... --markdown` | The verdict as markdown, the same text the PR comment carries |
| `... --json` | Findings as JSON, for scripts and pipelines |
| <code>...&nbsp;--exclude&nbsp;lab/</code> | Keep folders out of the system scan (separate more with commas). A `.roastignore` file at the repository root works too |
| `... --version` | The version number |

You need Node 18 or later, and git.

## Not on GitHub?

The CLI works anywhere git works. Only the comment-posting Action needs
GitHub. On GitLab, add this to `.gitlab-ci.yml`:

```yaml
guard:
  image: node:22
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  script:
    - git fetch origin $CI_MERGE_REQUEST_TARGET_BRANCH_NAME
    - npx guard-my-design-system@latest --strict --base origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME
```

On Bitbucket, add this to `bitbucket-pipelines.yml`:

```yaml
pipelines:
  pull-requests:
    '**':
      - step:
          image: node:22
          script:
            - git fetch origin $BITBUCKET_PR_DESTINATION_BRANCH
            - npx guard-my-design-system@latest --strict --base origin/$BITBUCKET_PR_DESTINATION_BRANCH
```

The verdict prints in the pipeline log, and `--strict` fails the step. The
updating PR comment works on GitHub only, for now.

## What makes the verdict trustworthy

- **Only added lines are checked.** The existing codebase is never judged,
  never counted, never mentioned.
- **The results are deterministic.** The same engine that powers
  roast-my-design-system reads the diff and returns the same verdict every
  time. No AI model is involved.
- **Read-only. No network. No telemetry.** Everything runs on your machine or
  your CI runner. Nothing about your code leaves it.
- **Fair exemptions, shared with roast.** Some files cannot be on-system, so
  judging them would be crying wolf. Email and print styling has to be inline,
  because there is no cascade to inherit. A file counts as an email when it is
  one, by its email kit, its markup or the email folder it sits in, not when
  its name mentions email: a sign-in form is judged like any screen. An OG card or a PDF invoice is a
  picture drawn with code, and so is a page a headless browser prints to a PDF. A canvas renderer draws pixels. A file that draws
  SVG as an icon, a logo or an illustration is artwork, not interface, and an
  icon is never a second copy of the component it is named after. The guard reads that list from the roast
  engine rather than keeping its own, so the two can never drift apart and
  give you different answers about the same file. The exemptions are about
  styling: a second `Logo` is still a second `Logo`, and is flagged. Defining
  a new token is extending the system, not a problem.
- **Every finding comes with a fix.** The guard names the on-system value the
  author probably meant, so most fixes take under a minute and no meeting.

## Honest limits

Things the guard deliberately does not do, listed here so they never surprise
you in a pull request:

- **Monorepos are judged as one codebase.** The guard learns the system from
  the whole repository. A colour that is legitimate in `packages/ui` counts
  as known when it appears in `apps/web`. For per-package scores, use roast.
- **Spacing is compared within one unit.** If your scale uses rem and someone
  adds `13px`, the guard flags it. But it will not claim `0.75rem` is the
  nearest value to `13px`. Converting units would be a guess, and the guard
  does not guess.
- **Taste is not judged.** The right token in the wrong place passes.
  Defining a new token is never flagged. The guard checks drift, not
  decisions.
- **On a pull request from a fork, the comment cannot be posted.** GitHub
  gives the workflow a read-only token. The guard still runs, and the verdict
  appears in the workflow log with a line explaining why. The same happens if
  the workflow is missing `pull-requests: write`.
- **Not on GitHub?** Covered: GitLab and Bitbucket recipes are in
  [Not on GitHub?](#not-on-github) above.
- **Inside `` css`…` `` templates, the line-by-line check catches colours but
  not yet spacing, radii or shadows.** The whole-repository scan reads those
  templates in full, so the system is still learned correctly. The
  line-level gap will close with a future engine release.

## The family

[roast-my-design-system](https://github.com/gregkozakiewicz/roast-my-design-system)
examines your whole codebase: a health score against a 34-repo benchmark, the
evidence behind it, and the agent rules that keep AI-written UI on-system.
The guard stops new work adding to the pile.

Roast diagnoses it. Guard protects it.

**Your design system dies one pull request at a time. This makes sure it doesn't.**

<a href="https://github.com/gregkozakiewicz/guard-my-design-system"><img src="https://img.shields.io/badge/If%20it%20caught%20something%20before%20review%20did%2C%20a%20star%20helps%20other%20people%20find%20it-a855f7?style=for-the-badge&logo=github&logoColor=white" alt="If it caught something before review did, a star helps other people find it"></a>

## License

MIT. You may fork, modify and redistribute the code. The copyright notice
travels with it.

If you build a report, summary or audit of your own from this tool's findings,
keep one line in it: *Built with
[guard-my-design-system](https://github.com/gregkozakiewicz/guard-my-design-system)
by Greg Kozakiewicz*.

**guard-my-design-system**™ and the GK mark are trademarks of Greg Kozakiewicz.
Forking is welcome. Republishing under this name is not. See
[brand and attribution](https://gregkozakiewicz.github.io/guard-my-design-system/brand.html).

Built and designed by <a href="https://gregkozakiewicz.com"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gregkozakiewicz/roast-my-design-system/main/assets/gk-mark-dark.png?v=3.10.1"><img src="https://raw.githubusercontent.com/gregkozakiewicz/roast-my-design-system/main/assets/gk-mark.png?v=3.10.1" height="15" alt="GK mark"></picture> Greg Kozakiewicz</a>.
