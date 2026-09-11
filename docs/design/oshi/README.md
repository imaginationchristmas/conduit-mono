# Oshi Design Direction

Oshi is a named design direction for a Conduit surface, built alongside the
existing Night Market / Day Market themes (not replacing them). This folder is
the source of truth for its base decisions while the direction is being
explored. Nothing here is wired into production tokens yet.

> **PRODUCTION BOUNDARY — READ FIRST**
>
> Do NOT edit production code for Oshi work. This includes:
>
> - `packages/ui/**` (tokens, theme.css, typography.css, components)
> - `apps/market/src/**`, `apps/merchant/src/**`, `apps/store-builder/src/**`
> - `docs/DESIGN.md` and other shared docs describing the production system
>
> All Oshi changes belong ONLY in:
>
> - `apps/market/design-study/**` (the live study surface)
> - `docs/design/oshi/**` (this reference folder)
>
> Production promotion happens later, only after the design direction is
> explicitly approved — and then as its own reviewed change.

## Base References

| Doc                              | Contents                                                      |
| -------------------------------- | ------------------------------------------------------------- |
| [`palette.md`](palette.md)       | 5-color base palette (hex + HSL) and draft token-role mapping |
| [`typography.md`](typography.md) | Typeface decision, role mapping, Swiss-scale notes            |

## Typographic System: Swiss Style

The Oshi direction applies the **Swiss typographic hierarchy** skill at
`.agents/skills/swiss-typography/` (name: `swiss-typographic-hierarchy`).
Agents should load that skill when implementing Oshi surfaces; it provides the
grid system, modular type scale, baseline rhythm, and a token generator
(`scripts/generate_tokens.py`).

Key commitments adopted from the skill:

- Layout locks to a grid; hierarchy comes from size, weight, spacing, and
  position — never ornament.
- Every vertical measurement is a multiple of one baseline unit (8px default).
- Cap active type sizes to 3–4 per view; flush-left, ragged-right.
- Generate the type scale with the skill's script rather than hand-deriving:

  ```sh
  python3 .agents/skills/swiss-typography/scripts/generate_tokens.py \
    --columns 12 --gutter 24 --margin 48 --baseline 8 --base 16 --ratio 1.25 \
    --min-step -1 --max-step 5
  ```

## Motion Standard

Oshi uses the **transitions.dev "icon swap" recipe (#09)** as its standard
button/control animation, applied in the study's theme toggle and intended as
the consistent pattern for other Oshi controls:

- 250ms (`--icon-swap-dur`), `ease-in-out`, symmetric in both directions.
- Outgoing state fades out with a 2px blur and scale-from-0.25; incoming
  state fades in to full opacity, blur 0, scale 1.
- Pure CSS driven by `data-state` attributes; no JS orchestration.
- Always keep the `prefers-reduced-motion: reduce` guard.

Reference: `.agents/skills/transitions-dev/09-icon-swap.md`. The working
implementation is the theme toggle in
`apps/market/design-study/src/StudyThemeToggle.tsx` +
`study.css` (`.study-icon-swap`).

## How The Pieces Fit

- **Typeface**: Bricolage Grotesque (SIL OFL, shared `typography.css`) fills
  the grotesque family role. Neue Montreal was planned but reverted: it is
  commercially licensed and cannot be committed to this public repository.
  See [`typography.md`](typography.md).
- **Palette**: the five base colors map onto Conduit's primitive token roles
  (`primary`, `secondary`, `neutral`, plus teal/olive) per
  [`palette.md`](palette.md). Semantic status colors stay on the shared system.
- **Tokens**: when built, Oshi becomes a named theme (`data-theme="oshi"`) in
  `packages/ui/src/styles/theme.css` plus a registered entry in
  `packages/ui/src/theme/definitions.ts`, following the existing Night/Day
  pattern. Swiss grid/scale tokens land in the Oshi theme scope or a
  study-scoped CSS file, not the shared production defaults.

## Build Order (planned, design-study scope first)

Per the design-study rules, all Oshi experimentation stays inside
`apps/market/design-study/`; production tokens and shared packages stay
untouched until a direction is approved.

1. Assign the palette colors to token roles and generate 11-level scales
   around each anchor (see notes in [`palette.md`](palette.md)).
2. Apply the Swiss grid/type-scale token block inside the study's `study.css`
   (done: study-scoped typography on the shared Bricolage Grotesque family,
   with the 1.250 scale and 8px baseline rhythm).
3. Prototype and iterate on the design study surface.
4. Only after approval: register the `oshi` theme ID, add its `data-theme`
   block in `packages/ui/src/styles/theme.css`, and promote typography into
   the shared system.

## Licensing Note

Neue Montreal is a commercial typeface and was removed from the repository for
this reason; the study runs on OFL-licensed Bricolage Grotesque. Do not commit
font files without a license that explicitly covers redistribution. See
[`typography.md`](typography.md).
