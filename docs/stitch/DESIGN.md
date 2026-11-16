---
name: Industrial Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#5c3f41'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#916e71'
  outline-variant: '#e5bdbf'
  surface-tint: '#be003e'
  primary: '#b9003c'
  on-primary: '#ffffff'
  primary-container: '#e50f4e'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb2b8'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#006947'
  on-tertiary: '#ffffff'
  tertiary-container: '#00855b'
  on-tertiary-container: '#f5fff6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdadb'
  primary-fixed-dim: '#ffb2b8'
  on-primary-fixed: '#40000f'
  on-primary-fixed-variant: '#91002d'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  title-lg:
    fontFamily: Montserrat
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system delivers an enterprise-grade luxury heavy machinery aesthetic, evoking the uncompromising precision, endurance, and engineering strength of multi-megawatt industrial infrastructure. Built for high-volume equipment rental orchestration, logistics directors, and site telemetry engineers, the UI balances mission-critical clarity with high-end modern SaaS polish.

The style fuses **Precision Minimalism** with **Industrial Tactility**:
- Crisp, hyper-legible surfaces avoid ornamental clutter in favor of high visual density and immediate operational awareness.
- 45-degree chamfered engineering accents on badges, metric anchors, and high-impact key indicators evoke machined steel plates and heavy-duty control consoles.
- High-contrast structural framing with hairline borders provides structural integrity across complex data tables, fleet dispatch maps, and live telemetry feeds.
- The interface feels solid, authoritative, and responsive—engineered for continuous operational control.

## Colors

The color architecture creates stark hierarchy between mission-critical operational states, physical equipment status, and deep structural surfaces.

- **Primary (`#ED1A53` - Electric Crimson):** Reserved exclusively for primary actions, dispatch triggers, high-priority emergency alerts, active tab indicators, and critical load thresholds. Never diluted for background tinting without deep contrast.
- **Secondary (`#1E293B` - Industrial Titanium):** Anchor for navigation panels, commanding header elements, master action bars, and secondary structural interfaces.
- **Tertiary (`#10B981` - Emerald Power):** Dedicated asset-readiness indicator representing "On-Line", "Available for Deployment", and healthy runtime telemetry.
- **Warning Accent (`#F59E0B` - Amber Gold):** Dedicated asset maintenance status, pending inspections, scheduled decommissions, and telemetry warnings.
- **Neutrals & Surfaces:**
  - Base canvas: `#F8FAFC` (Cool Slate Backdrop)
  - Card & Container Surface: `#FFFFFF` (Crisp Titanium White)
  - Dark Surface / Nav Frame: `#0B0F17` to `#0F172A` (Clean Dark Steel)
  - Hairline Borders & Structural Dividers: `#E2E8F0`
  - High-density data grid stroke: `#CBD5E1`

## Typography

Typography establishes an authoritative split between technical structural data and high-visibility executive headings:

- **Headlines & Metric Callouts:** Rendered in **Montserrat** to provide architectural weight, structural authority, and precise industrial geometry. Uppercase styling with expanded tracking (`0.06em`) is applied to top-level section labels and system status headers.
- **Body & Data Grid:** Rendered in **Inter** for uncompromising legibility at micro-scales.
- **Tabular Numerals:** All numeric metric displays, generator kW/kVA output readouts, telemetry gauges, and financial tables must enforce `font-feature-settings: "tnum" 1` to guarantee vertical column alignment across live-updating data feeds.

## Layout & Spacing

The layout model is anchored on an enterprise 12-column responsive fluid grid designed to display multi-pane telemetry, dispatch queues, and heavy asset manifests simultaneously without structural breakage.

- **Desktop (>= 1280px):** 12-column fluid grid, `2rem` (32px) margins, `1.5rem` (24px) gutters. Sidebars and fleet control consoles are docked with persistent visibility.
- **Tablet (768px - 1279px):** 8-column grid, `1.5rem` (24px) margins, `1rem` (16px) gutters. Complex data tables default to horizontal scroll containers with frozen primary ID columns.
- **Mobile (< 768px):** 4-column fluid grid, `1rem` (16px) margins, `0.75rem` (12px) gutters. Side navigation collapses into an off-canvas drawer; metric cards convert to single-column vertical stacks.
- **Layout Rhythm:** Dense interior component spacing (`0.25rem` to `0.5rem`) keeps data visible above the fold, balanced with generous canvas section margins (`2rem` to `2.5rem`) to prevent operator cognitive fatigue.

## Elevation & Depth

This design system avoids decorative blurred dropshadows. Depth is derived from structural precision, razor hairline borders, and layered slate containers.

- **Flat Precision Foundation:** All primary workspace containers and panels sit at elevation 0 on `#F8FAFC` utilizing a 1px solid hairline border (`#E2E8F0`).
- **Surface Elevation (Cards & Panels):** Elevated cards use `#FFFFFF` background with a subtle ambient structural shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`, bounded by a 1px border of `#E2E8F0`.
- **Floating Overlays & Drawers (Elevation 2):** Fleet dispatch maps, context menus, and sliding asset spec panels use `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)` combined with `#0F172A` 10% opacity backdrop tinting.
- **Active State Highlights:** Focus and selection are indicated through a crisp 1px stroke of `#ED1A53` paired with an outer non-diffused 2px ring: `0 0 0 2px rgba(237, 26, 83, 0.15)`.

## Shapes

The primary shape profile relies on a standardized **8px radius (`0.5rem`)** across containers, modal frames, and inputs. 

To reinforce heavy equipment heritage, select key components feature **45-degree chamfered geometry**:
- **Priority Badges & Status Pills:** Feature an engineered corner clip (`clip-path: polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)`).
- **Primary CTA Buttons:** Standard 8px corner radius, with optional industrial chamfer on high-voltage/emergency dispatch triggers.
- **Data Table Cells & Cards:** Retain exact 90-degree internal intersections for tabular lines while framing parent cards with standard 8px boundary rounding.

## Components

### Buttons
- **Primary (Electric Action):** Solid `#ED1A53` background with white text, 8px border-radius, font-weight 600. Hover state darkens to `#D31245`. Focus state emits a crisp `0 0 0 3px rgba(237, 26, 83, 0.25)` halo.
- **Secondary (Titanium Solid):** Solid `#1E293B` background with white text. Hover state brightens to `#334155`.
- **Outline (Machined):** 1px solid `#CBD5E1` border on transparent or `#FFFFFF` background, text `#1E293B`. Hover state shifts border to `#1E293B` with `#F1F5F9` background.
- **Emergency / Urgent Dispatch:** Chamfered button profile with `#ED1A53` fill and high-contrast icon prefix.

### Status Chips & Priority Badges
- **Available Asset:** `#10B981` text, `#ECFDF5` background, `#A7F3D0` hairline border, leading filled dot indicator.
- **Scheduled Maintenance:** `#F59E0B` text, `#FFFBEB` background, `#FDE68A` hairline border.
- **Critical Fault / Overload:** `#ED1A53` text, `#FFF1F2` background, `#FECDD3` hairline border with chamfered geometry.
- **Decommissioned / Off-Rent:** `#475569` text, `#F1F5F9` background, `#CBD5E1` border.

### Data Tables & Asset Matrices
- Compact row height (44px standard, 36px dense mode) with `#E2E8F0` row dividers.
- Table headers use uppercase Montserrat label styling (`11px`, `fontWeight: 700`, `letterSpacing: 0.05em`), `#64748B` color, and `#F8FAFC` background.
- Hovered rows highlight in `#F8FAFC`. Selected rows highlight with `#FFF1F2` and a 2px left border of `#ED1A53`.
- All metric columns (kW, Hours, Fuel %, Rental Rate) must align right using tabular figures.

### Form Inputs & Telemetry Adjusters
- Height: 40px with 8px radius.
- Background: `#FFFFFF` with 1px border `#CBD5E1`.
- Focused: 1px border `#ED1A53` with `0 0 0 2px rgba(237, 26, 83, 0.12)`.
- Label placed strictly above the input in Inter font-weight 600 (`12px`, `#334155`).

### Checkboxes & Radio Controls
- Checkboxes: 18x18px square with 4px border-radius. Unchecked border 1.5px `#94A3B8`. Checked state fills `#ED1A53` with crisp white check glyph.
- Radio buttons: 18x18px circle. Selected state displays 6px concentric solid circle in `#ED1A53`.

### Cards & Asset Summary Blocks
- Clean `#FFFFFF` fill, 8px radius, 1px solid `#E2E8F0` hairline border.
- Card headers incorporate asset model typography (e.g., "CAT XQ2000 - 2000 kVA") alongside status badges aligned to the top-right corner.
- Internal telemetry meters feature thin, high-precision bar meters (4px height) with rounded-full caps.