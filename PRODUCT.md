# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Couples and close friends choosing films together, usually as a pair or small group. Their job is to move from “what should we watch?” to a shared decision without juggling messages, separate lists, and search tools.

## Product Purpose

Insieme keeps film discovery, a shared shortlist, watched history, and reactions in one calm flow. It succeeds when a group can find promising films, agree on one, and retain a lightweight record of what they watched.

## Positioning

Insieme is a small shared decision space, not a personal film database or a general social network. Its value is the continuity between discovering films together, maintaining one shared Watchlist, and recording the outcome.

## Operating Context

Members create or join private Watchlists, search and filter films, inspect film details, add candidates, mark films as watched, and optionally leave Reviews. Invitations are private links. A person may belong to multiple Watchlists and switch between them.

## Capabilities and Constraints

- Authentication, profiles, Watchlists, invitations, watched history, and Reviews use Supabase with Row Level Security.
- Every Watchlist has one Owner. The Owner can rename or delete it; other Members can leave it.
- Profiles use a required display name and initials avatar. Image uploads and extensive profile customization are outside the product scope.
- Film discovery uses TMDb; IMDb rating enrichment uses OMDb when available.
- Use the product terms in `CONTEXT.md`, including Watchlist, Member, Owner, Invitation, Watched history, Review, Film, and Discovery.
- Preserve private membership boundaries: only authenticated Members who share a Watchlist may access its people and activity.

## Brand Commitments

The product name is Insieme. Product language should feel warm, direct, and human without becoming cute or verbose. Use “film” in user-facing copy unless an external service requires “movie.”

## Evidence on Hand

- A working Next.js application with authenticated multi-user flows and local RLS verification.
- Existing product vocabulary in `CONTEXT.md` and implementation notes in `README.md`.
- The production application is linked from `README.md`.
- No testimonials, customer logos, usage claims, or benchmark data are available; future work must not fabricate them.

## Product Principles

1. Make the shared decision faster than discussing it across separate tools.
2. Keep collaboration private, legible, and predictable.
3. Prefer a focused shared workflow over catalog or social-network complexity.
4. Preserve a lightweight memory of what the group watched without turning it into administration.
5. Keep controls and language understandable to occasional users.
