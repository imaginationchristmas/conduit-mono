# Oshi Typography

> **Status: reverted to Bricolage Grotesque.** The Oshi direction originally
> planned **Neue Montreal** (PP Neue Montreal, Pangram Pangram) as its
> typeface. That typeface is commercially licensed, and this repository is
> public — committing the `.otf` files (or a build that embeds them) is not
> permitted without a license covering redistribution. The font files have
> been removed from this folder and the study no longer declares any
> `@font-face` rules.

## Current Typeface

The design study uses the shared **Bricolage Grotesque** family (SIL OFL
licensed), loaded by `packages/ui/src/styles/typography.css`. The study's
`study.css` consumes the shared role tokens (`--font-display`, `--font-heading`,
`--font-body`, `--font-mono`) and applies the Swiss scale on top of them — no
font files ship with the study.

## Role Mapping (unchanged, now on Bricolage Grotesque)

| Role             | Font                                 | Notes                                                |
| ---------------- | ------------------------------------ | ---------------------------------------------------- |
| `--font-display` | Bricolage Grotesque (Light)          | Large display moments                                |
| `--font-heading` | Bricolage Grotesque (Bold)           | Section titles and card titles                       |
| `--font-body`    | Bricolage Grotesque (Regular/Medium) | Paragraphs, forms, general UI copy                   |
| `--font-mono`    | unchanged (system mono)              | Pubkeys, IDs, invoice references, technical metadata |

## What Survived the Revert

The Swiss typographic system is font-independent and remains in the study:

- Modular type scale on a 1.250 major third (`--step--1` … `--step-5`, 16px
  base) applied via `font-size: var(--step-*)` — not via font choice.
- 8px baseline rhythm for line heights and vertical spacing.
- Hierarchy through size, weight, spacing, and position only.

## If Neue Montreal Comes Back

Revisit only when there is a license that explicitly covers repository
distribution and web/app embedding. At that point:

1. Add the `.otf` files back under this folder and document their weights here.
2. Declare study-scoped `@font-face` rules inside
   `apps/market/design-study/src/study.css` (never in shared production CSS).
3. Record the licensing decision in this file before wiring anything.
