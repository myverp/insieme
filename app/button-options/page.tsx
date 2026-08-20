import Link from "next/link";

const options = [
  { id: "label", name: "1. Bin + label", note: "Clear and familiar, with a quiet outline." },
  { id: "icon", name: "2. Bin icon only", note: "Compact; the full action appears as an accessible tooltip." },
  { id: "minus", name: "3. Remove from list", note: "A minus symbol feels less destructive than a bin." },
  { id: "bookmark", name: "4. Unsave", note: "Frames the action as removing a saved choice." },
  { id: "solid", name: "5. Solid bin", note: "The strongest option, best when removal must be obvious." },
] as const;

export default function ButtonOptionsPage() {
  return (
    <main className="options-page">
      <header className="options-header">
        <div>
          <p className="options-kicker">Insieme</p>
          <h1>Remove button options</h1>
          <p>Search is fixed as soft solid. Choose a style for removing films.</p>
        </div>
        <Link href="/">Back to films</Link>
      </header>

      <section className="chosen-search" aria-label="Selected Search button">
        <div>
          <span>Selected</span>
          <h2>Soft solid Search</h2>
        </div>
        <button type="button">Search</button>
      </section>

      <div className="button-options-list">
        {options.map((option) => (
          <section className="button-option" key={option.id}>
            <div>
              <h2>{option.name}</h2>
              <p>{option.note}</p>
            </div>
            <div className={`remove-sample remove-sample-${option.id}`}>
              <RemoveOption id={option.id} />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function RemoveOption({ id }: { id: (typeof options)[number]["id"] }) {
  if (id === "icon") {
    return <button type="button" aria-label="Remove film" title="Remove film"><TrashIcon /></button>;
  }
  if (id === "minus") {
    return <button type="button"><MinusCircleIcon />Remove</button>;
  }
  if (id === "bookmark") {
    return <button type="button"><BookmarkMinusIcon />Unsave</button>;
  }
  return <button type="button"><TrashIcon />Remove</button>;
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
    </svg>
  );
}

function MinusCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M9 12h6" />
    </svg>
  );
}

function BookmarkMinusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h10v16l-5-3-5 3V4Z" />
      <path d="M9.5 10h5" />
    </svg>
  );
}
