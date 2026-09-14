import Link from "next/link";

export default function FilmNotFound() {
  return <main className="profile-page"><p className="eyebrow">INSIEME</p><h1>Film not found.</h1><p>This film may no longer be available.</p><Link href="/">Back to Discover</Link></main>;
}
