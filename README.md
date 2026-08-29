# guard-my-design-system

**No new mess.**

Design systems don't die in a redesign. They die one pull request at a time:
a colour that's nearly the token, a spacing value that's off the scale, an
`!important` that seemed harmless on a Friday.

This is the smoke alarm at the door. It checks only the lines a pull request
adds, says nothing about the past, and points each new sin at the on-system
value the author probably meant. Old wiring is not its business; new sparks
are.

## Status

Not ready yet. This publish reserves the name while v1 is built.

When it ships, setup will be five minutes: one devDependency and a copy-paste
GitHub Action. After that you forget it exists, which is the whole point of a
smoke alarm.

## In the meantime

Find out how bad things already are:

```bash
npx roast-my-design-system
```

[roast-my-design-system](https://github.com/gregkozakiewicz/roast-my-design-system)
diagnoses the whole codebase and scores it against a 34-repo benchmark.
roast diagnoses it, guard protects it.

## Licence

MIT © [Greg Kozakiewicz](https://gregkozakiewicz.com)
