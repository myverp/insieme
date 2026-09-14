# Insieme design system

## Direction

A film index with a shared purpose: discover films, save the possibilities, and choose what to watch together. Borrow the useful density and clear rating provenance of established film products while keeping Insieme's own identity. Film artwork carries the color; the interface provides structure.

The previous interface combined Discovery, Watchlist and history on one long screen, hid filters behind a disclosure, and opened every film in a dialog. It used warm green surfaces, broad radii and ambient decoration. The redesign gives each activity clear navigation, starts Discovery with real popular films, and uses an editorial hierarchy with restrained amber accents.

## Themes and typography

All production surfaces use the semantic variables in app/globals.css. Light uses warm white (#f8f7f4), white surfaces and charcoal text. Dark uses charcoal (#171817), slightly lighter surfaces and warm white text. Amber (#e7b744) identifies primary actions and active navigation, with dark text on amber in both themes. Supporting text and borders have separate theme values; never use reduced opacity for ordinary body copy.

Respect the system color preference initially. An explicit light/dark choice persists in localStorage and is applied before first paint. Theme controls use visible text labels and work without storage access.

The Insieme wordmark uses Georgia for a compact editorial identity. UI text uses Segoe UI with Arial/Helvetica fallbacks: no font download or external font dependency. Page titles are 30–46px, section titles 20–30px, card titles 13–14px and controls 12–14px. Small uppercase labels are supporting information, never the only accessible label for a control.

## Structure

- A compact masthead contains Discover, Watchlist, History, theme and profile.
- A persistent shared context row names the current Watchlist, exposes its selector, membership settings, members and invitation action. Keep the destination obvious before adding a film.
- Discovery starts with a prominent title search and real popular results. Desktop filters show genre, director, decade, minimum TMDb score and sorting. Mobile uses a focused filter sheet.
- Poster grids use six columns on wide desktop, four on tablet and two on phones. Posters retain a 2:3 ratio. Titles support two lines; year and named rating source sit directly below.
- Show twelve discovery results initially; Show more reveals the remaining fetched candidates. Counts describe fetched results, never the size of the entire catalog.
- Watchlist and History have dedicated navigation states. Preserve the random picker, removal with Undo, watched timestamps and member reviews.
- Film pages use dedicated URLs and retain the current Watchlist context. A poster and still anchor the page; facts, synopsis, cast, trailer and reviews use clear sections. The random picker can still use a dialog.

## Components and interaction

Use 2–5px corners on rectangular controls and dialogs. Circles are reserved for member avatars. Use rules and alignment to group content; avoid unnecessary panels, gradients, glows, floating decorations and ornamental icons. Do not desaturate film artwork in history.

Primary actions are amber; secondary actions are neutral. Dangerous actions use theme-aware red and retain explicit confirmation. Member settings keep create, rename and lifecycle controls grouped by purpose and owner/member permissions.

Use native buttons, links, selects and dialogs. Visible focus uses a solid three-pixel outline. Dialogs retain Escape dismissal and focus return. Mobile controls have at least 44px targets where practical, input text is 16px to avoid zoom, and content wraps without horizontal scrolling. Respect prefers-reduced-motion.

Film search and filters live in the URL. Film-page return links restore that context, and authentication preserves supported film and discovery destinations. Show the generated invitation link in a selectable field; copying it is a convenience rather than the only way to invite a Member. Prevent conflicting film mutations while a request is pending.

Keep shared lists current with realtime events, a refresh after subscription, focus/visibility recovery and a 15-second refresh while the page is visible. A failed initial Watchlist request gets a retry state, never an empty-list claim. Poster failures get a labeled fallback. Verification and current limits are recorded in `docs/validation/catalog-redesign.md`.

## Data and content rules

Use Film, Watchlist, Member, Owner, Invitation, Watched history and Review as defined in CONTEXT.md. Do not introduce a separate personal/shared list data type. An invitation is a private membership link.

TMDb search scores must say TMDb. IMDb scores are displayed only when independently verified. Unknown legacy ratings remain hidden. Missing artwork uses an intentional placeholder; missing facts are omitted. Loading, empty results, network failure and saved states must be explicit. Never substitute fixture data for real API results.

Preserve authentication, membership authorization, existing database records and legacy import. Display data-provider attribution in the footer. Existing prototype routes are not production design authorities.
