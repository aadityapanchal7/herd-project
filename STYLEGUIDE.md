# Herd Style Guide

This tiny style guide lists the canonical tokens and a few component rules to keep the UI consistent.

## Tokens

- --primary: H S% L% (HSL) — Used by Tailwind semantic colors (e.g. `text-primary`, `bg-primary`). Example: `300 100% 25%`.
- --primary-color: HEX — Canonical hex fallback used for non‑Tailwind or legacy CSS (e.g. map markers). Example: `#800080`.
- --primary-foreground: H S% L% — Preferred text color when placed on `--primary` backgrounds.
- --text-color: HEX — Fallback text color for university buttons.

Other important tokens (defined in `styles/tokens.css`):
- --background, --foreground, --card, --muted, --accent, --destructive
- --border, --input, --ring
- --radius — border-radius base (0.5rem)
- Chart palette: --chart-1 .. --chart-5

Note: The runtime `theme-context` sets both `--primary-color` (hex) and `--primary` (HSL) so Tailwind utilities and legacy CSS both match.

## Component rules

Buttons
- Use the centralized `Button` component in `components/ui/button.tsx`.
- Primary action: `className="university-button"` or `bg-primary`/`text-primary-foreground`.
- Secondary: `bg-white text-foreground border` with subtle shadow.
- Sizes: `sm`, `md`, `lg` via the component; prefer `lg` for hero CTAs.

Cards
- Use rounded corners `rounded-2xl` and `shadow-md` for feature cards.
- Spacing: `p-6` / `p-8` depending on content density.

Typography
- App font: `--app-font` (Manrope) — use bold weights for headings and medium for subheadings.
- Limit hero headings to 1–2 lines. Use `line-clamp` utilities for overflow.

Colors
- Prefer Tailwind tokens that refer to CSS vars, e.g. `text-primary`, `bg-primary`, `border-primary`.
- If you must use the hex color, use `var(--primary-color)` so it stays in sync.

Tokens location
- All tokens are centralized in `styles/tokens.css`. Edit there for global changes.

## When to update tokens
- If a university brand color changes, update the runtime mapping in `context/theme-context.tsx` so both `--primary-color` and `--primary` are updated.

## Adding new components
- Add story-like examples in `/components` with consistent spacing and tokens.
- Use Tailwind utilities and prefer semantic classes that reference tokens instead of hard-coded colors.

That's it — a small guide to keep UI consistent and theming reliable.
