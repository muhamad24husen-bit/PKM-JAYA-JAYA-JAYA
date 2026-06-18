---
name: NIRWANA-AI
colors:
  surface: '#0d1515'
  surface-dim: '#0d1515'
  surface-bright: '#333b3b'
  surface-container-lowest: '#080f10'
  surface-container-low: '#151d1e'
  surface-container: '#192122'
  surface-container-high: '#232b2c'
  surface-container-highest: '#2e3637'
  on-surface: '#dce4e4'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#dce4e4'
  inverse-on-surface: '#2a3232'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#76d6d5'
  on-secondary: '#003737'
  secondary-container: '#007f7f'
  on-secondary-container: '#ddfffe'
  tertiary: '#fff6e4'
  on-tertiary: '#3b2f00'
  tertiary-container: '#fed83a'
  on-tertiary-container: '#725e00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#93f2f2'
  secondary-fixed-dim: '#76d6d5'
  on-secondary-fixed: '#002020'
  on-secondary-fixed-variant: '#004f4f'
  tertiary-fixed: '#ffe173'
  tertiary-fixed-dim: '#e8c423'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#554500'
  background: '#0d1515'
  on-background: '#dce4e4'
  surface-variant: '#2e3637'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
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
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar_width: 280px
  container_gutter: 24px
  card_padding: 20px
  stack_gap_sm: 8px
  stack_gap_md: 16px
  stack_gap_lg: 32px
---

## Brand & Style

The design system for this neonatal kidney monitoring platform is rooted in a **Futuristic Medical / Dark Tech** aesthetic. It aims to evoke a sense of absolute precision, clinical trust, and advanced intelligence. The interface must balance the high-stakes nature of neonatal intensive care with the sophisticated data processing of AI.

**Design Movements:**
- **Minimalism:** To ensure high-density medical data remains legible and uncluttered.
- **Glassmorphism:** Utilized subtly for data overlays and card surfaces to provide a sense of depth and technical sophistication.
- **Cyber-Medical:** Incorporating "glow" states for critical alerts and biometric indicators to draw immediate clinical attention.

**Target Audience:** 
Neonatologists, pediatric nephrologists, and medical researchers in a clinical university setting.

**Emotional Response:**
Professional, cutting-edge, calm (through dark tones), and ultra-reliable.

## Colors

The palette is optimized for low-light clinical environments (NICU), reducing eye strain while maximizing the "pop" of critical data points.

- **Primary (Cyan #00f2ff):** Used for active states, primary call-to-actions, and "live" data streams.
- **Secondary (Teal #008080):** Used for supporting UI elements, secondary buttons, and data grouping.
- **Background (#0a0e17):** A deep, infinite navy that provides the foundation for high-contrast data visualization.
- **Surface (#161b26):** Used for card containers and sidebar elements to create structural hierarchy.
- **Status Indicators:** 
    - **Normal (Emerald):** Kidney function within stable parameters (*Fungsi Normal*).
    - **Warning (Amber):** Early indicators of renal stress (*Peringatan Ringan*).
    - **Hypoxia Alert (Crimson):** Immediate critical intervention required (*Gawat Darurat*).

## Typography

The system utilizes **Geist** for its technical, developer-centric precision in headers and data labels, paired with **Inter** for clinical notes and body text to ensure maximum readability.

- **Data Readability:** Numerical values for creatinine, oxygen saturation, and GFR should use `data-mono` or `headline-md` to ensure characters are distinct and aligned.
- **Language:** All labels must be in formal Indonesian (e.g., *Detak Jantung*, *Saturasi Oksigen*, *Laju Filtrasi Glomerulus*).
- **Contrast:** Maintain a minimum contrast ratio of 7:1 for all primary data against the dark background.

## Layout & Spacing

The layout follows a **Fixed Sidebar + Fluid Content** model, optimized for medical workstations and high-resolution tablets.

- **Sidebar:** Fixed at 280px. Contains patient navigation (*Navigasi Pasien*), live alerts, and dashboard switching.
- **Main Content:** Utilizes a 12-column grid. Key biometric "hero" charts should span at least 8 columns, while secondary vitals can span 4.
- **Rhythm:** Use a strict 8px base grid. All margins and paddings should be multiples of 8 to maintain a "clinical" sense of order and structure.
- **Grid Motif:** A subtle, low-opacity (5%) cyan grid pattern should be applied to the background of chart areas to reinforce the technical theme.

## Elevation & Depth

This design system avoids traditional drop shadows in favor of **Tonal Elevation** and **Outer Glows**.

- **Level 1 (Base):** Background (#0a0e17).
- **Level 2 (Containers):** Card surfaces (#161b26) with a 1px border of #ffffff10.
- **Level 3 (Interactive/Active):** Cards or buttons in an active state gain a subtle outer glow using the primary cyan color (`box-shadow: 0 0 15px rgba(0, 242, 255, 0.2)`).
- **Critical Layer:** Alert modals or emergency notifications use a semi-transparent Crimson blur background to create immediate visual "noise" that demands attention.

## Shapes

The design system uses **Rounded (16px/1rem)** corners to soften the "tech" look, making it feel more appropriate for a neonatal (infant care) context while remaining modern.

- **Cards:** 16px radius for primary dashboard cards.
- **Buttons:** 8px radius for standard actions; 40px (pill) for status badges.
- **Input Fields:** 8px radius with a clear cyan underline or border when focused.

## Components

### Buttons & Controls
- **Primary Action:** Solid Cyan (#00f2ff) with black text. High-contrast, sharp corners (8px).
- **Secondary Action:** Ghost style with Cyan border and subtle hover glow.
- **Status Badges:** Pill-shaped with low-opacity background and high-intensity text (e.g., *Normal* in Emerald).

### Cards (Kartu Pemantauan)
- Every card must include a title in `label-caps` and a 1px Cyan border at the top or left to indicate the "live" status. 
- Background: #161b26.

### Charts (Grafik Real-time)
- **Line Charts:** Lines must have a "neon" glow effect. Use Primary Cyan for the main metric (e.g., GFR) and Secondary Teal for comparison data.
- **Grid Lines:** Low-opacity grey-blue (#ffffff10). No heavy borders.

### Data Inputs (Input Data Klinis)
- Dark-themed fields with Cyan focus states. Labels should always be visible above the input area in Indonesian.

### Sidebar (Bilah Sisi)
- Navigation items should use high-contrast white text. The active patient or page is marked by a vertical Cyan bar on the far left and a subtle background tint.

### Medical Iconography
- Use thin-stroke (1.5px) icons. Custom icons for *Ginjal* (Kidney), *Bayi* (Neonate), and *Aliran Darah* (Blood Flow) should be used to provide instant visual context.