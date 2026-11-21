<img src="assets/icon.svg" width="64" height="64" alt="">

# Tweedledum

A typing tutor for the [Twiddler](https://mytwiddler.com) one-handed chording keyboard. It runs in the browser, installs as an app (PWA) and works offline.

**Open it:** <https://nnamon.github.io/tweedledum/>

## What it does

- **Lessons.** The 69 lessons of the Twiddler Typing Tutor (tutor.mytwiddler.com), from four letters to sentences with digits and punctuation. Finishing a lesson moves you to the next.
- **The tutor's other modes.** Random text (group length, capitals, digits, punctuation), your own text, multi-character chords ("the ", "ing "...), and a key explorer that shows the chord of any key you press.
- **Dictation.** Letters or words are read out and you type them without seeing them. Letters use recorded clips that work offline; words use your device voice.
- **Drills.** Weak keys (built from your own statistics), timed tests, and chord reading (the keypad shows a chord; you type what it makes).
- **A keypad picture** drawn from the layout in use, front or back view, with the next chord lit. Hints can show always, after a pause, after a miss, or never.
- **Statistics** for this session, every past session, and all time: speed by day, accuracy, and per-character accuracy and timing.
- **Your layout.** Load a Twiddler config file (version 4, 5 or 7, for the Twiddler 2, 3 and 4), a CSV from the Twiddler Tuner, or the tutor's JSON key map. TabSpace, MirrorWalk, DelEnt and TeaSan are built in.

## Progress without an account

Everything is kept in your browser. To carry on somewhere else, open Settings and copy a **progress code** (one line of text starting `TWD1.`) or save a **progress file**, then load it in the other copy of the app. Nothing is sent to a server; the code is your settings, layout, runs and statistics, compressed.

## Chord notation

Chords are written one letter per row, row 1 (index finger) first: `L`, `M` or `R` for the button held, `0` for none. `L0R0` holds L on row 1 and R on row 3. Thumb buttons come first: `N+R000` is NUM with R on row 1. L, M and R are named as you look at the front of the keypad, as Tek Gear's documents do. Settings can switch to the Twiddler 4 notation (`T1 F1R`).

## Development

Everything runs in Docker; nothing is installed on the host.

```sh
docker compose run --rm -T dev npm install
docker compose run --rm -T dev npm test           # unit tests
docker compose run --rm -T dev npm run check      # svelte-check
docker compose run --rm -T dev npm run lint:css   # stylelint
docker compose run --rm --service-ports dev npm run dev   # http://localhost:7375
docker compose run --rm -T e2e npx playwright test        # end-to-end, desktop and phone
```

Svelte 5, TypeScript and Vite, with vite-plugin-pwa. Pushing to `main` tests, builds and deploys to GitHub Pages (`.github/workflows/pages.yml`).

## Credits

Lessons and the default layout: Tek Gear's Twiddler Typing Tutor. Tweedledum is not made by or connected with Tek Gear. Bundled layouts, voice clips and test files are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Code: MIT licence ([LICENSE](LICENSE)).
