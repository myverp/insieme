export type Profile = { userId: string; displayName: string };

export function initials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts.at(-1)?.[0] ?? "" : "");
}

export function ProfileAvatar({ displayName, small = false }: { displayName: string; small?: boolean }) {
  return <span className={`profile-avatar${small ? " profile-avatar-small" : ""}`} aria-hidden="true">{initials(displayName).toUpperCase()}</span>;
}
