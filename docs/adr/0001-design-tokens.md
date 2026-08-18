# ADR 0001 — Design token system & palette

- **Status:** Proposed — 2026-08-18. Ready to lock on review of the swatch (`frontend/design/swatch.html`). Per the map's plan-first preference, this is a decision + artifact to react to, not a final deliverable.
- **Decides:** GitHub Issue #15 (T1 — Design token system & palette)
- **Supersedes:** the runtime Tailwind CDN + per-page `<style>` claymorphism blocks in `frontend/html/`

## Context

The frontend restyle (Wayfinder map, #14) needs a single token foundation before any component work. Today the app leans on a runtime Tailwind CDN and a ~230-line `<style>` block copy-pasted into every page, built on **claymorphism** (nested inset + outer shadows) and a 7-color pastel week that fills whole cards. The pale yellow `#fff6b7` fails WCAG contrast as a full-card background, and the clay shadows read soft/dated rather than the crisp/flat direction the grilling brief calls for. Dark mode does not exist. Targets: crisp/flat, neutral cards + colored day accent, dark mode (system + manual toggle), Inter with a type scale, WCAG AA, desktop-primary with mobile genuinely usable.

## Decision

Adopt a CSS-custom-property token layer as the single source of truth (`frontend/design/tokens.css`), with a swatch reference (`frontend/design/swatch.html`) to react to. The system is:

- **Neutrals — cool slate-navy.** Preserve the existing `#232946` ink identity (distinctive vs generic gray). Full surface/border/text ramps for light and dark; every text token hits AA on its paired surface.
- **Brand/accent — teal.** `#0f766e` (light) / `#2dd4bf` (dark). Already in the brand DNA (the old `.clay-btn` label was `#25636b`), and distinct from all seven day hues. Carries links, focus, active states, and primary actions.
- **7 day accents — the signature.** The rainbow week is the one memorable thing; everything around it stays quiet. The day colors are **never used as text** — only as dot, left bar, and chip fill — which structurally resolves the yellow-contrast problem (yellow is a dot/bar, not text). Solids clear 3:1 on the neutral surface (AA non-text); chip labels use `--day-N-fg` at 4.5:1. The original pale pastels survive as `--day-N-soft` tints for subtle backgrounds with neutral-ink text. Hues keep the original week order (violet→blue→green→amber→orange→rose→indigo).
- **Spacing — 4px base, rem** (root-scaled), `--space-0`…`--space-10`.
- **Radius — crisp, moderate.** Cards cap at `--radius-lg` (12px, matching the old clay corner for continuity); inputs/buttons at `--radius-md` (8px); `--radius-pill` for chips.
- **Typography — Inter, 1.25-modular scale** (caption→display) plus a mono utility face for macro/data columns. Display and headings tighten slightly (`-0.02em`).
- **Elevation — one subtle shadow tier + a border-only option**, replacing all clay inset+outer shadows. A deeper tier is reserved for overlays/modals.
- **Focus ring — 2px teal, 2px surface offset**, `:focus-visible` only, ≥3:1 in both themes.
- **Theming — system by default, manual override wins.** Light on `:root`; dark via `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme='light'])`; forced dark on `:root[data-theme='dark']`. The attribute always wins over the media query, in both directions, so the toggle is symmetric.

## Consequences

- **Positive:** One source of truth for the restyle; AA contrast is guaranteed by construction (day colors-as-non-text, tuned solids, paired fg); dark mode is token-driven, not bolted on; the day identity is preserved as an accent rather than deleted.
- **Negative:** The day palette loses the airy pastel lightness of the original full-card fills — the solids are deeper/saturated to clear AA. The pale pastels remain only as `*-soft` tints. This is an accepted trade for AA compliance and crisp/flat.
- **Follow-ups:** T2 wires these tokens into the compiled Tailwind v4 `@theme` layer and the shared layout; T3 (component catalog) consumes them; later tickets replace the per-page clay `<style>` blocks. Status colors overlap day hues (e.g. amber, emerald) and must stay disambiguated by icon + context.
- **Blocked-by:** none (frontier). **Blocks:** #17 (component catalog).

## Verification

Contrast was checked against target surfaces: teal accent `#0f766e` ≈ 5:1 on white (text/link) and white-on-it ≈ 5:1 (button label); each day solid clears 3:1 on the surface and its `--day-N-fg` clears 4.5:1 on the solid, in both themes. See the swatch page for the live reference.