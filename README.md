<img src="assets/icon.svg" width="64" height="64" alt="">

# Tweedledum

Tweedledum is a typing tutor for the [Twiddler](https://mytwiddler.com), a one-handed chording keyboard. Open it at <https://nnamon.github.io/tweedledum/>. It runs in the browser, installs as an app (PWA) and works offline after the first visit. It teaches the 69 lessons of Tek Gear's Twiddler Typing Tutor, follows them with 275 of its own (common words, numbers, punctuation, sentences and terminal commands), and adds dictation, drills and statistics, which you can carry between devices without an account.

## Exercises

Lessons 1 to 69 are the tutor's: they start with 4 letters and end with sentences that use digits and punctuation. Lessons 70 to 344 go on with the 1,000 most common words, letter groups, capitals, numbers, punctuation, sentences, terminal commands and code, common phrases, speed sprints and mixed review. Finishing a lesson moves you on to the next, and you can start any lesson from the Lessons tab. The tutor's other modes are here too:

- Random text, with a group length you choose and optional capitals, digits and punctuation.
- Your own text, pasted in.
- Multi-character chords such as `the ` and `ing `.
- A key explorer on the Chords tab that shows the chord of any key you press.

Tweedledum adds these:

- Letter and word dictation. The app reads the text out and hides it, and you type what you hear. Letters are recorded clips that work offline; words use your device's speech voice.
- Learn chords: one chord at a time with spaced repetition, for word chords, letters, digits or symbols. It tells a word chord from the same letters typed one by one by the gaps between them, and counts only the chord.
- Weak keys, a drill built from the characters you miss most and type slowest.
- Timed tests on common words, from 30 s to 5 min.
- Chord reading: the keypad shows a chord with its labels hidden, and you type the character it makes.

During a run the keypad picture lights the next chord, drawn from the layout you're using. In Settings you can switch between the front and back views, mirror the picture if you wear the Twiddler on your left hand, and choose when hints show. The Settings button on the run screen pauses the run, so you can change these without losing your place. Stats shows this session, each past session and all time, with speed by day and the accuracy and timing of each character.

## Layouts

The default layout is the one the Twiddler 3 and 4 ship with, which is also the one the Typing Tutor teaches. To use another, open Settings and load one of these under Layout:

- A Twiddler config file: version 4 (Twiddler 2), 5 (Twiddler 3) or 7 (Twiddler 4).
- A CSV exported by the Twiddler Tuner.
- The Typing Tutor's JSON key map.

TabSpace, MirrorWalk, DelEnt and TeaSan are built in. Tweedledum keeps only the chords that type text, so shortcuts, mouse actions and chords with two buttons in one row are dropped. The lessons introduce letters in an order chosen for the default layout, and on another layout that order won't follow your chords.

## Moving your progress

Your progress lives in the browser's storage, and nothing is sent to a server. To carry on in another browser or on another device:

1. In Settings, under Progress, press Copy progress code or Save progress file. The code is one line of text starting `TWD1.`, holding your settings, layout, runs and statistics.
2. In the other copy of the app, paste the code under Load progress and press Load code, or press Load progress file.

Loading replaces the progress in that browser, and the app asks before it does.

## Chord notation

Chords are written one letter per row, row 1 (index finger) first: `L`, `M` or `R` for the button held, `0` for none. `L0R0` holds L on row 1 and R on row 3. Thumb buttons come first: `N+R000` is NUM with R on row 1. L, M and R are named as you look at the front of the keypad, as Tek Gear's documents do. Settings can switch to the Twiddler 4 notation (`T1 F1R`).

## Development

Everything runs in Docker, so you don't install node on the host. These commands install the dependencies, run the checks, start a dev server and run the end-to-end tests on desktop and phone browsers:

```sh
docker compose run --rm -T dev npm install
docker compose run --rm -T dev npm test           # unit tests
docker compose run --rm -T dev npm run check      # svelte-check
docker compose run --rm -T dev npm run lint:css   # stylelint
docker compose run --rm --service-ports dev npm run dev   # http://localhost:7375
docker compose run --rm -T e2e npx playwright test        # end-to-end, desktop and phone
```

The app is Svelte 5, TypeScript and Vite, with vite-plugin-pwa. A push to `main` runs the tests, builds the app and deploys it to GitHub Pages (`.github/workflows/pages.yml`). Read [AGENTS.md](AGENTS.md) before you change the code and [STYLE.md](STYLE.md) before you write docs, comments, commit messages or text in the app.

## Credits

Lessons 1 to 69 and the default layout: Tek Gear's Twiddler Typing Tutor. Lessons 70 to 344 were written for Tweedledum and are generated by `scripts/more-lessons.py`. Tweedledum is not made by or connected with Tek Gear. Bundled layouts, voice clips and test files are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Code: MIT licence ([LICENSE](LICENSE)).
