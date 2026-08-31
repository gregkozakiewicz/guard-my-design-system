# Changelog

The promise behind every number: a patch release never changes what gets
flagged. If a version flags something new, it is a minor or major bump and
this file says what, in one plain line.

## 1.3.0 — 31 Aug 2026

The release for the legitimate exception, and for teams not on GitHub.

- **The escape hatch.** A `guard-ignore-next-line` comment silences every
  finding on the line below it — one line, visibly, with the reason sitting in
  code review. Checked against the file as it stands, so an exception granted
  last month still protects its line today. No config file, no rule IDs.
- **GitLab and Bitbucket recipes.** The README's new "Not on GitHub?" section
  carries copy-paste pipeline snippets for both; `--strict` fails the step and
  the verdict prints in the log.
- The repo grows CONTRIBUTING.md and issue templates — including a dedicated
  **false positive** template, because a wrong flag on legitimate code is the
  most serious bug class this tool has.

Nothing new is flagged; the escape hatch can only flag less. Suite grows to
28 checks.

## 1.2.0 — 31 Aug 2026

The advice names names, and three new kinds are judged. Minor bump: things
are flagged that 1.1 let through.

- **Advice speaks in variables.** Where the system defines a value as a custom
  property, findings now say so: "nearest token: `var(--blue-500)`, #3b6fe0"
  instead of leaving the reader to hunt the hex. Works for colours and for
  spacing steps alike.
- **Now flagged, wasn't before:** border radii, font sizes and shadows that
  the system does not declare, in style files, each with the nearest existing
  value named. Same self-vouching discount and disciplined-value handling
  (`var(…)`, `inherit`, `none`, known values) as everything else.
- Needs roast-my-design-system 5.5.3, which widened the engine doorway to
  carry the radii, font sizes, shadows and token names the harvest already
  computed.

Suite grows to 25 checks.

## 1.1.1 — 29 Aug 2026

Transparency release. Nothing new is flagged; two things can only flag less.

- `--exclude` and `.roastignore` now scope the judging as well as the
  learning: a folder you excluded is invisible to the whole tool, not judged
  against a system that deliberately ignores it.
- On a fork's pull request (read-only token) or a workflow missing
  `pull-requests: write`, the comment step no longer fails red: the verdict
  prints into the log with one line saying why it could not be posted.
- The README gains **Honest limits**: monorepos judged as one world, same-unit
  spacing comparison, taste not judged and tokens as a passport, the fork
  case, and the GitLab/Bitbucket recipe.

Suite grows to 21 checks.

## 1.1.0 — 29 Aug 2026

Field-tested against three public repos (vercel/ai-chatbot, excalidraw,
shadcn-ui) plus the no-GitHub cases: master-only repos, repos with no remote,
and the detached-HEAD state GitLab and Bitbucket CI run in. Two catches:

- **Now flagged, wasn't before:** styling in components whose filename sounds
  like artwork (Badge, Icon, Logo…). These were exempt wholesale, inherited
  from the scanner's SVG-artwork rule, which left every Badge component
  unguarded. The exemption now has to earn itself: such a file is only exempt
  when its added lines actually draw SVG. This is the minor bump.
- Fixed: a hex inside a Tailwind class was also counted by the raw sweep, so
  one sin on one line could appear twice. One sin, one finding.

Suite grows from 16 to 19 checks.

## 1.0.3 — 29 Aug 2026

Greg typed `--version` in his home folder and got four raw git fatals for his
trouble. Two fixes from one screenshot: `--version` (and `-v`) now answers
with the version, and running outside a git repository gets one calm sentence
instead of git's own noise. The README's command table also holds its column
width. Same rules, same flags, nothing new is judged.

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
