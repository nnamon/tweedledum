# Third-party notices

## Lessons and default layout

`src/lib/lessons/tutor.ts`, `scripts/tutor-levels.json` and the default layout in `src/lib/chords/layout.ts` come from the Tek Gear Twiddler Typing Tutor (https://tutor.mytwiddler.com/tutor2/), read on 21 November 2026. Twiddler is a trademark of Tek Gear. Tweedledum is not made by or connected with Tek Gear.

## Voice clips

`public/voice/*.mp3` come from BeepBeep (https://github.com/nnamon/beepbeep), generated with the Kokoro-82M model (Apache License 2.0), voice am_michael.

## Config file formats

The config file readers in `src/lib/chords/import.ts` were written for Tweedledum from the format descriptions in these projects; no code was copied:
nevinera/twiddling (MIT), kiwiz/twiddler-ctl, DDRBoxman/twiddler-cfg, edanaher/twidlk, coddingtonbear/twiddler-config, MarkoMarjamaa/TwiddlerCfgConverter (GPL-2.0), durquhart/T3Tutor (GPL-3.0).

## Bundled layouts and test files

- `public/layouts/*.cfg` (TabSpace, MirrorWalk, MirrorWalk without multi-character chords, DelEnt, TeaSan) and `src/lib/chords/fixtures/t3-default-v4.cfg` are from Griatch/twiddler-configs (https://github.com/Griatch/twiddler-configs), BSD 3-Clause licence, below. TabSpace was designed by Brandon Rhodes; DelEnt and TeaSan by Griatch.
- `src/lib/chords/fixtures/t4-multi-char.cfg` is from nevinera/twiddling (https://github.com/nevinera/twiddling), MIT licence, below.
- `src/lib/chords/fixtures/t3-tuner.csv` is from mimming/binary-counting-twiddler-layout (https://github.com/mimming/binary-counting-twiddler-layout), Apache License 2.0.

### Griatch/twiddler-configs

```
Copyright (c) 2016, Griatch
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of twiddler-configs nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### nevinera/twiddling

```
MIT License

Copyright (c) 2026 Eric Mueller

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
