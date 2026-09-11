---
name: Insieme
description: A warm, tactile interface for choosing films together.
colors:
  forest-action: "#286044"
  forest-deep: "#19472f"
  forest-mist: "#e5efe7"
  warm-paper: "#f5f1e8"
  cream-surface: "#fffdfa"
  ink: "#1b2921"
  quiet-ink: "#6a716a"
  warm-border: "#ddd7ca"
  danger: "#ad493a"
  terracotta: "#c8644c"
  flower-pink: "#e887a4"
  flower-gold: "#e3ad65"
  field-white: "#ffffff"
typography:
  display:
    fontFamily: "Corbel, Calibri, Segoe UI, sans-serif"
    fontSize: "clamp(34px, 5vw, 48px)"
    fontWeight: 650
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Corbel, Calibri, Segoe UI, sans-serif"
    fontSize: "clamp(25px, 4vw, 38px)"
    fontWeight: 700
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Corbel, Calibri, Segoe UI, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Corbel, Calibri, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Corbel, Calibri, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 700
rounded:
  control-sm: "8px"
  control-md: "10px"
  surface-md: "14px"
  surface-lg: "18px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.forest-action}"
    textColor: "{colors.field-white}"
    rounded: "{rounded.control-md}"
    padding: "0 20px"
    height: "44px"
  button-soft:
    backgroundColor: "{colors.forest-mist}"
    textColor: "{colors.forest-deep}"
    rounded: "{rounded.control-sm}"
    padding: "0 14px"
    height: "44px"
  input:
    backgroundColor: "{colors.field-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control-md}"
    padding: "0 16px"
    height: "48px"
  metadata-chip:
    backgroundColor: "{colors.warm-paper}"
    textColor: "{colors.quiet-ink}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  film-card:
    backgroundColor: "{colors.cream-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface-lg}"
---

# Design System: Insieme

## Overview

**Creative North Star: "The Shared Living Room"**

Insieme should feel like settling into a familiar room with someone you trust: warm enough to invite lingering, orderly enough to make a decision, and never so styled that the interface becomes the event. Cream surfaces, forest-green actions, dark ink, and the small flower mark create a domestic visual language without becoming rustic or nostalgic.

The system is friendly and tactile. Controls have comfortable targets, modest curves, clear borders, and immediate state changes. Density stays practical: film imagery carries visual energy while surrounding controls remain calm. Avoid cold dashboard styling, ornamental excess, and novelty that slows the shared decision.

**Key Characteristics:**

- Warm paper-like neutrals with deep green action color.
- Friendly, tactile controls with restrained rounded geometry.
- Film posters provide the strongest color and visual contrast.
- Clear hierarchy and compact supporting information.
- Small floral color accents are rare, recognizable brand punctuation.

## Colors

The Forest Ink & Warm Paper palette combines intimate, softly aged neutrals with a confident botanical action color.

### Primary

- **Forest Action:** Primary buttons, active states, focus emphasis, and small structural accents.
- **Deep Forest Ink:** Hover states and high-contrast green text where a filled action would be too heavy.
- **Forest Mist:** Selected rows, metadata states, secondary actions, and initials avatars.

### Secondary

- **Terracotta Thread:** A restrained warm counterpoint used in the page atmosphere rather than as a competing action color.
- **Flower Pink:** The Insieme flower petals and no general-purpose UI role.
- **Flower Gold:** The flower center and no general-purpose status role.

### Neutral

- **Warm Paper:** The page ground and quiet metadata backgrounds.
- **Cream Surface:** Cards, panels, dialogs, and header controls.
- **Living Ink:** Main text and headings.
- **Quiet Ink:** Supporting copy, dates, labels, and metadata.
- **Warm Border:** Dividers and low-contrast surface outlines.
- **Field White:** Text inputs and deliberately crisp controls inside cream surfaces.

### Named Rules

**The Poster Leads Rule.** UI colors stay restrained so film artwork remains the most chromatic content on the page.

**The Flower Is Punctuation Rule.** Pink and gold belong to the flower mark; do not spread them across routine buttons, badges, or status messages.

## Typography

**Display Font:** Corbel (with Calibri, Segoe UI, and sans-serif fallbacks)  
**Body Font:** Corbel (with Calibri, Segoe UI, and sans-serif fallbacks)

**Character:** A single humanist sans-serif keeps the interface familiar and unforced. Hierarchy comes from scale, weight, and compact negative tracking rather than mixing typefaces.

### Hierarchy

- **Display** (650, fluid 34–48px, tight tracking): Reserved for the Insieme wordmark and highest-level identity moments.
- **Headline** (700, fluid 25–38px, tight tracking): Film-detail titles and prominent dialog headings.
- **Title** (700, 19px, 1.2 line-height): Film card titles, limited to two lines.
- **Body** (400, 14px, 1.65 line-height): Descriptions and explanatory copy that benefit from comfortable reading rhythm.
- **Label** (700, 13px): Controls, field labels, metadata, and compact supporting text; small eyebrow labels may use uppercase with wider tracking.

### Named Rules

**The One Family Rule.** Do not introduce a display typeface to manufacture personality; the existing humanist family and film imagery already carry the voice.

## Layout

The application uses a centered fluid shell capped near 1220px with generous desktop gutters and a 24px mobile outer gutter. Major sections use a 48px vertical interval, while component internals rely on the 8–24px spacing range.

Film grids step from four columns to three below 950px. At 700px and below, Watchlist and history cards become compact horizontal rows with a fixed poster thumbnail, while search results remain a scannable two-column grid. Search forms stack vertically below 600px. Dialogs become bottom sheets below 700px, including a visible drag-handle cue and rounded top corners.

**The Decision Path Rule.** Preserve the order of discovery, shortlist, and watched history. Layout changes may compress that path but must not obscure it.

## Elevation & Depth

Depth is ambient layering, not physical spectacle. Borders and tonal changes establish most grouping; diffuse low-opacity shadows separate high-value panels and film cards, while dialogs use stronger depth against a darkened backdrop. Hover may increase a card shadow slightly, but controls should not bounce or appear glossy.

### Shadow Vocabulary

- **Quiet panel:** `0 12px 36px rgba(50, 55, 41, .08)` for the search surface.
- **Resting card:** `0 10px 28px rgba(48, 51, 39, .08)` for Watchlist films.
- **Focused card:** `0 0 0 3px rgba(47, 98, 72, .14), 0 14px 34px rgba(48, 51, 39, .12)` for keyboard focus within a film card.
- **Dialog:** `0 24px 80px rgba(18, 31, 23, .28)` for modal separation.

### Named Rules

**The Ambient Layer Rule.** Shadows create separation and focus; they never become decoration or imitate floating glass.

## Shapes

The form language is softly rectangular. Controls cluster around 8–10px corners, compact surfaces around 12–14px, and major cards around 18px. Pills are reserved for brief metadata, genres, counts, and roles. Circular geometry is limited to avatars, close controls, and the flower center. Posters keep their native rectangular silhouette and are clipped only by their card container.

On mobile, modal surfaces use a larger 24px top radius because they behave as sheets. Dashed borders distinguish empty states from interactive cards without adding another filled surface.

**The Curves Follow Scale Rule.** Larger containers receive larger radii; do not apply pill shapes to ordinary buttons, inputs, cards, or dialogs.

## Components

The component language is friendly and tactile: generous enough to invite touch, restrained enough to keep the films central.

### Buttons

- **Shape:** Soft rectangular controls, generally 8–10px corners. Recurring mobile controls have a minimum 44px touch height.
- **Primary:** Forest fill with white text and confident 700–750 weight.
- **Hover / Focus:** Darken the forest fill on hover; use the global high-visibility focus outline for keyboard access.
- **Secondary:** Forest Mist fill with Deep Forest Ink text and a quiet green border.
- **Danger:** Cream or transparent surface with muted red text and border; never use danger red for routine actions.

### Chips

- **Style:** Compact pill geometry with Warm Paper or Forest Mist backgrounds. Member roles and other meaningful labels use at least 12px semibold text.
- **State:** Selected and removable filters use the green family; passive film metadata stays neutral.

### Cards / Containers

- **Corner Style:** Major cards use broad but restrained 18px corners; compact panels use 12–14px.
- **Background:** Cream Surface over Warm Paper.
- **Shadow Strategy:** Ambient at rest, slightly stronger on hover or focus.
- **Border:** One-pixel warm neutral outline remains visible even when a shadow is present.
- **Internal Padding:** Usually 16–24px; poster cards let imagery meet the container edge.

### Inputs / Fields

- **Style:** Crisp white field, warm-gray border, 9–11px corners, and 42–48px height.
- **Focus:** Forest border with a solid Deep Forest Ink outline, offset from the control. Do not rely on a translucent ring alone.
- **Error / Disabled:** Error copy and outlines use muted danger red; disabled controls retain their shape and lower opacity.

### Navigation

Header controls use cream surfaces, quiet borders, semibold labels, and the same compact radius as inputs. Desktop keeps identity, Watchlist selection, management, and profile in one line. Mobile keeps the logo and profile together, with the Watchlist selector and Manage action on a second row.

### Film Card

The poster is the signature visual element. A Watchlist preview pairs a 2:3 poster with a two-line title and compact rating/year metadata. The whole preview opens Film details. Keep Mark watched and removal inside Film details on desktop and mobile; do not duplicate them on previews or reserve empty space for those controls.

### Discovery and Shared Context

Place Pick a film beside the Watchlist heading as the decision action. Open the selected film's details directly and offer Pick another there. Cycle through current films without repeats and reset when switching Watchlists. Disable the action for an empty list; label it View our film for a single option. Keep preview cards free of extra actions.

Show the current Watchlist name above search. Once membership data loads, show up to four initials avatars, with an overflow count for larger groups. Keep privacy and Member-count copy off the Discovery surface; membership details remain available in management.

Show four results initially, with Show more films revealing four more. Use four columns on desktop, two on mobile, and one on narrow phones. Show View Watchlist only when search results separate Discovery from the shortlist. Omit the bridge at rest, while loading, and for empty results. Label both title and filtered search actions Search.

For imported films whose rating source is unknown, show the year without a legacy score. Never relabel an unknown score as TMDb or IMDb. Film details can show verified ratings when available.

### Watchlist Management

Keep switching, Members, and Invite visible. Collapse Create a new Watchlist by default. Place rename and lifecycle controls in a collapsed Watchlist settings section at the end, with deletion last.

### Dialog and Bottom Sheet

Desktop dialogs are centered cream surfaces with a dark translucent backdrop. At mobile widths they dock to the bottom edge, gain a 24px top radius and handle, and keep actions full-width where space requires it.

Film facts wrap naturally across available space, separated from surrounding content by quiet rules. Avoid a rigid table that leaves empty cells when facts are missing.

## Do's and Don'ts

### Do:

- **Do** let film imagery carry most of the page's color and visual drama.
- **Do** use Forest Action for the clearest next step and Forest Mist for secondary or selected states.
- **Do** preserve warm borders even when an ambient shadow separates a surface.
- **Do** keep metadata compact, readable, and visually subordinate to titles.
- **Do** transform dense dialogs into bottom sheets and poster cards into horizontal rows on small screens.

### Don't:

- **Don't** turn the interface into a cold analytics dashboard or generic SaaS shell.
- **Don't** use gradients, glass effects, glow shadows, or decorative floating shapes.
- **Don't** distribute the flower's pink and gold across routine UI controls.
- **Don't** add rounded containers around content that already has a clear grouping relationship.
- **Don't** animate for personality alone; motion should explain state, collapse, or spatial transition.
- **Don't** compete with poster artwork through loud UI color or ornamental typography.
