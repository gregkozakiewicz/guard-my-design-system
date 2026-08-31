---
name: False positive
about: The guard flagged code that is legitimately on-system. This is the bug class we take most seriously.
title: "False positive: "
labels: false-positive
---

**The finding the guard reported**

```
(paste the finding line, e.g. `Card.tsx:24 — new colour #4a7be8. Nearest token: …`)
```

**Why the flagged code is actually legitimate**

<!-- e.g. the value IS a token defined in <file>, or the file is generated, or… -->

**How your system defines its values**

<!-- CSS custom properties / Tailwind config / Style Dictionary / other — and in which file(s) -->

**Version** (`npx guard-my-design-system --version`):

A minimal snippet of the added line plus the relevant token definition is
usually enough for a same-week fix. False positives are treated as the most
serious bug class this tool has.
