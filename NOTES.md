# Kanji Strokes — dev notes

The standing reference for whoever (Andrew or Claude) picks this app up next.
Update it whenever the app changes.

## What this is

A stroke-order drawing trainer for kanji, hiragana and katakana. You draw on
the screen and each stroke is checked against KanjiVG stroke data. It's a
companion to Kanji Cards and shares its 500-kanji master list. It's a separate
app from the Japanese Drill and Kanji Cards apps on purpose: it trains stroke
memory, not recognition. Styling matches the other apps: dark by default, gold
`#e8c97a` accent, BIZ UDPGothic for Japanese.

Hosted on GitHub Pages. Andrew uploads the changed files himself and only
uploads when there's a major change.

## Folder layout (Documents/Apps/Kanji Strokes)

```
index.html          the app (single file: HTML, CSS, JS and the 500-kanji + kana data)
sw.js               service worker: offline copy, always on (network-first)
manifest.json       PWA manifest (has "id": "./index.html")
lookup-extra.js     the other ~1,636 jōyō kanji, for Look up only (loaded lazily)
icons/              192, 512, 512-maskable, apple-touch-icon (書 in gold)
fonts/              BizUDPGothic-Regular.ttf (self-hosted)
NOTES.md            this file
build/              sources: NOT part of the website, don't upload
```

Upload: the files above, not `build/` or `NOTES.md`.

## Building

`index.html` is generated, so don't hand-edit it. Edit `build/template.html`,
then run `python3 build.py` inside `build/`, which:

- replaces `/*DATA*/` in the template with `data.js`
- writes `../index.html` with the full `<head>` (manifest, icons, self-hosted font,
  and `translate="no"` so phones don't auto-translate the readings)
- writes `../sw.js` from `sw.template.js`
- writes `kanji-strokes.html`, the preview version for the Claude artifact

`<!--STANDALONE-->…<!--/STANDALONE-->` blocks (the install card and the
version stamp) are stripped from the preview version, which also never
registers the service worker.

**Version:** `VERSION` in build.py (format `YYMMDD.NNN`) is shown at the
bottom of Settings and also sets sw.js's `CACHE_VERSION`
(`strokes-vYYMMDD-NNN`). Bump it on every build, or offline users keep a
stale copy.

**Data:**
- `build_data.py` makes `data.js` from `kanji-master.csv` plus the KanjiVG
  SVGs (`kv/XXXXX.svg`, not saved here; download from KanjiVG).
- `build_extra.py` makes `../lookup-extra.js` from `extra-chars.json`, the
  KanjiVG SVGs and the KANJIDIC fields of the kanji-data mirror
  (`kanji-data.json`, not saved here).
- `meanings.py` holds curated meaning fixes.

## Data and licences

- Stroke data: KanjiVG © Ulrich Apel, CC BY-SA 3.0.
- Meanings and readings: KANJIDIC2 © EDRDG, CC BY-SA 4.0. Use only the
  KANJIDIC fields from the kanji-data mirror, never its WaniKani fields
  (proprietary).
- Nothing from the Tuttle book or any commercial textbook.
- Both licences are credited in Settings.

**kanji-master.csv** (the copy in `build/` is the master) is the shared
500-kanji list for Strokes and Kanji Cards:
- `ID` is the permanent id and is never renumbered. Scores are keyed by it.
  Book kanji are 1–430 minus 35 (々); additions are 431–501.
- `Display` is the 1–500 order.
- Any change to the list must be mirrored in Kanji Cards.

## Main features (as of v261016.002)

- **Steps:** Watch, Trace, Recall. Each new kanji restarts at the chosen
  step, and there are step pills on the drill screen.
- **Kanji views:** in order (blocks of 20, five blocks per pill), by part
  (shared part drawn in gold), by JLPT. Search by meaning (copied from Kanji
  Cards).
- **Kana:** pick individual characters or whole rows. No dakuten or small
  kana in the practice sets yet.
- **Navigation (from the Japanese Drill L3 handover, 16 Oct 2026):** every
  screen change goes through `show()`, which records history (`navRecord`).
  - Kanji / Hiragana / Katakana are the main pages. Back does nothing there,
    so the app can't be left by accident.
  - Inner pages (kanji selection, search results, Look up, Settings) get a
    "← …" link at the top left naming where Back goes.
  - The phone's back gesture does the same (`navBack`, via a history trap).
  - A drill is never stepped back into: Back goes to wherever it was started.
    Settings opened mid-drill is the exception, and Back returns to the drill.
  - ⚙ toggles Settings.
  - The drill keeps a bottom Back (it's a long page) that calls the same
    `navBack()`.
  - If a popup is ever added, `navBack()` must close it first.
- **Selections clear after a drill:** coming back from a drill clears the
  kana or kanji you picked (as in the Japanese Drill app). Look up keeps your
  drawing.
- **Checking:** strokes are resampled to 32 points and compared forwards,
  reversed and for order. Leniency strict 0.75, normal 1 (default), relaxed
  1.4.
- **Confidence score:** same model as Kanji Cards. Score runs −2 to +2,
  positive scores decay with a 50-day half-life, 8 bands. Strokes' own rule
  for one Recall:
  - +0.5 cold, +0.25 warm
  - −0.1 per order, direction or hint error
  - −0.05 per redraw
  - floor of −0.75
  - only the first Recall of a kanji per run counts
- **Drawing grade (Neat / Good / OK / Rough):** shown after Trace or Recall.
  - Your drawing is moved and resized onto the model, then scored 60% on
    average stroke distance and 40% on the worst stroke.
  - Bands: Neat < 3.5, Good < 5.5, OK < 8, Rough above that. Any single
    stroke ≥ 6.5 is drawn in red.
  - Not scored. The last 10 grades per character are kept in
    `kanjiStrokes.neat.v1` for tuning.
  - Kana may grade harsher than kanji; check that log before changing the
    bands.
- **Look up by drawing:** any order, any direction.
  - How it matches: 16-point strokes, Hungarian pairing, each candidate scored
    both as drawn and resized to fit, quick first pass to a shortlist of 80.
  - Joined or split strokes: a bent stroke drawn as two lines, or two strokes
    drawn as one, are tried as joined (small penalty).
  - Searches the 500 plus `lookup-extra.js`. The extras are never scored and
    don't appear in views, search or the progress bar. Their tiles have dashed
    borders and their card says "not in your 500".
- **Hold to peek** (from the Japanese Drill app): hold a kanji tile, a kana
  tile or a Look up match for 0.45 s.
  - A bubble shows the stroke order being drawn, the full meaning, stroke
    count, JLPT level, and on/kun readings (up to three each).
  - It reads the character out (kana as written; kanji by up to two on and
    two kun readings).
  - Letting go closes it. A finger that moves is a scroll and cancels the
    hold, and the tap after a peek is swallowed so it doesn't select or open
    the tile. Back closes the bubble too.
- **Sound button** (🔊 beside ⚙, as in the Japanese Drill app):
  `settings.soundOn`, on by default. It uses the phone's own Japanese voice,
  and Safari needs the silent "unlock" on the first tap.
- **Offline is always on** (16 Oct 2026, matching the other apps; the
  "Work offline" switch is gone and `settings.offline` is deleted on load).
  `lookup-extra.js` isn't precached; it's saved the first time Look up loads
  it.
- **Settings:**
  - Install card (only shown when not installed; steps for iPhone or Android,
    plus an Install button where the browser offers one).
  - Stroke checking.
  - Show kanji (on for existing users, off for new ones, kept once set).
  - Light theme and romaji.
  - Share card: a QR code for andrewbrittle.github.io/ab-kcdraw/ (made with
    segno; checked by decoding it) and links to Japanese Drill L3 and Kanji
    Cards.

localStorage keys:
- `kanjiStrokes.v2.settings`
- `kanjiStrokes.scores.v1` (attempt log)
- `kanjiStrokes.confidence.v1`
- `kanjiStrokes.neat.v1`

## Standing rules

- **Small kana:** every piece of Japanese text goes onto the page through
  `jpHtml()` / `setJp()` in template.html, never `textContent` or a raw
  `innerHTML` string.
  - BIZ UDPGothic draws small kana (っ ゃ ゅ ょ ぁ ぃ ぅ ぇ ぉ ゎ, ッ ャ ュ ョ ァ ィ ゥ
    ェ ォ ヮ) almost full size, so ちょっと reads as chi-yo-tsu-to.
  - The helper wraps each one in `<span class="small-kana">` (CSS:
    `font-size: 0.65em`) and escapes everything else. It's the same fix as
    the Japanese Drill app.
  - Currently used for the kana chart, kanji tiles, part names, the drill
    card's big character, on/kun readings and Look up tiles.
  - Any new place that shows Japanese (example words, small-kana practice,
    and so on) must use it. Test with ちょっと, しゃしん, ショウ and キョウ at real size.
- **Folder:** this app lives only in Documents/Apps/Kanji Strokes. Each chat
  touches only its own app's folder.
- **Deleting:** on Andrew's Mac, don't delete files. Move them into a
  `_to_delete/` folder unless he gives permission.
- **Test before handing over:** check builds in a real browser at phone size,
  and fix root causes rather than patching symptoms.
- **Pace:** go slowly. Small, testable steps rather than big builds that need
  refactoring.
