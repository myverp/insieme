# Insieme domain context

## Insieme

The shared place where two people discover films, save possibilities, and decide what to watch together. _Avoid:_ catalog, database, or content platform.

## Watchlist

A named collection of films that one or more Members are considering for a future movie night. Every new user starts with one Watchlist and can create or join others. A film remains on the Watchlist until it is removed or later marked as watched. _Avoid:_ separate personal/shared list types, queue, or library.

## Member

A person who has joined a Watchlist and can discover, add, remove, and mark films as watched with the group. A person can be a Member of several Watchlists. _Avoid:_ follower.

## Owner

The Member who created a Watchlist and is responsible for its name and lifecycle. Only the Owner can rename or delete that Watchlist. Other Members may leave it; the Owner cannot leave without deleting it. Every Watchlist has exactly one Owner. _Avoid:_ admin or moderator.

## Invitation

A private link that allows another person to become a Member of a Watchlist. _Avoid:_ public link or share.

## Watched history

The separate record of films from the watchlist that have been marked as watched, including when they were watched. _Avoid:_ completed list.

## Review

A Member’s written reaction to a watched Film in a specific Watchlist, optionally accompanied by a score. Each Member can have one Review per Film in that Watchlist. _Avoid:_ comment, note, or watched status.

## Film

A movie that can be discovered, inspected, and added to the watchlist. Use “film” in product language; use “movie” only when an external service or code interface already uses that term.

## Discovery

The activity of searching and filtering for films worth considering. Discovery results are candidates, not watchlist entries.

## Film details

The information used to decide whether a film is a good choice, such as its synopsis, genres, people, rating, images, and trailer. _Avoid:_ metadata in user-facing language.
