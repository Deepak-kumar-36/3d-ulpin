---
name: Vertical Cadastre Editorial
colors:
  surface: '#fdf9f0'
  surface-dim: '#dddad1'
  surface-bright: '#fdf9f0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ea'
  surface-container: '#f1eee5'
  surface-container-high: '#ece8df'
  surface-container-highest: '#e6e2d9'
  on-surface: '#1c1c16'
  on-surface-variant: '#424843'
  inverse-surface: '#31302b'
  inverse-on-surface: '#f4f0e7'
  outline: '#727973'
  outline-variant: '#c1c8c2'
  surface-tint: '#456553'
  primary: '#032517'
  on-primary: '#ffffff'
  primary-container: '#1b3b2b'
  on-primary-container: '#83a590'
  inverse-primary: '#abcfb8'
  secondary: '#2c657e'
  on-secondary: '#ffffff'
  secondary-container: '#abe1ff'
  on-secondary-container: '#2d657f'
  tertiary: '#1c2300'
  on-tertiary: '#ffffff'
  tertiary-container: '#303900'
  on-tertiary-container: '#90a804'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c7ebd4'
  primary-fixed-dim: '#abcfb8'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#2d4d3c'
  secondary-fixed: '#c1e8ff'
  secondary-fixed-dim: '#98ceeb'
  on-secondary-fixed: '#001e2b'
  on-secondary-fixed-variant: '#084d65'
  tertiary-fixed: '#d4ef55'
  tertiary-fixed-dim: '#b8d23b'
  on-tertiary-fixed: '#181e00'
  on-tertiary-fixed-variant: '#404c00'
  background: '#fdf9f0'
  on-background: '#1c1c16'
  surface-variant: '#e6e2d9'
typography:
  display-hero:
    fontFamily: Newsreader
    fontSize: 56px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Newsreader
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: '500'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Newsreader
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  data-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
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
  gutter-lg: 2rem
  margin: 2rem
  margin-sm: 1rem
  margin-lg: 3rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 4rem
---

## Brand & Style

This design system establishes a high-craft editorial aesthetic positioned at the intersection of architectural publishing, cartographic tradition, and computational spatial modeling. It bridges technical GIS precision with the tactile, deliberate presence of an archival monograph. 

Targeted at spatial computational engineers, lead architects, urban planners, and cadastral authorities, the interface evokes the intellectual gravitas of an architectural folio alongside the fluid capability of real-time 3D volumetric extrusion engines. The emotional tone is authoritative, quiet, and deeply analyticalâ€”avoiding standard software tropes in favor of editorial pacing, structured grid discipline, and purposeful material warmth.

The aesthetic fuses **Editorial Minimalism** with **Tactile Technical Architecture**:
- Architectural drafting precision expressed through hairline division lines, dimension hashes, spatial axis annotations, and structural registration marks.
- Editorial layouts defined by dynamic pacing: generous archival margins offset by compact, high-density spatial inspection data panels.
- Restrained, purposeful feedback: light-reactive surfaces, subtle depth layering, and tactile data chips that echo drafted cartographic legends.

## Colors

The palette balances warm, fibrous ground papers against deep botanical ink tones and precise blueprint accents:

- **Foundation Canvas & Containers:** The base canvas operates on `#FBF9F4` (Parchment Base), layering upward into `#F5F1E8` (Surface Fill) and `#ECE6DA` (Recessed Wells & Inspector Panels). This warmth eliminates clinical screen glare during extended plan-vectorizing sessions.
- **Structural Text & Line Work (Forest Greens):** Primary typography and structural linework leverage `#12281D` (Deepest Forest Ink) for titles and primary metrics, `#1B3B2B` (Core Structural Green) for interface boundaries and headers, and `#2B523E` (Muted Leaf) for secondary metadata.
- **Architectural Accents (Cyan/Blue Blueprint Series):** `#3B728C` provides purposeful contrast for interactive states, viewport crosshairs, and spatial coordinates. `#B2D1E0` and `#D4E5ED` serve as background washes for selected floor plates, elevation slices, and bounding boxes.
- **Precision Highlights (Citron Cadastre):** `#C3DD45` and `#D8E97C` function as surgical accents reserved for anchor nodes, snapping vertices, extrusion deltas, active floor levels, and live processing badges.
- **Fine Linework:** Borders, structural grid marks, and dimension ticks employ semi-transparent dark greens: `#1B3B2B30` for structural divisions and `#2D4A3A1F` for fine interior container rules.

## Typography

The typographic system pairs three specialized voices:

1. **Editorial Serifs (`Newsreader`):** Applied to view headers, project nomenclature, and volume scale overviews. Display scales incorporate optical sizing to ensure calligraphic flourishes balance against strict engineering grids.
2. **Technical Grotesque (`Hanken Grotesk`):** Serves as the primary communicative workhorse for control surfaces, long-form spatial property notes, tooltips, and modal dialogues. Clean geometry ensures high legibility on warm paper backdrops.
3. **Drafting Monospace (`JetBrains Mono`):** Applied rigorously to GIS coordinates (Northing/Easting/Z-elevation), polygon point tables, spatial parsing tolerances, file hashes, and scale factors. All numerical values must render tabular numerals with zero ambiguity between characters.

## Layout & Spacing

The layout is built upon an **Asymmetrical Drafting Studio Grid**:

- **Desktop (1440px+):** A 16-column layout with 2rem margins and 1.5rem gutters. A fixed 360px editorial tool panel sits on the left, a fluid central viewport handles 2D vector overlays and 3D spatial projections, and a collapsible 320px cadastre inspector rests on the right.
- **Tablet (768px - 1439px):** An 8-column layout with 1.5rem margins and 1rem gutters. Inspector panels convert to bottom-docked sliding sheets or overlay drawers to maximize the active viewport.
- **Mobile (< 768px):** A 4-column layout with 1rem margins. Complex floorplan vectoring simplifies to a single-stream view toggle (Plan Mode vs. Isometric 3D vs. Unit Spatial Registry).

Spacing maintains rhythmic intervals based on 4px units. Component internals leverage `space-sm` (8px) and `space-md` (16px) for tight architectural density, while screen layouts feature expansive `space-xl` and `space-2xl` breathing room to reflect editorial monograph standards.

## Elevation & Depth

Visual hierarchy uses physical sheet-paper layering and subtle translucent stacking rather than aggressive artificial lighting:

- **Level 0 (Site Ground):** Baseline `#FBF9F4` paper canvas. Completely unlifted, featuring fine `#1B3B2B15` drafting grid crosses at 40px intervals.
- **Level 1 (Drafting Plates & Cards):** Flat `#F5F1E8` surfaces bordered by a hairline `#1B3B2B25` stroke. Elevation is articulated via a subtle tone shift and an ambient floor: `box-shadow: 0 1px 3px rgba(27, 59, 43, 0.04), 0 4px 12px rgba(27, 59, 43, 0.02)`.
- **Level 2 (Active Toolbars & Inspection Overlays):** Floating tool palettes and floating cursor badges utilize 92% opaque `#FBF9F4` backed by `backdrop-filter: blur(8px)`. Border is defined by `#1B3B2B35`, paired with an architectural drop shadow: `box-shadow: 0 4px 16px rgba(27, 59, 43, 0.08), 0 1px 2px rgba(27, 59, 43, 0.04)`.
- **Level 3 (Modals & 3D Clipping Planes):** `#FBF9F4` foreground surrounded by a 1px `#1B3B2B` accent stroke, framed by a soft ambient shadow: `box-shadow: 0 16px 36px rgba(18, 40, 29, 0.12), 0 2px 6px rgba(18, 40, 29, 0.06)`.

## Shapes

The design system pairs refined, organic container radii with surgical, straight-edge precision tools:

- **Large Structural Containers (`rounded-2xl` / 16px):** Primary inspection panels, floating canvas windows, and project workspaces feature 16px radii. This softens the interface, echoing heavy archival book covers and premium physical portfolio sheets.
- **Interactive Elements & Data Cells (`rounded-md` / 6px to 8px):** Buttons, inputs, and tabular cards use tighter roundedness, reinforcing instrumental precision.
- **Micro Spatial Badges & Pointers (`rounded-sm` / 2px to 4px):** GIS labels, vertex coordinate flags, and elevation markers utilize minimal rounding, retaining the crisp character of hand-ruled survey markers.
- **Architectural Sketched Cues:** Section boundaries frequently pair with faint hairline registration marks (`+` or `L`-brackets at 90-degree corners), celebrating the technical drafting process.

## Components

### Buttons
- **Primary:** Solid `#1B3B2B` container, `#FBF9F4` typography, hairline `#12281D` edge. On hover, background shifts to `#2B523E` with a subtle elevation shift. Focus states show a 2px offset ring in `#C3DD45`.
- **Secondary (Blueprint Style):** `#D4E5ED` surface, `#1B3B2B` typography, `#3B728C35` border. Transitions to `#B2D1E0` on hover.
- **Tertiary / Ghost:** Transparent background, `#1B3B2B` text, framed by faint hairline dots. Highlights to `#F5F1E8` on hover.

### Chips & Badges
- **Spatial Status Chip:** Monospace text (`JetBrains Mono`, 11px) housed in a `#ECE6DA` capsule with a 1px `#1B3B2B25` border. Active spatial statuses (e.g., "WALL RECONSTRUCTED", "PARCEL REGISTERED") display a 6px solid `#C3DD45` indicator dot.
- **Coordinate Tags:** Blue-tinted tags (`#D4E5ED`) carrying spatial axes (`X: 124.08 Y: 984.11 Z: +12.50m`) styled with fine `#3B728C40` borders.

### Input Fields & Controls
- **Numeric Spatial Field:** Set against `#ECE6DA` or `#FBF9F4`, styled with a crisp 1px `#1B3B2B30` border. Typographic entry uses `JetBrains Mono`. Focus activates a 1px solid `#1B3B2B` outline and a subtle inner shadow.
- **Checkboxes & Radios:** Sharp-cornered 16px squares (`rounded-sm`), framed in `#1B3B2B`. Checked state fills `#1B3B2B` with a `#C3DD45` architectural diagonal tick or center square.

### Cards & Grouping Structures
- **Cadastral Parcel Card:** Outer shell utilizes `rounded-2xl` on `#F5F1E8`, encased in a `#1B3B2B20` stroke. Internal division headers utilize `label-caps` in `#2B523E`. Interior floor lists feature dotted horizontal separation rules (`#1B3B2B20`).

### Domain-Specific Components
- **Vertical Level Navigator (Floor-Stack Slider):** An elevation strip positioned adjacent to the 3D viewport. Shows physical floor plates stacked vertically. Active floor highlights with a `#C3DD45` left accent line and `#D4E5ED` pill fill, accompanied by precise AHD (Australian Height Datum / sea level) values.
- **2D Plan Vector Anchor:** Interactive vector vertex rendered as a 6px hollow ring (`#1B3B2B`) that shifts to `#C3DD45` with crosshair extensions when snapped to an inferred boundary line.
