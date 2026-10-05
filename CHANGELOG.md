# Changelog

## 2.9.6 — 5 Oct 2026

The engine moves to roast 10.1.5. A patch: the guard flags less, and
nothing new.

- **A `var()` fallback is not a new colour.** In
  `color: var(--TextColor, #333);` the `#333` only shows if the variable
  is missing. The line reads the theme, and the guard flagged the
  fallback as a new colour. It no longer does, in a stylesheet, an inline
  style or a class, and for fallbacks written as hex, `rgb()` or `hsl()`.
  A colour written beside a fallback is still flagged. Reported in roast
  issue #2.

## 2.9.5 — 3 Oct 2026

The engine moves to roast 10.1.4. A patch: the guard flags less, and
nothing new.

- **The guard judges only the files the roast report reads.** The report
  leaves out docs sites, examples, demos, stories and tests. The guard
  judged every file a change touched, so a pull request that only edited
  a docs site could be flagged for files the report never opens. On 22
  repos, 48% of the guard's findings sat in such files. The engine now
  hands over the list of files it read, and the guard judges those. A
  website folder that holds the product itself is still read and judged.
- **The comment says what was left out.** When a change touches files the
  report does not read, the terminal output and the pull-request comment
  say how many and name the first three. The JSON output lists them as
  `leftOut`.

## 2.9.4 — 3 Oct 2026

The engine moves to roast 10.1.1, which put its files back at the
repository root. The guard imports the engine through the same alias, so
nothing it does changes.

## 2.9.3 — 3 Oct 2026

The engine moves to roast 10.1.0, which moved its files into a `plugin/`
folder. The guard imports the engine through the same alias as before,
so nothing it does changes.

## 2.9.2 — 3 Oct 2026

The engine moves to roast 10.0.0. A patch for the guard: roast's major
version is about its benchmark, which the guard does not read.

- **A CSS keyword is not a typeface.** A font-family of "inherit
  !important" counted as a typeface, so a file using it could be told it
  added one. !important is stripped and the keywords are left out.
- **Colour names, color-mix() and light-dark() are read** wherever the
  engine resolves a theme value.

## 2.9.1 — 3 Oct 2026

The engine moves to roast 9.7.1. A patch: findings are removed on one
kind of repo, and none are added.

- **A palette scale a Tailwind 3 config redefines is the theme.** Novu
  points every grey at its own variables in `tailwind.config.ts`. The
  guard flagged each grey class on a pull request as a palette class.
  It now reads the config, as it already read a v4 `@theme` block, and
  stays quiet on those classes. Only a config the product reads counts:
  the root config, or one in a package that holds a tenth of the code.
- **A grey class is never swapped for a brand colour.** On a Tailwind
  theme the fix names the nearest theme colour. A grey class now only
  matches a grey.

## 2.9.0 — 1 Oct 2026

The engine moves to roast 9.7.0. A minor version: some findings change
their wording, and none are added or removed.

- **A value on a second kit's component names that kit.** Some products
  use two component kits. For example, Linode uses MUI and Akamai's
  components. Before, a colour or a pixel size on the second kit's
  component got the first kit's fix, such as "use the nearest step in sx",
  which does nothing there. The guard now names the second kit and the
  package the component comes from. It tells you to style it like the
  repo's other components from that kit.

## 2.8.0 — 1 Oct 2026

The engine moves to roast 9.6.1. A minor version: the guard flags kit
colours and pixel sizes it used to miss.

- **A file that uses the team's own layer over the kit is judged.** On a
  product built on MUI, Mantine, Chakra UI or Ant Design, a file that
  imports the team's wrapper around the kit (Linode's `@linode/ui`) instead
  of the kit itself was never judged by the kit rule, because of a slip in
  the engine. A pull request that wrote a colour or a pixel size onto a kit
  component in such a file got no finding. On Linode that was about half
  the kit files.

## 2.7.0 — 1 Oct 2026

The engine moves to roast 9.6.0. A minor version: the guard flags bracket
values it could not see.

- **Bracket values inside `cn()` and `cva()` are judged.** The guard read
  only classes written straight into `className`, and one added line at a
  time. Most class lists built with `cn()` or `cva()` run over several
  lines, so a bracket value inside them got no finding: in the fleet, 3,794
  such values in 66 repos, 88% on a line after the call opens. The guard now
  reads class strings on the whole file, the way the report does, and keeps
  the ones on lines the change adds. An edit inside a call that was already
  there is judged on its added lines only.
- **Each finding sits on the class's own line**, including a class on a later
  line of a `className` template.

## 2.6.0 — 1 Oct 2026

The engine moves to roast 9.5.0. A minor version: the guard judges files it
used to skip.

- **A component of the team's own in the shadcn folder is judged.** The
  guard left every file in the shadcn catalogue folder alone, as installed
  code. Most teams keep components of their own there too: in the fleet, 33
  of 44 shadcn repos do, 1,014 of 2,709 files in those folders. A pull
  request that added a palette colour or a bracket value to one of them got
  no finding. Now only shadcn's own components (by name, however they are
  spelt: `Avatar.tsx` counts as shadcn's `avatar`), installed registries and
  kit blocks are left alone. `components/ui/status-banner.tsx` is judged
  like any other file.

## 2.5.0 — 1 Oct 2026

The engine moves to roast 9.4.0. A minor version: the guard flags palette
classes on repos where it never did, and stops on one kind where it should
not have.

- **A palette colour on a repo with a Tailwind theme of its own.** Where the
  theme names its colours (`--color-ink`, `--color-brand` in a `@theme`
  block) and the code uses them as classes, a `text-gray-500` or a
  `bg-amber-50` added by a change is flagged, with the theme's nearest colour
  named as the class to use and the theme file to add one to when none fits.
  The roast report's live checks have done this since 7.7; the guard had no
  rule here at all, so a pull request got a different answer from the
  agent's edit check. Measured on the last 300 changes of ten such repos:
  two changes in a hundred get a finding, a fifth of the rate the shadcn
  rule below produces.
- **The shadcn rule reads the theme the way the report does.** The guard
  used to switch it on only when the sheet named in components.json held
  five of shadcn's rows under `:root`. That gate was shut on 11 of 48 shadcn
  repos in the fleet where the live checks spoke: a theme written straight
  into a `@theme` block (formbricks, supabase), rows kept in a sibling
  package, no sheet path in the config (documenso), or a theme of the repo's
  own with none of shadcn's rows (Nango, Ghost). All four now get the rule,
  the last one judged against the repo's own theme.
- **Utility-class mode stays off.** A shadcn install with `cssVariables:
  false` keeps its palette in Tailwind classes by design, and the report
  scores it that way. The guard already left it alone; the live checks now
  do too.
- **One rule, one set of words.** The rule itself moved into the engine
  (`paletteFindings` through the doorway), so the guard, the edit check, the
  end-of-turn review and `--check` cannot disagree about a palette class
  again. The finding reads: `The theme names its colours in
  src/styles/tokens.css; use text-warning as the class. If no token fits,
  add a warning shade to the theme once and use it by name.`

## 2.4.0 — 30 Sep 2026

The engine moves to roast 9.3.3. A minor version: the guard can flag a
spacing, radius, font size or shadow it let through under 2.3, in one rare
case below.

- **What the guard learns comes from the same files the report reads.** The
  guard judges a new spacing, radius, font size or shadow by whether the
  repo already uses it. It learned that list through the report's counter,
  which kept its own list of files to skip, apart from the rule the guard
  and the live checks use. Now there is one rule:
  - A file named like artwork but drawing nothing (a `StatusBadge`, an
    `IconButton`) is interface, so the values it uses count as known. A pull
    request reusing its padding is no longer told the value is new.
  - An icon in an icons folder is artwork, so its values no longer count as
    known. A pull request that copies a padding only an icon uses into a
    component is now told it is new to the interface. Icons rarely carry
    spacing, so this is rare.
- Colours are not affected: the guard judges them against the repo's
  tokens, which icons never define.

## 2.3.3 — 30 Sep 2026

The engine moves to roast 9.3.2. The guard flags less, never more.

- **A story, an example or a demo is not flagged for palette classes.** The
  report leaves those folders out of its count of colours taken from outside
  the theme, but the guard flagged a `text-slate-500` in a story. It now asks
  the engine which folders are demos, so the two agree about the same file.
- **A page a headless browser prints to a PDF is not judged.** A repo that
  renders React to HTML and prints it with puppeteer writes that page's
  styling inline, because the page loads none of the app's stylesheets, like
  an email. The engine finds those pages from the file that prints them, and
  the guard reads that from the engine.
- **A command-line tool's templates are not part of the system the guard
  learns** (roast 9.3.1), like the starter templates in 2.3.2.

## 2.3.2 — 30 Sep 2026

The engine moves to roast 9.2.6. The guard flags less, never more.

- **A project generator's templates are not the product.** Code a repo hands
  out to other people (a `starters` folder, the templates a `create-app` tool
  or a script copies into someone else's new project) is no longer part of
  the system the guard learns. A pull request that adds the real
  `AppSidebar` is not told a copy already exists in
  `scripts/cleanup-templates`. A templates folder inside the product itself
  is still read.

## 2.3.1 — 30 Sep 2026

The engine moves to roast 9.2.5. The guard flags less, never more: nothing
that was clean under 2.3 carries a finding now.

- **An icon in an icons folder is artwork, whatever it is called.** An icon
  set names its files after what they show (`ActionSendEmail.tsx`,
  `Server.tsx`), so a pull request that added an icon was told its colours
  were off the system. A file that draws SVG inside an icons, logos or
  illustrations folder is now artwork. A plain component in one of those
  folders is still judged.
- **An icon is not a second copy of a component.** A `Switch` icon added
  beside the repo's `Switch` component was flagged as a second copy. An icon
  now counts as a copy only against another drawing of the same thing, so
  the same logo drawn twice is still flagged, and so is a second `Switch`
  component.

## 2.3.0 — 30 Sep 2026

The engine moves to roast 9.2.3. A screen about email is now judged, so a
change that was clean under 2.2 can carry findings there.

- **A file is skipped as an email only when it shows it is one.** Until now
  any file with "email" in its path was left alone: a sign-in form, the email
  settings, an inbox. A file is now skipped when it uses an email kit,
  carries markup only an email carries (MJML, Outlook conditionals, table
  attributes such as `cellpadding`, react-email's `<Html>`, an HTML
  `style=""` attribute written as text), sits in a folder named for email
  that holds an email template, is a preview of an email or a stylesheet
  written for one, or is email-named beside the templates it sends. The guard
  reads where the repo keeps its emails from the engine, so it and the report
  give one answer about the same file.

## 2.2.0 — 29 Sep 2026

The engine moves to roast 9.2.1. The guard now gives the report's answer on
what a second copy of a component is. It goes quiet in four places where it
was wrong, and speaks in two where it was silent, so a change that was clean
under 2.1 can now carry a `component` finding.

No longer flagged:

- **A name that repeats by design.** A route file in a TanStack Router or
  Remix app exports `Route`, and every page has one. The guard read a new
  page as a duplicate and told the pull request to import another page's
  route. A framework's `Route`, `Layout`, `App` or `Provider`, a route file,
  the crash page, a story and an email template repeat by design.
- **What the report lists without counting.** A wrapper built on the
  component it shares a name with, two icon libraries carrying the same
  glyph, shadcn's own overlap inside the catalogue.
- **A file with no markup in it.** A stub returning null, or a TypeScript
  file whose generics read like tags.

Now flagged:

- **A second copy inside a file whose styling is exempt.** A drawing, a
  crash page or a render-to-image surface is excused its colours, because
  the medium allows nothing else. A second `Logo` is still a second `Logo`,
  and the report counts it. Only the `component` finding is raised there;
  the styling stays unjudged.
- **A web component registered a second time.** Stencil, Lit and
  `customElements.define` components are in the report's ledger, and the
  guard could not see them.

## 2.1.0 — 29 Sep 2026

The engine moves to roast 9.2.0. Two new things are judged, so a change that
was clean under 2.0 can now carry findings; nothing that was flagged before
is flagged differently.

- **A token's value pasted where its name belongs.** A hex that equals a
  token used to pass as disciplined token use. It is the value copied into
  the place the name belongs, and the next reader copies the hex. It is
  now a `color` finding: "this is already the token var(--blue-500),
  #3b6fe0; use the name, not the value". On a product built on a kit the
  advice points at the theme file instead, since a kit theme has no
  variable to offer. The files that state the palette (a token stylesheet,
  a Tailwind config, a kit theme, a palette file) are exempt: defining a
  token is still not a sin.
- **A button built from scratch where the repo already has a Button.**
  New kind `handmade-button`, in the engine's words: a styled button or a
  button tag dressed as a button (real padding, a background or a border,
  and a label style such as a font weight) in a file whose own package can
  import a Button that at least 20 files already import. The finding
  gives the import line: "A styled button (StyledConnectButton) where the
  repo already has <Button> (imported 274x from twenty-ui/input). Use
  import { Button } from 'twenty-ui/input'. If it needs a kind the Button
  lacks, add a variant there rather than a new button here." Rows, tabs,
  close crosses, select triggers, option cards and icon squares built on
  a button tag are left alone. In a monorepo the Button is the one the
  file's package can import, never another app's.
- **Usage counts credit the right copy.** When two components share a name
  across packages, an import by workspace package name or by a tsconfig
  path alias now credits the copy inside the named folder, and packages
  declared one level down (a Go root with a webapp folder) are found. This
  changes which copy the duplicate-import rule calls the main one on some
  monorepos, in the honest direction.

## 2.0.0 — 25 Sep 2026

The engine moves to roast 9.0.0. A major because the engine's own major
changed what a spacing value is, so findings on the same change can differ
from 1.9: fewer, never more of the old kind, plus one new kind.

- **A shadow's offsets, a width and a font size are no longer "new spacing
  values".** Inside a style object every length used to count as spacing
  (roast counted them that way too, up to 8.9.1). Only padding, margin, gap
  and position count now, the same set the CSS rule reads. A change that
  adds `boxShadow: '0 3px 9px …'` is no longer told it added two spacing
  values.
- **The chart rule.** Two new kinds, in the engine's own words. `chart-colour`:
  a colour written by hand in a chart file where the repo keeps a chart
  palette (`--chart-*` or `--series-*` tokens, a `chartColors` entry in a
  theme file, or shadcn's `--chart-1` to `--chart-5` when a chart actually
  reads them); the finding names the palette and how to read it.
  `chart-palette`: a chart painting its series by hand in a repo with no
  palette; one line per file that names the existing chart doing the same
  and asks for the palette once, or, for the first chart, asks for a name.
  A chart file is one that imports a chart library or is named for a
  chart; icons, illustrations and stories are not. On a chart file the
  chart rule owns colours: the generic colour rule and the kit rule stay
  out, so one line gets one finding, the same as `roast_validate`,
  `roast_review`, `--check` and the edit hook.
- **The Action tag is `v2`.** Workflows that reference `@v1` keep the 1.9
  engine; move to `@v2` (or a commit) to get this release.

## 1.9.0 — 24 Sep 2026

The engine moves to roast 8.6.1, and the guard runs the two checks added in
roast 8.6.0.

- **A new colour token that copies an existing one.** A new kind,
  `twin-token`. When a change adds a colour token to a stylesheet and its
  value is almost the same as a token the system already has, the guard says
  so and names the existing token. Almost the same means every colour channel
  within 8 steps and a difference too small to see. A new token whose dark
  value is exactly the same as an existing token's dark value is flagged
  too, if the light values are within 24 steps. Numbered steps such as
  `gray-100`, shadcn's own theme variables, and two names that start with
  the same word (`brand` and `brand-strong`) are never compared. Only tokens
  that were not in the file at the base are judged.
- **A new import of a duplicate component.** A new kind, `avoided-copy`.
  When a change imports a component from a copy that is not the main one,
  the guard names the main copy, how often each copy is used, and the
  colours the other copy hard-codes. The main copy must be used at least one
  and a half times as often as the next; otherwise nothing is flagged. An
  import that was already in the file at the base is not flagged.
- **The words are the engine's.** Both findings use the same sentences as
  `roast_validate`, `roast_review` and `--check`, taken from the engine
  rather than copied.

## 1.8.0 — 22 Sep 2026

The engine moves to roast 8.4.6, and the guard runs the kit check.

- **A colour or a pixel size written onto a kit component.** Two new kinds,
  `kit-colour` and `kit-px`, on a product built on MUI, Mantine, Chakra UI or
  Ant Design. A file that imports the kit is judged by the engine's kit rule
  and the hits on added lines are reported. A colour the theme already holds
  is told so, with the theme file named; a colour the theme lacks is told to
  add it there once; a pixel size is turned into the theme's spacing step, or
  told it falls between two. The advice is the kit's own: `sx` paths on MUI,
  props on Mantine, style props on Chakra, the theme config on Ant Design.
  The words are the engine's, the same ones `roast_validate`, `roast_review`
  and `--check` give for the same line.
- **A theme colour is flagged on a kit component even though it is not
  new.** The guard's usual rule is that only what is new to the repo counts.
  Writing a colour the theme already holds by hand onto a component is the
  exact mistake the kit check exists for, so it is reported, as the report
  and the live checks do.
- **On a kit file the kit rule speaks alone.** The generic colour rule stays
  quiet on a file the kit rule judged, and the spacing rule skips a pixel
  size the kit rule named, so one line is never reported twice.
- **The theme's colours are the token set on a kit repo.** A theme colour
  used in a stylesheet is on-system, not a new colour.
- **The same exemptions as the report.** Theme and palette files, colour
  tables, files that drive a chart or a map, tests, stories and fixtures are
  not judged by the kit rule.



The engine moves to roast 8.4.5.

- **A palette class named in a comment is not flagged.** The palette rule
  matched the raw added line, so a note such as `{/* border-green-500 is
  deliberate */}` was reported as paint. The line is now read with its
  comments blanked, the same step the roast report and its live checks run
  since 8.4.4, taken from the engine rather than copied. A block comment
  opened on an earlier line counts as a comment too.
- **The palette advice says token.** It read "a theme variable covers this;
  use a semantic class". It now reads "a theme token covers this; use it as
  the class (`bg-primary`, `text-muted-foreground`), or add one to the theme
  once", the wording the rest of the family uses.
- **The system is learned by the 8.4.5 engine.** Between 7.8.0 and 8.4.5 the
  engine fixed how it counts colours (one colour written two ways is one
  colour) and reads colour tokens stored as red, green and blue channels. The
  guard's nearest-token advice comes from that reading, so it can name a
  different value from 1.6.0, and the same value as the roast report. The
  engine also recognises MUI, Mantine, Chakra UI, Ant Design and Tailwind
  theme repos; the guard does not yet run the kit check the report and the
  live checks run on them, and reads those repos as before.



The engine moves to roast 7.8.0, and the guard reads the repo the way the
report does: four profiles, installed code, registries, and two cases where
`!important` is the medium.

- **Installed code is not the change's sin.** On a shadcn repo, a component
  added to the catalogue (`shadcn add sheet`), an installed registry or a kit
  block is left alone: shadcn's bracket values and a registry's colours are
  named in the roast report, never prompted, and now never flagged here.
  Before this release a pull request that ran `shadcn add` was flagged for
  values shadcn wrote.
- **A palette colour where a theme variable exists.** New kind, `palette`,
  on a shadcn repo whose theme file holds the variables: `text-slate-500` or
  `bg-blue-500/20` in the app's own code is flagged, with the theme file
  named. Same pattern the report counts per 100 files. Off on utility-class
  installs and on repos without a theme file.
- **`!important` as the medium.** Two cases the report sets aside since
  roast 7.5 are set aside here too: a stylesheet that imports Tailwind with
  the `important` flag or sits in a package whose Tailwind config scopes
  utilities under an id (an embedded widget), and a declaration whose
  selector names only a library's own class names (`.cm-editor`,
  `.react-datepicker`). The team's own `!important` is still flagged.
- **A registry is judged on what it publishes.** On a repo that publishes a
  shadcn registry, only the published folders are judged; the docs site,
  demos and examples are not. A component that also exists in a sibling
  variant, or in another published block, is not a second definition.
- **The Next.js crash page** (`global-error.tsx`) is exempt, through the
  engine's shared list.

## 1.5.0 — 11 Sep 2026

The engine moves to roast 7.0.0.

- **A bracket on a spacing utility is one finding, not two.** `mt-[37px]` used
  to be flagged as an arbitrary value. It is now flagged as off-scale spacing,
  with the nearest scale step named, the same way the roaster counts it. Other
  brackets, such as `text-[10px]` or `w-[137px]`, are still arbitrary values.
- **Fewer false flags from the engine.** A hex colour inside a CSS comment, or
  an id selector that spells hex such as `#face`, is no longer read as a
  colour. Files over 2 MB and symlinked files are skipped when the guard
  learns the system.
- **Faster on large repos.** Learning the system on a big monorepo is several
  times quicker; the results are identical.

## 1.4.1 — 11 Sep 2026

The engine moves to roast 6.0.1 and three alignments land. Nothing new is
flagged; two wrong flags are gone.

- **Dark themes are the system working.** Through the engine's `tokenColors`,
  the guard now recognises every colour the system names, dark variants
  included. A dark-theme value passes; a near-miss snaps to the dark token:
  "nearest token: `var(--background)`, hsl(224 71% 4%)" — never the light
  twin. Verified on shadcn-ui/taxonomy.
- **`var(--x, fallback)` is benign everywhere.** A token reference with a
  fallback is still the system deciding. Previously it was flagged as a new
  radius (and worse, `var(--font-sans, sans-serif)` produced a phantom
  typeface finding). The guard's last private copy of the benign rule is
  gone: fonts now go through the engine's `fontDeclarations`, so counter and
  checker share one definition of a token reference.

Suite grows to 46 checks.


The promise behind every number: a patch release never changes what gets
flagged. If a version flags something new, it is a minor or major bump and
this file says what, in one plain line.

## 1.4.0 — 8 Sep 2026

Two new things get flagged, and a class of false positive goes away. The guard
and `roast --check` were answering the same question differently in seven
places; they now agree.

- **Now flagged: an inline `style={{ }}` block.** A pull request adding
  `style={{ display: 'flex' }}` carried no colour and no length, so nothing in
  the judge tripped and it sailed through. Only static blocks count. A block
  built from variables is decided somewhere else, and the guard cannot know
  whether that somewhere is on-system, so it stays quiet.
- **Now flagged: a second definition of a component you already have.** The
  most expensive thing a pull request can add, and the one thing the guard
  could not see. The finding names the file that already defines it and how
  many places use that one. Pages are routes rather than reusable parts, so
  two of a name there is not a second Button.
- **No longer flagged: pictures drawn with code.** An OG card, a PDF invoice,
  a canvas renderer and a file that is mostly SVG are all drawing rather than
  interface. The roast report has skipped them since 5.10 and the guard did
  not, so the same file came up clean in one place and full of strays in
  another. The whole file decides now, not the added lines, because a satori
  import sits at the top of a file a diff may never touch.
- **The exemption list, the extra declaration kinds and the component ledger
  all come from the engine.** The guard used to keep its own copies and a
  comment claiming they matched the engine's. They did not, and that is how
  the seven gaps opened. Forty lines of duplicated rules deleted; the claim is
  now true by construction. Requires roast 5.11.0, which the pin moves to.
- Em-dashes are gone from everything a person reads: the colour advice, both
  report formats, the git error and the strict-mode line in the action. A test
  fails if one comes back. Findings now read `Card.tsx:24 · new colour…`.
- Suite grows to 43.

## 1.3.5 — 7 Sep 2026

The engine moves to roast 5.10.2 and shadcn repos become legible. Nothing new
is flagged; the advice gets much truer.

- **shadcn palettes are read for real.** Tailwind v3 shadcn stores tokens as
  bare HSL triplets; the old engine saw almost none of them, so the guard's
  colour advice on the most common React stack ran on an empty map. Now a hex
  stray is matched to the actual palette, across colour notations, and named:
  "nearest token: `var(--foreground)`, hsl(222.2 47.4% 11.2%)". Verified on
  shadcn-ui/taxonomy.
- **The "it belongs in …" advice names the right file** — the token file is
  now chosen by where the palette lives, not where the most `--var`s sit.
- Artwork and OG-image routes stop contributing junk values to the learned
  system, inherited from the engine.

## 1.3.4 — 6 Sep 2026

Docs only: the README rewritten to the GOV.UK plain-language standard — short
sentences, active voice, everyday words. The slogan, the sample findings and
the promises all stay; the metaphors go. The command table also gains the
`--version` row it was missing. Nothing about behaviour changes.

## 1.3.3 — 2 Sep 2026

Docs only: the README and landing page catch up with 1.3.2 — the guard now
says it reads Lit and Stencil styling, and Honest limits carries the
css-template line-level gap. Published so npm's copy matches.

## 1.3.2 — 2 Sep 2026

The engine under the guard moves to roast 5.7.2, and the learning gets truer.
Nothing new is flagged; several wrong flags are gone.

- **Web-component repos are finally legible.** On Lit and Stencil codebases
  (Shoelace keeps its entire styling in `` css`…` `` templates) the guard now
  learns the real token layer, spacing scale and typefaces, so its "known" and
  "nearest" answers stop running on an almost-empty map.
- **Sass repos judge cleaner:** `$token` references are no longer typefaces,
  the Sass `color(base)` helper is no longer a colour, fully transparent
  values no longer pad the palette — inherited straight from the engine.
- Known gap, stated honestly: inside `` css`…` `` templates the per-line
  judge catches colours but not yet spacing and friends; the whole-repo
  learning sees everything.

## 1.3.1 — 31 Aug 2026

One character. The Marketplace sidebar strips a straight apostrophe from the
action description, so "doesn't" read "doesn t"; a typographic apostrophe
survives. Nothing else changes.

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
