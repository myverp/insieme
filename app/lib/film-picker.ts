export function pickFilm<T extends { id: number }>(films: readonly T[], seen: readonly number[], random = Math.random): { film: T; seen: number[] } | null {
  if (!films.length) return null;
  const currentIds = new Set(films.map((film) => film.id));
  let cycle = seen.filter((id) => currentIds.has(id));
  let candidates = films.filter((film) => !cycle.includes(film.id));
  if (!candidates.length) {
    // Start a new cycle without immediately repeating the last choice.
    candidates = films.length > 1 ? films.filter((film) => film.id !== cycle.at(-1)) : [...films];
    cycle = [];
  }
  const film = candidates[Math.floor(random() * candidates.length)];
  return { film, seen: [...cycle, film.id] };
}
