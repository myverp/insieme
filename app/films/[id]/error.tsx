"use client";

import Link from "next/link";

export default function FilmError({ reset }: { reset: () => void }) {
  return <main className="profile-page"><p className="eyebrow">INSIEME</p><h1>Film details are unavailable.</h1><p>The film service could not be reached. Your Watchlist is still saved.</p><div className="review-actions"><button type="button" onClick={reset}>Try again</button><Link href="/">Back to Discover</Link></div></main>;
}
