# Handover: making the three apps consistent again

**For:** Kanji cards (andrewbrittle.github.io/ab-kcdrill/) and Kanji strokes (andrewbrittle.github.io/ab-kcdraw/).
**From:** Japanese drill L3 v261018.001 (18 October 2026), after a side-by-side check of all three apps at Andrew's request. That check compared Cards v261016.002 and Strokes v261017.002.
**Why:** each app has gone its own way for a while, with the odd handover between them. Andrew wants them consistent, not merged.

**Already the same in all three; no action:** colour tokens, BIZ UDPGothic font, light theme, back navigation (top-left "← …", phone back gesture, ⚙ toggles Settings), install card, share card with QR and links to the other two, hold-to-peek at 450 ms, sound button, small-kana helper, and `translate="no"`.

Standing rules still apply: exact-string replaces with a count check, bump the footer version and `sw.js` CACHE_VERSION together, and every piece of Japanese text goes through the small-kana helper.

**Already done in the Japanese app (v261018.001):**
- The app name's colours now match yours: the Japanese part (日本語) is gold and the English part ("drill") is plain.
- The Settings intro now reads "Everything is stored on this device only."
- Its description of Strokes now reads "Practise writing hiragana, katakana and kanji stroke by stroke", the same as Cards uses.

| # | What | Cards | Strokes |
|---|---|---|---|
| 1 | ⚙ and 🔊 on the title line, right-hand end | ✓ already | **to do** |
| 2 | Backup / restore in Settings | ✓ already | **to do (most important)** |
| 3 | Search box: clear × inside, round search button outside | **to do** | n/a unless it has one (Look up?) |
| 4 | "Weakest 20", not "Weak" | **to do** | check |
| 5 | Settings footer order | **to do** | **to do** |
| 6 | "Any problems" contact line | **to do** | **to do** |
| 7 | "How this app works" / "What's new" pages + green cog | **to do** | **to do** |

---

## 1. Strokes: ⚙ and 🔊 up to the title line

**What's wrong:** in Strokes they sit on the second row, on the left, cog first. In the other two apps they're on the title line, on the right, sound first, then cog. The Japanese app moved them on 16 October to make room for a fifth tab, and Cards picked that up.

**Markup:** the Japanese app's version (keep Strokes' own ids, e.g. `gear`, and its handlers):

```html
<div class="app-heading-row">
  <div class="app-heading"><span class="jp">漢字</span> strokes</div>
  <div class="head-btns">
    <button class="settings-btn" id="sound-btn" ...></button>
    <button class="settings-btn" id="gear" ...>⚙</button>
  </div>
</div>
<div class="nav-row">
  <div class="nav-pills"> ...ひらがな / カタカナ (/ 漢字)... </div>
</div>
```

**CSS:**

```css
.app-heading-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.head-btns { display: flex; gap: 8px; }
.nav-row { display: flex; align-items: center; justify-content: flex-end; gap: 8px; } /* tabs right-aligned under the buttons */
```

The Japanese app also uses 16px header side padding (`header { padding: 1rem 16px; }`). Check Strokes' header at 360px wide afterwards.

## 2. Strokes: backup and restore

**What's wrong:** Strokes keeps scores and confidence, but unlike the other two it has no way to save them. If the phone's browser data is cleared, the progress is gone. This is the most important item.

**The code to copy:** Cards' version is the simplest, at about 30 lines (`downloadBackup` / `restoreBackup` / `showStatus`).

```js
function downloadBackup() {
  const blob = new Blob([JSON.stringify(scores)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'kanji-cards-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  showStatus('Backup downloaded', false);
}
function restoreBackup(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try { parsed = JSON.parse(reader.result); } catch (e) { showStatus("That file isn't a valid backup", true); return; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { showStatus("That file isn't a valid backup", true); return; }
    if (!window.confirm("This replaces your current progress with what's in this backup. Continue?")) return;
    scores = parsed; saveScores(); refreshTiles();
    showStatus('Progress restored', false);
  };
  reader.onerror = () => showStatus("Couldn't read that file", true);
  reader.readAsText(file);
}
```

**For Strokes:**
- Back up everything that is progress, not just one object. That looks like `scores` (the attempt logs) and `conf` (confidence, `CONF_KEY`), and possibly picked selections. Write them as one object, e.g. `{ app: 'kanji-strokes', v: 1, scores, conf }`.
- On restore, check `app === 'kanji-strokes'`, so a Cards or Drill backup can't be loaded by mistake.
- Name the file `kanji-strokes-backup-YYYY-MM-DD.json`.

**In Settings:** a card with "Back up my progress", "Saves your scores to a file you can restore later", and two buttons, Download backup and Restore from backup (a hidden `<input type="file" accept="application/json,.json">`). Same wording as the other two apps.

## 3. Cards: search box style

**What's different:** Cards has the 🔍 inside the pill. The Japanese app (13 October) has a clear × inside the pill that appears once there's text, and a separate round search button outside. Andrew asked for that layout because there was no quick way to empty the box.

**Markup:**

```html
<div class="search-row" style="display:flex; gap:8px; align-items:center;">
  <div class="vocab-search-pill">
    <input type="text" id="kanji-search-input" class="vocab-search-input" placeholder="Search by meaning…" onkeydown="handleKanjiSearchKeydown(event)" oninput="syncSearchClear()">
    <button type="button" class="vocab-search-clear" id="search-clear" onclick="clearSearch()" title="Clear" aria-label="Clear search" style="display:none;">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>
    </button>
  </div>
  <button class="vocab-search-btn" onclick="submitKanjiSearch()" title="Search" aria-label="Search">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
  </button>
</div>
```

**CSS:**

```css
.vocab-search-pill { flex: 1; min-width: 0; display: flex; align-items: center; border: 1px solid var(--accent); border-radius: 99px; background: transparent; padding-left: 14px; padding-right: 4px; }
.vocab-search-input { flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: var(--text); font-size: 13px; font-weight: 600; font-family: 'BIZ UDPGothic', -apple-system, sans-serif; padding: 6px 4px; }
.vocab-search-input::placeholder { color: var(--text-dim); font-weight: 500; }
.vocab-search-clear { flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; border: none; background: var(--border); color: var(--text-muted); cursor: pointer; padding: 0; }
.vocab-search-clear:hover { color: var(--text); }
.vocab-search-btn { flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--accent); background: transparent; color: var(--accent); cursor: pointer; transition: all 0.15s; }
.vocab-search-btn:hover { background: var(--accent-dim); }
```

**JS:**

```js
function syncSearchClear() {
  const input = document.getElementById('kanji-search-input'), x = document.getElementById('search-clear');
  if (input && x) x.style.display = input.value ? 'flex' : 'none';
}
function clearSearch() {
  const input = document.getElementById('kanji-search-input');
  if (!input) return;
  input.value = ''; syncSearchClear(); input.focus();
  // also hide any "no results" message the app shows
}
```

**Strokes:** if Look up has a typed search box, give it the same treatment.

## 4. "Weakest 20", not "Weak"

**What's different:** Cards' home buttons read "Random 20 / Weak 2 / Untested 20". The Japanese app says **Weakest 20** for the same idea: the lowest-scoring cards you've been tested on. Change the label to `Weakest`, keeping the count, so it reads "Weakest 2", "Weakest 20". It's set in `refreshHomePoolUI`'s `labels` object and the button's starting HTML.

**Strokes:** check whether it has an equivalent button.

## 5. Settings footer order

**What's different:** the Japanese app has contact line, then data credit, then version, all centred and small. Cards has credit then version. Strokes has version then credit. All three should use:

```
Any problems: Andrew 07973 835165          (12px, var(--accent))
<data credits>                              (11px, var(--text-dim))
v26MMDD.NNN                                 (12px, 600, var(--text-dim))
```

## 6. Contact line in all three

**What to add:** Andrew wants the same contact line in all three. Use the Japanese app's markup, placed just after the share card:

```html
<div style="text-align:center; font-size:12px; color:var(--accent); margin-top:0.75rem;">Any problems: Andrew 07973 835165</div>
```

## 7. "How this app works" and "What's new"

**What the Japanese app has:**
- **Two pages beside `index.html`:** `instructions.html` and `changelog.html`.
- **Two pill links at the top of Settings:** "How this app works →" and "What's new →", both opening in a new tab.
- **A green ⚙ when there's something new.** The steps:
  1. `LATEST_CHANGELOG_ENTRY = '2026-10-18a'` is bumped whenever a changelog entry is added.
  2. The cog gets class `has-update` while `settings.lastSeenChangelog !== LATEST_CHANGELOG_ENTRY`.
  3. Opening Settings sets `lastSeenChangelog` and clears the flag.
  4. CSS: `.settings-btn.has-update { background: var(--green-dim); border-color: var(--green); color: var(--green); }`
- **Add both new pages to `sw.js`'s precache list**, so they work offline.

**The pages:**
- **Instructions:** short and plain. One paragraph per screen or feature, in the same style as the Japanese app's (`publish/instructions.html` in its folder).
- **Changelog:** newest first, dated entries, one line per change users would notice. Start it with today's entry and a brief "what's here" line, not the whole history.

This is the biggest item and the least urgent. It's for classmates more than for Andrew, so it can come last.

---

**Suggested order:**
- **Strokes:** 2 (backup), 1, 5, 6, then 4 if relevant, then 7.
- **Cards:** 3, 4, 5, 6, then 7.

Each item stands alone. Test each at 360px wide in both themes.
