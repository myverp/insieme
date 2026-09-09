---
target: authenticated Watchlist page on desktop and mobile
total_score: 27
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Dev\\projects\\Insieme\\app\\watchlist.tsx"
target_fingerprint: "sha256:639444e3464dfb327d7e6d636d08d266c710d46f696eb7e1f7870f12ee02d2c1"
target_path: "C:\\Dev\\projects\\Insieme\\app\\watchlist.tsx"
timestamp: 2026-09-03T17-51-08Z
slug: app-watchlist-tsx
---
# Authenticated Watchlist critique

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Loading, disabled, toast, result-count, and Undo states are strong; long transitions still rely on transient feedback. |
| 2 | Match system / real world | 4 | Watchlist, Member, Owner, Invitation, Film, and Watched history match the product vocabulary. |
| 3 | User control and freedom | 3 | Dialog exits and filter reset are clear; large result sets lack a fast return to the shortlist. |
| 4 | Consistency and standards | 2 | The warm system is cohesive, but desktop dialogs violate the documented centered-dialog behavior. |
| 5 | Error prevention | 3 | Destructive confirmation, constraints, and disabled invalid actions are effective. |
| 6 | Recognition rather than recall | 2 | Desktop card actions are hidden until hover/focus, and search results push the Watchlist out of view. |
| 7 | Flexibility and efficiency | 2 | Keyboard semantics exist, but discovery-to-shortlist navigation and repeat actions are inefficient. |
| 8 | Aesthetic and minimalist design | 3 | The page is calm at rest; expanded discovery and management become spatially excessive. |
| 9 | Error recovery | 3 | Errors are plain-language and inputs persist; recovery instructions remain limited. |
| 10 | Help and documentation | 2 | Empty states help, but the shared decision flow and privacy context are not visible on the main surface. |
| **Total** | | **27/40** | **Acceptable; meaningful improvements needed** |

## Design Specificity Verdict

**Visually specific, behaviorally generic.** Warm Paper, Forest Action, Corbel, the flower mark, and poster-led cards make Insieme recognizable and match the “Shared Living Room” direction. However, when Discovery expands, the page behaves like a personal film catalog: the shared Watchlist disappears below results, while Members and shared context live mostly inside management.

The deterministic source scan returned zero findings. The authenticated runtime detector found four real presentation issues: borderline footer contrast (4.45:1), mobile footer copy 12px from the viewport edge, and two 10px Owner labels. Axe additionally found a serious `aria-prohibited-attr` violation on the roleless logo span. This evidence strengthens the accessibility finding but does not contradict the broader design assessment.

## Overall Impression

The identity is warm, coherent, and worth preserving. The biggest opportunity is to make the shared decision path stay visible as the interface grows: Discovery should feed the Watchlist, not visually replace it.

## What's Working

1. The restrained cream-and-forest palette lets posters carry the visual energy and avoids generic dashboard styling.
2. State feedback is unusually solid for a small product: skeletons, result counts, disabled states, toasts, and Undo make actions predictable.
3. Mobile adaptation is directionally strong: horizontal Watchlist rows, stacked search, and bottom sheets fit the operating context.

## Priority Issues

### 1. [P1] Desktop dialogs are pinned to the top-left

**Why it matters:** At 1440×900, the manager rendered at x=0/y=0 and film details at x=0/y=0. They look structurally broken, weaken trust around destructive/settings actions, and contradict the documented centered-dialog pattern.

**Fix:** Restore centered desktop dialog geometry with `margin: auto` and bounded viewport spacing. Keep bottom docking and the handle only below the mobile breakpoint.

**Suggested command:** `$impeccable layout app/watchlist.tsx`

### 2. [P1] Discovery overwhelms the decision path

**Why it matters:** Twelve results stretched the page to 2697px and pushed the shared Watchlist more than two viewports away. After Add, the user receives a toast but cannot see the shared shortlist change, so the emotional and functional payoff is weak.

**Fix:** Show a smaller initial result set with explicit “Show more,” then surface a persistent `Watchlist (n)` / “View Watchlist” bridge after results and after Add. Preserve the existing Discovery → Watchlist → Watched history order.

**Suggested command:** `$impeccable distill app/watchlist.tsx`

### 3. [P1] Accessibility affordances miss the interaction floor

**Why it matters:** The yellow focus ring measures only 1.91–2.15:1 against the primary surfaces, several mobile controls are 38–40px high, Owner labels are 10px, and the roleless logo carries a prohibited `aria-label`. These defects disproportionately affect keyboard, low-vision, and motor-impaired users.

**Fix:** Use a darker or two-tone focus indicator with at least 3:1 adjacent contrast; make recurring mobile controls at least 44px high; raise Owner labels to a readable 12px; remove the invalid logo label or give the element valid semantics; slightly darken and inset the TMDB disclaimer.

**Suggested command:** `$impeccable audit app/watchlist.tsx`

### 4. [P2] Primary card actions are hidden on desktop

**Why it matters:** “Mark watched” and removal appear only on hover/focus. Occasional users can reasonably interpret a poster card as details-only, while touch users receive a different interaction model.

**Fix:** Keep the primary “Mark watched” action visible at rest. Leave deletion/removal in Film details or a clearly labeled secondary affordance so it does not compete with the main action.

**Suggested command:** `$impeccable clarify app/watchlist.tsx`

### 5. [P2] Watchlist management combines too many jobs

**Why it matters:** Switching, membership, inviting, renaming, deleting, and creating share one long surface. On mobile, the manager consumes a 760px sheet and pushes creation below the viewport, increasing scanning and error risk.

**Fix:** Keep switching, Members, and Invite immediately visible. Put rename and lifecycle actions under a collapsed “Watchlist settings” section, retain deletion at the true end, and preserve all existing permissions and behavior.

**Suggested command:** `$impeccable distill app/watchlist.tsx`

## Persona Red Flags

- **Alex, power user:** There is no persistent jump between a long result list and the Watchlist; comparing several candidates requires repeated scrolling.
- **Sam, accessibility-dependent:** Native controls and heading semantics are good, but the focus indicator, sub-44px targets, tiny role labels, and invalid logo ARIA weaken keyboard and assistive use.
- **Casey, distracted mobile user:** Search is clear, but management requires substantial vertical scanning and primary controls sit high on a long page.
- **Mara and Jo, shared choosers:** The product feels shared in its language and toasts, but Members and the current shared context are largely invisible during Discovery.

## Minor Observations

- A one-film desktop Watchlist looks sparse in a rigid four-column grid.
- The details facts grid can leave a conspicuous empty cell when five facts wrap across four columns.
- “Search” and “Apply filters” both execute active filters, so their distinct labels overstate a difference in behavior.
- The TMDB footer is appropriately subordinate, but its current contrast and mobile edge spacing are too marginal.

## Questions to Consider

1. Should the shared Watchlist remain visible as a compact rail/count while users browse results, or should Add automatically return them to it?
2. Should Watchlist management remain one dialog, or should rare owner settings become a separate settings layer while switching and inviting stay immediate?
