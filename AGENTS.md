# Working on Tweedledum

Rules for anyone changing this repo, people and coding agents alike.

Tweedledum is a typing tutor for the Twiddler chording keyboard. Its users are learning chords, often from zero. The Tek Gear Typing Tutor (tutor.mytwiddler.com/tutor2) is the reference for lessons, the default layout and scoring; `scripts/tutor-levels.json` is its lesson list as served on 21 November 2026.

## Tooling

Everything runs in Docker. Never install or run node, npm, vite, vitest or Playwright on the host.

```sh
docker compose run --rm -T dev npm install
docker compose run --rm -T dev npm test
docker compose run --rm -T dev npm run check      # 0 errors, 0 warnings
docker compose run --rm -T dev npm run lint:css   # no ✖ lines
docker compose run --rm -T e2e npx playwright test
```

## Changes

- Every bug fix comes with a test that fails on the old code.
- Run all the checks above before you commit. Say what you ran and what you did not.
- Every push that changes the app bumps the version in `package.json` and adds an entry at the top of `CHANGELOG.md`, written for the person using the app.
- Progress must stay portable: everything the app remembers lives in the `Profile` (`src/lib/state/profile.ts`) and travels in the progress code. Never add state that only lives elsewhere. A change to the profile shape must load older profiles (`normaliseProfile`).
- Nothing is sent to a server.

## Chords

- Stored notation is the tutor's: four letters, row 1 first, `O` for an empty row, thumbs before `+` (`N+ROOO`). People see `0` for an empty row (`formatChord`).
- L, M and R are named as you face the keypad (Tek Gear's convention). The front view of the keypad picture has R on the left.
- Thumb buttons: N, A, C, S = NUM, ALT, CTRL, SHIFT = T1 to T4 on the Twiddler 4.
- Config formats are described in `src/lib/chords/import.ts`. Test new formats against real files.

## Writing for the screen

Plain, whole sentences in British English. Say what to do and what happens. No em dashes, exclamation marks, rhetorical questions, slogans or encouragement ("Great job"). Numbers as digits; "wpm" in lower case. Error messages say what happened and what is left ("Nothing was changed."), never raw browser errors.

## Visual design

- Apple system colours and type, as in RR73. Colours, sizes and spacing come only from `src/styles/tokens.css`; stylelint rejects raw values elsewhere.
- Both themes must work. Phones first: 360 px wide is the narrowest screen; tap targets at least 44 px.
- No gradients, emoji, confetti, badges or streak counters as decoration. Stars follow the tutor's thresholds.
