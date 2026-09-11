# Oshi Base Palette

Reference palette for the Oshi design direction. Source: artboard
`01 - Artboard 1` (5-color hex set). Stored here so the values can be assigned
to token roles and surfaces later. Nothing in this file is wired into
production tokens yet.

## Colors

| Swatch                               | Hex       | HSL                  | Working name |
| ------------------------------------ | --------- | -------------------- | ------------ |
| <span style="color:#9A72AA">■</span> | `#9A72AA` | `hsl(283, 25%, 56%)` | Purple       |
| <span style="color:#F15A30">■</span> | `#F15A30` | `hsl(13, 87%, 57%)`  | Orange       |
| <span style="color:#B6BFC1">■</span> | `#B6BFC1` | `hsl(191, 8%, 74%)`  | Gray         |
| <span style="color:#62C6BF">■</span> | `#62C6BF` | `hsl(176, 47%, 58%)` | Teal         |
| <span style="color:#8B835B">■</span> | `#8B835B` | `hsl(50, 21%, 45%)`  | Olive        |

## Source Values (hex)

```text
9A72AA
F15A30
B6BFC1
62C6BF
8B835B
```

## Suggested Role Mapping (draft, not applied)

How these could map onto the existing Conduit primitive palettes in
`packages/ui/src/styles/theme.css` when the Oshi theme is built:

| Screenshot color | Candidate token role                                | Current Night/Day value it would sit alongside |
| ---------------- | --------------------------------------------------- | ---------------------------------------------- |
| `#9A72AA` Purple | `primary-*`                                         | `hsl(280, 94%, ...)` vivid purple              |
| `#F15A30` Orange | `secondary-*`                                       | `hsl(24, 77%, ...)` orange                     |
| `#B6BFC1` Gray   | `neutral-*`                                         | `hsl(220, 10%, ...)` cool gray                 |
| `#62C6BF` Teal   | new palette (e.g. `teal-*`) or `tertiary-*` variant | rose `hsl(338, 54%, ...)`                      |
| `#8B835B` Olive  | new palette (e.g. `olive-*`) or `accent-*` variant  | indigo `hsl(255, 67%, ...)`                    |

Notes:

- All five values are mid-lightness (45-74% L), so tint/shade steps for the
  11-level scales (`50`-`950`) would need to be generated around each anchor.
- The gray (`#B6BFC1`) is noticeably cooler and lighter than the current
  neutral scale; if adopted it would change surface/border semantics, not just
  an accent.
- The HSL columns are conversions for the HSL-based token format used in
  `theme.css`; the hex values are the source of truth.
