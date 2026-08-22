# Insieme roadmap

This list is ordered by expected user value, then implementation risk. Linear is the active issue tracker; this file is the version-controlled planning mirror.

## Next

### 1. Random film picker

Help the pair choose from the current watchlist instead of only collecting options.

- Pick one film from the current watchlist.
- Let the user reroll without repeating a film until every option has appeared.
- Open the selected film's details directly.
- Handle empty and single-film watchlists clearly.

## Worth implementing

### 2. Watched history

Mark a film as watched, record when it was watched, and keep it in a separate history instead of deleting it.

### 3. Personal reactions

Let each viewer add a simple rating or reaction after watching, while preserving whose reaction it is.

### 4. Private access

Require authentication or an invite link so the shared list is not publicly readable or editable.

### 5. Reliable recovery and conflict handling

Test deletion, Undo, and real-time updates across two devices, and show clear recovery messages when the server rejects a change.

### 6. Mobile and keyboard polish

Improve filter and detail interactions on small screens, add predictable focus behavior, and support the main actions from a keyboard.

### 7. Production visibility

Add error monitoring and lightweight usage events for failed searches, failed mutations, and feature adoption without collecting unnecessary personal data.

## Not yet

- Social profiles, public lists, and follower features.
- Recommendation algorithms that require substantial personal data.
- Native mobile apps while the responsive website covers the core use case.
