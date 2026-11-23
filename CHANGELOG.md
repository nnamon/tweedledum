# Version history

## 0.3.3

- The Tuner page is one list of grouped rows, as in Settings: practice layout first, then the config file. The Edit button on every layout is gone; with no file open, "Start from" builds one from the practice layout.
- Profile changes are switches with one line each, and the profile's explanation moved to the footer.
- Download, Practise and Close are rows in the config group.

## 0.3.2

- Moved layouts from the bottom of Settings to the top of the Tuner; a tick shows the one in use.
- Added a slot choice, 1 to 3, that names the download 1.cfg, 2.cfg or 3.cfg; the Twiddler 4 reads those names.

## 0.3.1

- Added Short thumbs as a built-in layout: the Twiddler default with the Short thumbs profile applied.
- The Short thumbs profile adds the arrows and other navigation keys on their factory chords when a config has none.

## 0.3.0

- Moved the config editor to its own tab, the Tuner.
- Added the Short thumbs profile, for hands that can't reach T1 and T2; you choose which of its changes to apply.
- Undo takes back the last profile, thumb swap or mirror.
- Removed the warning about strings past byte 255; Tek Gear's Tuner reads and writes them.

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
