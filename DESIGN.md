# Design System: Insieme

Insieme is a shared place to discover films and choose what to watch together. Posters carry the strongest color. Preserve the flower logo and Corbel, Calibri, Segoe UI, sans-serif typography. Product language is English and follows CONTEXT.md.

## Themes and semantic colors

| Role | Light | Dark |
| --- | --- | --- |
| Page background | #F5F1E8 | #141C28 |
| Surface / menu / dialog | #FFFDFA | #1C2736 |
| Field | #FFFFFF | #1C2736 |
| Selected / subtle action | #E5EFE7 | #28374A |
| Border | #DDD7CA | #36465B |
| Field boundary | #858E82 | #667A93 |
| Main text | #1B2921 | #E8EDF3 |
| Supporting text | #646D64 | #AAB7C7 |
| Action / active tab | #286044 | #91B8DA |
| Action hover / focus | #19472F | #B8D3E9 |
| Text on filled action | #FFFFFF | #141C28 |
| Error text | #AD493A | #F2A79E |

Use the shared CSS variables in globals.css for both themes. Do not introduce amber accents, new typefaces, gradients or decorative panels. Pink and gold remain confined to the existing flower identity. Solid neutral backgrounds replace decorative page gradients and loading shimmer.

Appearance belongs in personal Profile settings: System, Light and Dark. System is the default and reacts to OS changes through CSS. An explicit choice is stored in localStorage and applied by a small head script before paint; when storage is unavailable, system CSS still works. Both themes have identical controls, layout and behavior.

## Navigation and current Watchlist

A sticky top navigation keeps Discover, Watchlist and History available as text links. Active state uses color and a thin underline, never a large filled button. The URL view parameter participates in native browser history. Discovery remains mounted while changing sections, keeping its input, filters, loaded results and pagination; each section restores its scroll position. Native modified link clicks remain available.

Desktop order: Insieme | Discover / Watchlist / History | Current Watchlist | Profile.
Mobile uses three rows: logo and Profile; three text links; compact Current Watchlist switcher. No bottom navigation or floating Watchlist bridge.

The current Watchlist is visible in every section. The header truncates long names; the Watchlists dialog shows their full text. The menu contains existing lists, a collapsed creation form and settings for the current list. Members, invitations, rename and Owner/Member lifecycle actions belong inside those settings. Preserve confirmation before deleting or leaving. At phone widths the dialog is a bottom sheet.

## Film previews and adding

Search, Watchlist and History use matching compact vertical cards: 2:3 poster, two-line title and a plain compact year/IMDb row. History also shows the watched date. No plot text, permanent underline, heavy shadow or outer card border. Broken or missing images retain the same poster footprint and accessible fallback.

The content shell is capped at 1280px. Wide desktop has six columns, medium layouts four, and phones two, including at 320px. Use 12–16px grid gutters and modest 4–6px card/control corners. Keep ordinary touch targets at least 44px. Titles use 14px with 1.35 line height; metadata uses 12px with 1.4 line height.

On fine-pointer hover devices above phone width, an add strip appears at the bottom inside the poster, overlaying rather than shifting it. Keyboard focus also reveals it. Use a short 120ms opacity/position transition. On phones and non-hover devices, show the button permanently below metadata. A single activation adds without opening details.

States are + Watchlist, Adding…, In Watchlist, Watched and Retry adding with an inline error. Pending actions block conflicting list changes. Status reflects the active Watchlist, and a failed add remains retryable. All displayed external ratings retain the production IMDb provenance and explicit unavailable/not-rated behavior.

## Preserved interactions

Discovery retains title, genre, director, decade, minimum IMDb and sort filters, provider-scope disclosures and pagination. Initially show up to 12 loaded results; Show more reveals another 12. No popular feed is added.

Film details remain dialogs, including existing story, facts, imagery, trailer, mark-watched and removal behavior. Keep random selection without repeats, Undo, watched history and each Member's own Review. No new film routes or domain/schema changes are part of this refinement.

Dialogs use semantic surface/text colors, constrained viewport height, scrolling, a close control and native Escape/focus behavior. Mobile sheets use restrained top corners. Focus indicators must remain visible against both themes; reduced-motion disables animation and transitions. Avoid horizontal overflow, including long Watchlist names, card titles and form controls.

## Validation

See docs/validation/production-design-refinement.md for current evidence and limitations. Preserve authorization, memberships and data; validate using disposable local test accounts rather than production mutations.
