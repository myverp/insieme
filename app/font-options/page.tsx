import Link from "next/link";

const fontOptions = [
  { name: "Georgia", mood: "Literary and warm", family: "Georgia, 'Times New Roman', serif" },
  { name: "Trebuchet", mood: "Friendly and easygoing", family: "'Trebuchet MS', Arial, sans-serif" },
  { name: "Segoe UI", mood: "Calm and modern", family: "'Segoe UI', Arial, sans-serif" },
  { name: "Constantia", mood: "Editorial and refined", family: "Constantia, Georgia, serif" },
  { name: "Candara", mood: "Soft and human", family: "Candara, Calibri, sans-serif" },
  { name: "Cambria", mood: "Classic and readable", family: "Cambria, Georgia, serif" },
  { name: "Corbel", mood: "Light and contemporary", family: "Corbel, Calibri, sans-serif" },
  { name: "Verdana", mood: "Open and practical", family: "Verdana, Geneva, sans-serif" },
  { name: "Tahoma", mood: "Compact and precise", family: "Tahoma, Verdana, sans-serif" },
  { name: "Century Gothic", mood: "Simple and geometric", family: "'Century Gothic', Futura, sans-serif" },
] as const;

export default function FontOptionsPage() {
  return (
    <main className="font-options-page">
      <header className="font-options-header">
        <div>
          <h1>Ten font directions</h1>
          <p>Each option uses one family for the logo, headings, labels, film titles, and buttons so the whole site stays visually consistent.</p>
        </div>
        <Link href="/">Back to films</Link>
      </header>

      <div className="font-options-grid">
        {fontOptions.map((option, index) => (
          <section className="font-option-card" style={{ fontFamily: option.family }} key={option.name}>
            <div className="font-option-topline">
              <span>Option {index + 1}</span>
              <small>{option.mood}</small>
            </div>
            <h2>Insieme</h2>
            <h3>Kiki&apos;s Delivery Service</h3>
            <p>A shared film list for quiet evenings, discoveries, and favourites worth watching together.</p>
            <button type="button">Search films</button>
          </section>
        ))}
      </div>
    </main>
  );
}
