import FilmWorkspace from "./film-workspace";

export default function Home({ searchParams }: { searchParams: Promise<{ joined?: string }> }) {
  return <FilmWorkspace searchParams={searchParams} />;
}
