/** Restrict sign-in redirects to supported destinations inside Insieme. */
export function safeDestination(value: unknown): string | null {
  if (typeof value !== "string" || value.includes("\\")) return null;
  if (value === "/" || value.startsWith("/?")) return value;
  if (/^\/films\/\d+(?:\?[^#]*)?$/.test(value)) return value;
  if (/^\/invite\/[0-9a-f-]+(?:\?[^#]*)?$/i.test(value)) return value;
  return null;
}
