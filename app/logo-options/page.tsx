import Link from "next/link";

const logoOptions = [
  { id: "bounce", name: "Bouncy letters", note: "Playful, light, and a little imperfect." },
  { id: "ticket", name: "Cinema ticket", note: "A compact wordmark framed like a film ticket." },
  { id: "heart", name: "Heart dot", note: "A small romantic detail without becoming sugary." },
  { id: "scribble", name: "Scribbled underline", note: "Casual, personal, and handmade." },
  { id: "popcorn", name: "Popcorn night", note: "Warm cinema-night energy with a tiny kernel accent." },
  { id: "split", name: "Two of us", note: "Two colours meet inside one shared name." },
  { id: "sticker", name: "Sticker", note: "Bold and cheerful, like a favourite notebook sticker." },
  { id: "marquee", name: "Mini marquee", note: "A quiet nod to classic cinema signs." },
  { id: "wave", name: "Easy wave", note: "Relaxed letters with an easygoing rhythm." },
  { id: "flower", name: "Little flower", note: "The simplest wordmark with one cheerful five-petal flower." },
] as const;

export default function LogoOptionsPage() {
  return (
    <main className="logo-options-page">
      <header className="logo-options-header">
        <div>
          <p>Insieme identity</p>
          <h1>Ten fun logo ideas</h1>
          <span>All ten stay readable and work as a simple heading—no separate icon required.</span>
        </div>
        <Link href="/">Back to films</Link>
      </header>

      <div className="logo-options-grid">
        {logoOptions.map((option, index) => (
          <section className={`logo-option logo-option-${option.id}`} key={option.id}>
            <div className="logo-option-number">{String(index + 1).padStart(2, "0")}</div>
            <div className="logo-preview" aria-label={`Insieme, ${option.name} logo option`}>
              <span className="logo-word" aria-hidden="true">
                {option.id === "bounce" ? <><i>I</i><i>n</i><i>s</i><i>i</i><i>e</i><i>m</i><i>e</i></> : "Insieme"}
              </span>
              {option.id === "heart" ? <b aria-hidden="true">♥</b> : null}
              {option.id === "popcorn" ? <b aria-hidden="true">●</b> : null}
              {option.id === "flower" ? (
                <span className="flower-mark" aria-hidden="true"><i /><i /><i /><i /><i /></span>
              ) : null}
            </div>
            <h2>{option.name}</h2>
            <p>{option.note}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
