# Icon Assets — replacing the emoji with real artwork

The app currently renders several **colorful emoji** as icons. They look inconsistent across
OS/browser and read as "AI slop". This doc lists the ones worth replacing with custom artwork, gives
a ready-to-paste **Gemini** prompt for each, and says exactly **where to put the file** and **what to
name it**.

> When the images are in the folder, tell me — I'll wire them into the code (swap the emoji for `<img>`).

---

## Where the files go

- **Folder:** `app/src/assets/icons/`  (create it; same place as `logo.jpg`)
- **Format:** PNG, **transparent background**, square **1:1**, **1024×1024** (shown at 22–40px, so
  high-res keeps it crisp on retina)
- **Naming:** use the exact kebab-case filename in the table below — the code import depends on it.

---

## Which icons to replace

| Current | Where it shows | New filename | What to draw |
|---|---|---|---|
| 💼 | Challenge tile — *Job Application Screening* | `challenge-job.png` | a slim briefcase |
| 🎓 | Challenge tile — *Statement of Purpose* | `challenge-sop.png` | a graduation mortarboard cap |
| 🖊️ | Challenge tile — *Sell Me This Pen* | `challenge-pen.png` | an elegant fountain pen |
| ⚖ | "Submit to the Court" button + Docket rulings | `icon-verdict.png` | balanced justice scales |
| ⏳ | Season banner — countdown to next season | `icon-season.png` | an hourglass |
| 🔁 | Season banner + Inspector — "advance / recalibrate" | `icon-recalibrate.png` | two circular arrows (refresh loop) |
| 🔒 | Soulbound credential (Landing, Verify, Card) | `icon-soulbound.png` | a closed padlock with keyhole |

### Keep as-is (do **not** make images)
`→` `↗` `✓` `✗` `✦` `▲` — these are monochrome **typographic glyphs**. They already inherit the
theme color, scale with the font, and look clean. Turning them into raster images would look *worse*.

---

## Shared visual style (already baked into every prompt below)

So the set feels cohesive, every prompt uses the same look, matched to the app palette:

- **Aesthetic:** minimalist engraved line-art, like a premium legal wax-seal / banknote engraving
- **Color:** warm metallic **gold** — base `#e9c46a`, highlight `#fbe7a8`, shadow `#9c7a2e`
- **Stroke:** thin, uniform (~3–4% of canvas), rounded joins; flat **2D vector**, *not* 3D, *not* photorealistic
- **Background:** transparent
- **No** text, letters, numbers, or drop shadows
- Centered, bold/simple enough to read clearly at 24px

---

## Gemini prompts (copy one block at a time)

> Tool: **Google AI Studio → Imagen**, or the **Gemini app image generation ("Nano Banana")**.
> Set aspect ratio **1:1**. If your model can't output transparency, see *Transparency* below.

**1. `challenge-job.png`**
```
A single minimalist icon of a slim professional briefcase with a handle and one clasp, centered.
Engraved gold line-art in the style of a premium legal wax seal / banknote engraving. Warm metallic
gold, base #e9c46a with #fbe7a8 highlights and #9c7a2e shadows, thin uniform strokes, rounded joins,
flat 2D vector (not 3D, not photorealistic). Transparent background, no text, no drop shadow,
perfectly centered, crisp edges, 1024x1024.
```

**2. `challenge-sop.png`**
```
A single minimalist icon of a graduation mortarboard cap with a hanging tassel, centered. Engraved
gold line-art in the style of a premium legal wax seal / banknote engraving. Warm metallic gold, base
#e9c46a with #fbe7a8 highlights and #9c7a2e shadows, thin uniform strokes, rounded joins, flat 2D
vector (not 3D, not photorealistic). Transparent background, no text, no drop shadow, perfectly
centered, crisp edges, 1024x1024.
```

**3. `challenge-pen.png`**
```
A single minimalist icon of an elegant fountain pen shown at a slight diagonal, with a visible nib,
centered. Engraved gold line-art in the style of a premium legal wax seal / banknote engraving. Warm
metallic gold, base #e9c46a with #fbe7a8 highlights and #9c7a2e shadows, thin uniform strokes, rounded
joins, flat 2D vector (not 3D, not photorealistic). Transparent background, no text, no drop shadow,
perfectly centered, crisp edges, 1024x1024.
```

**4. `icon-verdict.png`**
```
A single minimalist icon of a perfectly balanced two-pan justice scale (libra / balance), symmetrical,
with thin elegant arms and a central beam, centered. Engraved gold line-art in the style of a premium
legal wax seal / banknote engraving. Warm metallic gold, base #e9c46a with #fbe7a8 highlights and
#9c7a2e shadows, thin uniform strokes, rounded joins, flat 2D vector (not 3D, not photorealistic).
Transparent background, no text, no drop shadow, perfectly centered, crisp edges, 1024x1024.
```

**5. `icon-season.png`**
```
A single minimalist icon of an elegant hourglass with sand inside a slim frame, centered. Engraved
gold line-art in the style of a premium legal wax seal / banknote engraving. Warm metallic gold, base
#e9c46a with #fbe7a8 highlights and #9c7a2e shadows, thin uniform strokes, rounded joins, flat 2D
vector (not 3D, not photorealistic). Transparent background, no text, no drop shadow, perfectly
centered, crisp edges, 1024x1024.
```

**6. `icon-recalibrate.png`**
```
A single minimalist icon of two arrows curving into a clockwise circular refresh / cycle loop,
centered. Engraved gold line-art in the style of a premium legal wax seal / banknote engraving. Warm
metallic gold, base #e9c46a with #fbe7a8 highlights and #9c7a2e shadows, thin uniform strokes, rounded
joins, flat 2D vector (not 3D, not photorealistic). Transparent background, no text, no drop shadow,
perfectly centered, crisp edges, 1024x1024.
```

**7. `icon-soulbound.png`**
```
A single minimalist icon of a closed padlock with a solid shackle and a small keyhole, symbolizing a
non-transferable soulbound credential, centered. Engraved gold line-art in the style of a premium
legal wax seal / banknote engraving. Warm metallic gold, base #e9c46a with #fbe7a8 highlights and
#9c7a2e shadows, thin uniform strokes, rounded joins, flat 2D vector (not 3D, not photorealistic).
Transparent background, no text, no drop shadow, perfectly centered, crisp edges, 1024x1024.
```

---

## Transparency (important)

Imagen sometimes ignores "transparent background". If a generated icon has a background:

- **Easiest:** add this to the prompt — *"isolated on a solid flat #0a0c10 background"*. That's the
  app's exact obsidian background color, so an opaque PNG still blends into the dark UI in most spots.
  (Caveat: the round brand **seal** needs true transparency — for those, remove the background.)
- **Remove the background:** drop the PNG into remove.bg, Photopea (Magic Cut), or ask Gemini
  *"make the background transparent"* on the generated image.

## Tips for a cohesive set

- Generate all 7 in **one session** with the same style wording so stroke weight and gold tone match.
- Keep shapes **bold and simple** — they're displayed small.
- Re-roll any icon that comes out 3D, glossy, or photographic; we want flat engraved line-art.

---

## After the files are in `app/src/assets/icons/`

Ping me and I'll wire them up:
- **Challenge icons** → `app/src/contracts.ts` (`icon` field) + the tile renderer in
  `components/ChallengePicker.tsx`, swapping `{c.icon}` for an `<img>`.
- **Functional icons** (`verdict`, `season`, `recalibrate`, `soulbound`) → replace the inline emoji in
  `SubmitPanel.tsx`, `SeasonBanner.tsx`, `InspectorPanel.tsx`, `Docket.tsx`, `VerifyPanel.tsx`,
  `CredentialCard.tsx`, `Landing.tsx`.

I'll also add a tiny `<Icon>` helper so sizing/color stays consistent, same pattern as `Seal.tsx`.
