# Version history

## 0.3.1

- Added Short thumbs to Settings, Layout, Other layouts: the Twiddler default with the Short thumbs profile applied. Load it to practise on it, or open it in the Tuner to download it for the Twiddler.
- The Short thumbs profile now adds the arrows, Home, End, Page Up, Page Down and the other navigation keys where the factory layout has them, when a config has no chord for them. A config built from a typing layout used to have none.

## 0.3.0

- The config editor is now the Tuner, with its own tab.
- Added the Short thumbs profile, for hands that can't reach T1 and T2. It moves digits, brackets and symbols onto the finger buttons, makes T3 hold Control and T4 hold Shift, and adds 14 common word chords and 10 terminal ones. Choose which parts to apply. The Tuner lists what changed and warns about anything you can no longer type. You can also start a new config from the layout in use with the profile applied.
- Undo takes back the last profile, thumb swap or mirror.
- Removed the warning about multi-character strings longer than 255 bytes. Tek Gear's Tuner reads and writes configs with longer strings.

## 0.2.0

- Added a config editor for Twiddler 4 config files (version 7), under Settings, Layout. Open a .cfg from the Tuner, or start from the layout in use, then add, change and delete chords, swap two thumb buttons in every chord, mirror the layout to the other hand, and change the thumb modifiers and device settings. Download the result to copy to the Twiddler. The open config is saved in your progress.
- Practise with this config makes lessons and drills use the config you're editing.

## 0.1.5

- Added Learn chords under Practice: one chord at a time with spaced repetition, for word chords, letters, digits or symbols. A word chord only counts when the whole word arrives as one chord, not letter by letter. What you have learnt is saved in your progress.

## 0.1.4

- Added lessons 70 to 344, after the tutor's 69: common words, letter groups, capitals, numbers, punctuation, sentences, terminal commands and code, phrases, speed and review. If you had finished lesson 69, you continue from lesson 70.
- Fixed loading Twiddler 4 config files downloaded from the Tuner. Tweedledum refused them as an unknown version.

## 0.1.3

- Added a Settings button to the run screen. The run pauses while Settings is open and carries on where you left it.
- Settings shows the version and checks the site for a newer one. Update and reload installs it.
- The sidebar shows the version.
- Redrew the Settings icon as a gear; the old one looked like a sun.
- Rewrote the README and some text in the app to read more plainly.

## 0.1.2

- Added a Hand setting under Settings, Keypad picture. Left hand mirrors the keypad picture; the chords don't change.

## 0.1.1

- Fixed scrolling. In 0.1.0 nothing below the first screen could be reached on a phone or with a mouse wheel.

## 0.1.0

First release.

- The 69 lessons of the Twiddler Typing Tutor, with its scoring, speed and stars.
- Random text, your own text, multi-character chords, and a chord chart where any key you press shows its chord.
- Letter and word dictation: hear the text and type it without seeing it.
- Weak keys, timed tests and chord reading drills.
- A keypad picture of the layout in use, front or back view, in classic or Twiddler 4 notation.
- Statistics for this session, each past session and all time.
- Load your own layout from a Twiddler config file (Twiddler 2, 3 or 4), a Twiddler Tuner CSV or a JSON key map. TabSpace, MirrorWalk, DelEnt and TeaSan are built in.
- Copy a progress code or save a progress file to carry your progress to another browser or device.
