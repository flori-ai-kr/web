---
name: design-system
description: Flori admin design system — token (globals.css) → Pencil variable mapping, fonts, icon library, and component conventions for Code↔Design migrations. Load this first in code-to-design / design-to-code runs.
---

# Flori Admin Design System

Token mapping and conventions for Code ↔ Pencil(.pen) migrations of the **flori** flower-shop admin.
Source of truth: `src/app/globals.css` `:root` (admin "Rose" reskin, 2026-05-26) + Tailwind v4.

## Token Architecture (3-tier)

`src/app/globals.css` is the single source of truth. Pencil mirrors it: the
primitive/status/type tokens are now registered as Pencil variables
(`rose-50…900`, `neutral-50…900`, `success`/`warning`/`info`/`danger` each with
`-foreground`/`-soft`, `text-display…text-caption`) and a visual **"Tokens"**
swatch/scale reference sheet exists in the Design System region as top-level frame
`XbifJ` (x:0, y:3300, below `SHygj`). Status colors carry `U:Mode` Light/Dark
theme values; `text-caption` is the float `11.5`. NOTE: themed color vars must
include an explicit `{theme:{U:Mode:"Light"}}` entry — a bare default alone is
dropped by `set_variables` when a Dark entry is present (renders black otherwise).

**Principle:** primitive → semantic → component.
- **Tier 1 (primitives):** raw, perceptually graded scales. Components MUST NOT
  reference these directly.
- **Tier 2 (semantic):** the shadcn-style vars (`--background`, `--foreground`,
  `--brand`, `--border`, status, …). Components consume ONLY these.
- **Tier 3 (components):** Tailwind utilities / classes that map to semantic tokens.
- **Dark mode** overrides the SAME semantic token names in `.dark` — it never
  re-derives primitives. No hardcoded hex in components.

### Tier 1 — Primitive color scales (`:root`)

- **Rose** `--rose-50…--rose-900` — brand hue. Anchored: `--rose-600 = #A85475`
  (= `--brand`), `--rose-50 = #FBEFF3` (= `--brand-muted`).
- **Neutral (warm stone)** `--neutral-50…--neutral-900` — anchored:
  `50 ≈ #FBF8F3` (paper / `--background`), `200 = #ECE3DD` (= `--border`),
  `500 = #9E8F89` (= `--muted-foreground`), `900 = #241F22` (= `--foreground`).

### Tier 2 — Semantic status tokens (`:root` + `.dark` + `@theme inline`)

`--success` / `--warning` / `--info` / `--danger`, each with `-foreground` and
`-soft` (bg tint). Wired in `@theme inline` as `--color-success` etc., so
`bg-success`, `text-success-foreground`, `bg-success-soft` Tailwind utilities work.
Danger fills may still use the existing `--destructive (#E5484D)`; `--danger
(#C42B30)` is the AA-legible text variant. Light bases verified WCAG AA on cream
(`#FBF8F3`): success 4.83, warning 4.74, info 5.12, danger 5.31; white-on-fill and
base-on-soft also ≥4.5. Dark variants are brighter (AA ≥5.7 on `#1C1819`).

### Typography scale

Role → size/line-height vars in `:root`: `--text-display` 36/1.05, `--text-h1`
28/1.1, `--text-h2` 22/1.15, `--text-h3` 18/1.25, `--text-body` 15/1.55,
`--text-label` 13/1.4, `--text-caption` 11.5/1.4 (each paired with `--leading-*`).
Family map: display + h1/h2/h3 = Cormorant (`--font-serif`) where serif headings
are used; body/label/caption = Pretendard (`--font-sans`).

### Spacing

Use Tailwind v4's built-in 4pt scale (`p-1` = 4px, `gap-4` = 16px, …). No
redundant spacing vars, no arbitrary values like `p-[13px]`.

## Pencil document

- Canonical .pen path: `.moai/design/flori-admin.pen` (repo-tracked; user may need to Save manually in the Pencil app the first time).
- The `/pencil-welcome-desktop.pen` welcome file has a rich shadcn-style component kit, but components **cannot be referenced across files** — build flori screens with primitive frame/text/icon_font nodes + token variables instead, or copy components in.

## Design tokens → Pencil variables

Set via `set_variables`. Reference in batch_design as `"$name"` (e.g. `fill:"$brand"`).
Values are the verified post-Rose-reskin `:root` values.

| Pencil var | Hex | globals.css token | Usage |
|---|---|---|---|
| `background` | `#FBF8F3` | `--background` | page / screen bg (warm cream) |
| `foreground` | `#241F22` | `--foreground` | primary text / ink |
| `card` | `#FFFFFF` | `--card` | card surfaces |
| `brand` | `#A85475` | `--brand` | dusty rose — buttons, active, accent icons, text links (WCAG AA) |
| `brand-foreground` | `#FFFFFF` | `--brand-foreground` | text/icon on brand |
| `brand-muted` | `#FBEFF3` | `--brand-muted` | soft rose tint surface |
| `secondary`/`muted`/`accent` | `#F3ECE6` | `--muted` | muted surfaces, active nav bg, icon boxes |
| `muted-foreground` | `#9E8F89` | `--muted-foreground` | secondary/caption text |
| `border` | `#ECE3DD` | `--border` / `--input` | hairlines, card strokes |
| `ring` | `#A85475` | `--ring` | focus ring (= brand) |
| `destructive` | `#E5484D` | `--destructive` | negative net profit, 지출 bars |
| `neutral` | `#A09080` | `--sage` | warm taupe neutral (formerly sage; NO green) |
| `neutral-muted` | `#F2EDE8` | `--sage-muted` | warm light hairline |
| `sidebar` | `#FFFFFF` | `--sidebar` | sidebar bg |
| `sidebar-foreground` | `#6B5F5C` | `--sidebar-foreground` | |
| `sidebar-border` | `#ECE3DD` | `--sidebar-border` | |
| `chart-1` | `#A85475` | `--chart-1` | rose peak / chart accent |
| `chart-2..5` | `#241F22` @ 55/38/22/12% | `--chart-2..5` | monochrome ink opacity ladder |
| `radius` / `radius-sm` / `radius-md` | 12 / 8 / 10 | `--radius` 0.75rem | card xl→12, lg→12, md→10, sm→8 |

Bar fill alpha colors (BarList `barColor` per card, 8-digit hex):
- 카테고리별 = `bg-brand/60` → `#A8547599`
- 결제방식별 = `bg-foreground/20` → `#241F2233`
- 예약채널별 = `bg-brand/40` → `#A8547566`
- 지출 카테고리 = `bg-destructive/30` → `#E5484D4D`
- Status/reservation badge = `${color}20` bg + `color` text (e.g. brand `#A8547520`).

## Fonts

- Sans body = **Pretendard** (`--font-sans`). NOTE: Pretendard is NOT a built-in Pencil font — set `fontFamily:"Pretendard"` for intent, but the Pencil canvas falls back to a default sans. Cosmetic-only; ignore the "Font family 'Pretendard' is invalid" warning.
- Display/serif = **Cormorant Garamond** (`--font-serif`, via `--font-cormorant`). Renders correctly in Pencil. Used for the "Flori" wordmark + the large `대시보드`/page headings (`font-serif`).
- Mono = `ui-monospace` (tabular nums use `tabular-nums` class in code).

## Icons

- Library: **lucide-react** → Pencil `iconFontFamily:"lucide"`, `iconFontName:"kebab-case"` (e.g. `layout-dashboard`, `calendar-days`, `receipt`, `wallet`, `users`, `image`, `trending-up`, `sparkles`, `heart`, `flower-2`, `shopping-bag`, `arrow-up-right`, `chevron-down`, `chevrons-left`, `user-plus`, `user-check`). Always set `width`+`height` on `icon_font`.

## Tailwind → Pencil quick notes (this project)

- `space-y-6` container = vertical layout `gap:24`. KPI/grid `gap-4` = `gap:16`. AppLayout content `padding:24`.
- Sidebar width `w-60` = 240; collapsed `w-16` = 64. Logo bar `h-14` = 56.
- Cards: `rounded-xl` body, `border border-border`, `CardContent` `p-4` = padding 16.
- BarList track = `h-1.5 bg-muted rounded-full` (height 6, radius 3) with an inner fill rectangle whose **fixed pixel width = percentage** of usable track width (~265px in a half-grid card). Set track `justifyContent:"start"` + `clip:true`; do NOT use a spacer pad (it inverts the bar).
- Amounts use 만원 unit (project standard), `formatCurrency`.

## Dashboard screen structure (code = source of truth)

`src/app/(admin)/admin/dashboard-client.tsx` renders, top→bottom:
1. Header: `대시보드` (serif 24/600) + date subtitle + month `<Select>` chip (right).
2. KPI row: 4 cards — 오늘 매출 / {월} 매출 / {월} 지출 / 순이익(+"매출 - 지출").
3. Two-column (`lg:grid-cols-2`): 다가오는 예약 (calendar-days icon, status badges, paged) + 최근 매출 (arrow-up-right icon, date·category·payment·amount rows).
4. Monthly analysis: title `{월} 분석` + subtitle; 3 customer cards (구매 고객/첫 방문/다시 온 고객, icon box + value); 2×2 analysis cards (카테고리별/결제방식별/예약채널별 매출 + 지출 카테고리) each a shopping-bag titled BarList.

NOT in code (do not add): "Flori AI 브리핑" card, gamification/"성장 기록" widgets, a separate daily-sales bar chart — these live only in HTML mockups.

## Component Library (in flori-admin.pen)

The shadcn UI kit is **imported** into `flori-admin.pen` (88 reusable components, prefix `U:`). Reuse these via `ref` instances instead of rebuilding primitives.

Key shadcn component IDs:

- Button/Default `U:VSnC2` (root fill `$U:--primary`, label `U:8tnXG`, icon `U:WNalu`) · Outline `U:C10zH` (label `U:poRwU`, icon `U:HDFDp`) · Secondary `U:e8v1X` · Ghost `U:3f2VW` · Destructive `U:YKnjc`
- Badge/Default `U:UjXug` (label `U:zHpCv`) · Secondary `U:WuUMk` · Destructive `U:YvyLD` · Outline `U:3IiAS`
- Card `U:pcGlv` (Header `U:CgJv7` / Content `U:frWPV` / Actions `U:bvhSM` slots) · Card Plain `U:fpgbn` · Card Image `U:JENPq`
- Sidebar `U:PV1ln` · Sidebar Item/Active `U:qCCo8` (icon `U:r6B2W`, label `U:0Ru22`, chevron `U:VHWXO`) · Default `U:jBcUh` · Section Title `U:24cM4`
- Input `U:fEUdI` · Select Group `U:w5c1O` · Tabs `U:PbofX` (Tab Item Active `U:coMmv` / Inactive `U:QY0Ka`) · Dialog `U:OtykB` · Table `U:bG7YL` · Data Table `U:shadcnDataTable` · Pagination `U:U5noB`

### Rose re-theme — IMPORTANT LIMITATION

The shadcn `U:--*` variables (`U:--primary`, `U:--card`, `U:--border`, `U:--background`, `U:--ring`, `U:--accent`, etc.) are **imported from the bundled `pencil:shadcn.lib.pen` library and CANNOT be overridden** via `set_variables` (errors: "Cannot change … imported variable"). They keep shadcn's default neutral/cream-gray palette (e.g. `U:--primary` = `#171717`, `U:--card` = `#fafafa`).

**Workaround = per-instance `fill` overrides** pointing at the flori-local vars. When dropping a shadcn instance, override its fills to the rose palette:
- Button/Default → `U(inst,{fill:"$brand"})`, label+icon → `fill:"$brand-foreground"`
- Button/Outline → `U(inst,{fill:"$card", stroke:{align:"inside",fill:"$border",thickness:1}})`, label+icon → `fill:"$foreground"`
- Badge/Default → `fill:"$brand"`, label → `fill:"$brand-foreground"`
- Card → `U(inst,{fill:"$card", stroke:{align:"inside",fill:"$border",thickness:1}})`
- Sidebar Item/Active → `fill:"$brand-muted"`, icon+label+chevron → `fill:"$brand"`; Default → icon+label `fill:"$sidebar-foreground"`

(Local rose vars `brand`/`brand-foreground`/`brand-muted`/`card`/`border`/`muted`/`muted-foreground`/`foreground`/`sidebar-foreground` are the correct, settable namespace — see token table above.)

### Flori molecules (shadcn lacks these)

Built `reusable:true` in the "Design System" region (top-level frame `SHygj` at x:0,y:1620 — below the Dashboard screen, no screen overlap). Styled with flori-local rose vars:

- **KPI Card** `VmwD5` — label (`muted-foreground` 12) + big value (`foreground` 24/700) + 만원/건 unit + rose delta line (`arrow-up-right` icon + text in `$brand`). Matches dashboard KPI cards.
- **List Row** `EgepL` — left: category badge (`#A8547540` bg / `$brand` text) + payment badge (`$muted` bg / `$muted-foreground`) + customer name; right: amount (`foreground` 14/600). Sub line below. Matches SalesList/ExpensesList rows.
- **Section Header** `CX6dS` — title (`foreground` 14/600) + `fill_container` hairline divider (`$border` 1px) + right meta (`muted-foreground` 12). Matches SalesList group headers.

Reuse with `I(parent,{type:"ref",ref:"VmwD5"})` then `U(inst+"/<childId>",{content:...})`.
