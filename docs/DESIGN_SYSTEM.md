# Design system

> Documents what the page uses today (tokens in `src/base.html`, components in `src/base-v2.html` and `src/styles.css`). It is a reference, not a redesign. New visual work should reuse these tokens; anything new is added as a numbered `/* vNN */` block at the end of `src/styles.css` (v66 is the latest).

## Brand
- **Name:** Confetti Club (by Tom & Stefanie). The activity is "Squishy DIY"; experiences are Jelly, Crunchy and Duo.
- **Tagline:** "Trending activities for birthday parties & team bonding".
- **Logo:** `public/img/logo.webp` (header), `public/img/icon.png`, social preview `public/img/og.jpg`.
- **Voice:** plain, warm, parent-friendly UK/Singapore English. Short sentences, sentence case, no jargon. Prices like `$16 per child`. Unknown prices say "In your quote"; unagreed partner prices say "Demo price".

## Colour tokens (`:root` in `src/base.html`)
| Token | Value | Use |
|---|---|---|
| `--cobalt` | `#13235f` | Primary brand, headings |
| `--cobalt-600` / `-700` | `#0e1a4a` / `#0b1640` | Hover, dark surfaces |
| `--cobalt-50` / `-100` | `#f6f4f1` / `#e9e5e0` | Warm neutral backgrounds |
| `--ink` / `--ink-2` | `#0b1640` / `#2a3360` | Body text |
| `--muted` | `#5d6480` | Secondary text |
| `--line` / `--line-2` | `#ecebe8` / `#dcd9d4` | Borders |
| `--paper` / `--card` | `#fffefc` / `#ffffff` | Page and card backgrounds |
| `--pink` / `--pink-600` / `--rose` | `#e0284f` / `#c41f43` / `#d92a52` | Primary buttons, accents |
| `--blush` / `--blush-50` | `#ffdfe5` / `#fff1f3` | Soft pink panels |
| `--lemon` / `--lemon-50` / `--yellow` | `#ffc93c` / `#fff4d6` / `#fdb515` | Highlight buttons, offers |
| `--teal` / `--teal-700` / `--teal-50` | `#0aa5ab` / `#077a80` / `#e3f5f5` | Secondary accent |

The dashboard stage colours (🟡 pending, 🟠 ready, 🔵 booked, 🟢 paid, grey lost) are styled in the `/* v60 */` block of `src/styles.css`.

There is no dark mode today.

## Typography
| Token | Stack | Use |
|---|---|---|
| `--display` | DM Serif Display, Georgia, serif | Headlines |
| `--sans` | DM Sans, system-ui | Body, forms, buttons |
| `--fun` | Fredoka, DM Sans | Playful labels |
Loaded from Google Fonts in `src/base.html`.

## Shape, depth, motion, layout
- Radius: `--r-sm 12px`, `--r-md 18px`, `--r-lg 26px`, `--r-xl 34px`.
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg` (cobalt-tinted).
- Easing: `--ease: cubic-bezier(.22,1,.36,1)`. `prefers-reduced-motion` is respected in `src/styles.css`.
- Layout: `--wrap 1240px` max width, `--gut clamp(20px,4vw,48px)` side gutter. Mobile first; check every change on a phone.

## Components in use
| Component | Classes | Notes |
|---|---|---|
| Buttons | `.btn` + `.btn-primary`, `.btn-ghost`, `.btn-lemon`, `.btn-wa` (WhatsApp), size `.btn-xl` | Minimum height 46px |
| Section intro | `.eyebrow`, `.lead` | |
| Form field | `.field` (label wraps input), `.form-error` with `role="alert"` | Server sends the field name with errors |
| Pill / tag | `.pill`, `ss-pill` (store sheet) | "Sample listing" pill style exists |
| Partner store sheet | `ss-*` (`ss-hero`, `ss-logo`, `ss-gallery`, palette) | Opened by `openStore()` in `src/app.js` |
| Accordion (FAQ) | `<details class="acc">` | Also feeds the FAQ structured data |
| Icons | inline SVG sprite, `<svg class="icon"><use href="#i-…"/></svg>`, 29 symbols | Decorative icons get `aria-hidden="true"` |
| Dashboard | `ad-*` classes, booking tiles (`v62`–`v64`) | |

## Photos
- Embedded at build time: `src/img/` (hero, experience photos, avatar).
- Loaded as files: `public/img/` (`how/`, `making/`, `events/`, `cakes/`, `bloom/`, `jsquare/`, `partypainters/`, `butter/`, `store.jpg`).
- Partner photos and logos must have the partner's permission (**Needs owner approval**: see [PRD 03](prds/03-partner-vendor-storefronts.md)). Event photos and reviews must be real.

## Accessibility basics already followed
Skip-friendly semantic landmarks (`<main id="main">`), labelled fields, `role="alert"` errors, `aria-label` on navigation, reduced motion. Proposed: an automated accessibility check in CI (not set up).
