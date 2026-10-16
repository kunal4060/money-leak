# LeakGuard — Design Direction (Oct 2026)

Goal: look like a real, modern, professional SaaS product (Linear / Stripe /
Ramp / Mercury register) — not an AI template. Presentation only: no metric,
data, copy, or route changes.

## Brand idea
A precision instrument for finding lost revenue. "Ledger green" — the color of
account books — as the single accent. Everything else is quiet paper and ink.

## Palette (light, restrained — one accent + tinted neutrals)
- `--paper` #FFFFFF — cards / surfaces
- `--page` #F4F5F3 — page background (sage-tinted, not flat #f5f5f5)
- `--ink` #141A16 — primary text (green-black)
- `--ink-2` #3F4742 — secondary text
- `--muted` #6C7570 — tertiary / captions
- `--line` #E1E6E0 — 1px hairlines
- `--accent` #0C7A55 — deep ledger emerald (custom, NOT Tailwind emerald-500)
- `--accent-deep` #095C42 — accent hover / text-on-light
- `--accent-soft` rgba(12,122,85,.09) — chips, active nav, highlights
- `--danger` #B2402B — muted brick (severity high, negative deltas)
- `--warn` #A4681A — muted amber (severity medium)
- `--low` #5F6E66 — slate-sage (severity low)
- `--forecast` #98A29B — dashed forecast series

Neutrals are tinted toward the accent hue (sage greys) so the page itself
carries the brand. No purple/blue anywhere. No gradients except a whisper-soft
accent tint in one place (the logo tile) — never on buttons, heroes, or cards.

## Typography
- **Display** — Space Grotesk 600/700, tracking −0.02em (H1 −0.03em). H1, H2,
  wordmark, KPI values. Gives the product a voice; Inter-everywhere is the tell.
- **Body** — Inter 400/500/600. Labels, paragraphs, table text.
- **Mono** — JetBrains Mono 400/500 for identifiers (LEAK-001), z-scores,
  eyebrows, code-ish details. Tabular figures everywhere numbers appear.
- Scale: hero 34–40px / section titles 20–22px / body 14px / captions 12px.
  Headings line-height 1.1–1.25, body 1.6.

## Border / shadow / radius system
- Hairlines win: 1px `--line` borders on all cards. Borders, not shadows, do the
  structuring (Vercel/Stripe move).
- Radius: 12px cards, 8px inputs/buttons-small, 999px pills/chips.
- Shadow: one restrained token — `0 1px 2px rgba(20,26,22,.05)` on cards.
  Hover = border darkens to #C9D1C9, NO lift/translate (the floaty hover is a
  template tell). Primary CTA gets the single earned accent treatment.
- Focus rings: `0 0 0 3px var(--accent-soft)`.

## Layout & hierarchy
- Max width 1200px, 4px base spacing scale.
- Sections separated by whitespace, not alternating backgrounds.
- Homepage: compact editorial header (mono micro-label → Space Grotesk H1 →
  proof line → actions), then KPI band, then charts, then flags. The dashboard
  IS the hero — no giant dark gradient banner, no blur orbs, no centered
  cliché.
- KPI cards: kicker (11px, uppercase, muted) → big Space Grotesk value with
  tabular nums → one-line context. Severity-tinted left edge or value color
  only where the number itself is the story (lost revenue in brick).
- Tables (Detect): hairline row dividers, generous 14px row padding, sticky
  header in 11px uppercase muted, row hover = `--accent-soft` wash.

## Data-viz rules
- One accent + neutrals. Actual series: `--accent` 2px line, 8% area fill.
  Forecast: dashed `--forecast`. Never default Recharts categorical colors.
- Donut segments: desaturated categorical set — #0C7A55, #7E8F83, #C08A3E,
  #B2402B. Center total in Space Grotesk.
- Gridlines #ECEFEA, ticks 11px Inter muted. Custom tooltip: white, hairline
  border, mono numbers, no default grey box.
- Up/down semantics use the muted brick/emerald pair, never pure red/green.

## Nav / footer
- Light: translucent paper `#FFFFFFE6` + blur, hairline bottom border.
- Left: logo mark (droplet+seal) + "LeakGuard" in Space Grotesk 600.
- Links: 14px medium, muted; active = `--accent-soft` pill with accent text.
  Inline SVG stroke icons (1.5px), never emoji.
- Footer: hairline top border, 12px muted, one line — no fat multi-column
  marketing footer on a dashboard.

## Motion
- Fast and functional: 150ms ease hovers, subtle fade on first paint only.
- No staggered card cascades, no bouncy entrances. `prefers-reduced-motion`
  disables all of it.

## Iconography
- `components/icons.tsx`: hand-drawn 16px stroke icons (overview grid,
  detect radar, act target-arrow, method doc, upload tray). 1.5px stroke,
  round caps/joins, currentColor. Zero emoji anywhere in UI chrome.

## Logo mark — "the sealed leak"
One idea: a droplet (the leak) with a horizontal seal bar knocked out of it
(the guard). Bold silhouette, two shapes, reads at 16px.
- Nav/header: SVG mark, accent droplet + paper knockout bar, 30px.
- `app/icon.svg`: mark on transparent.
- `app/apple-icon.png`: 180×180, mark centered on solid `--ink` tile.
- `app/favicon.ico`: 16/32/48 from the same master.
Favicon = simplified mark, key element only, 70–80% safe area, high contrast.

## Explicit avoid list
Purple/blue gradients · glassmorphism · emoji-as-icons · glow shadows ·
floating orbs/meteors · centered "unlock the power" hero · Inter everywhere ·
uniform 3-card grids with no hierarchy · diagonal arrows on every link ·
alternating section backgrounds · 5+ competing colors · default chart palettes ·
translate-y hover lifts · skeleton shimmer as decoration (keep for real loads).

## Deliberately unchanged
All metric values, data JSON, honest copy (5-model coin-flip note, synthetic
data disclaimers, upload privacy copy), routes, /api/ai-insights, next.config.mjs
(stays hybrid — no `output: 'export'`).
