"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfile } from "./actions";

export function ProfileForm({ displayName, error, saved }: { displayName: string; error?: string; saved: boolean }) {
  const [name, setName] = useState(displayName);
  const normalizedName = name.trim();
  const unchanged = normalizedName === displayName;

  return (
    <form action={updateProfile} className="profile-form">
      <label htmlFor="display-name">Display name</label>
      <input
        id="display-name"
        name="displayName"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={80}
        required
        autoComplete="name"
      />
      {error ? <p className="profile-error" role="alert">{error}</p> : null}
      {saved && unchanged ? <p className="profile-success" role="status">Your display name was saved.</p> : null}
      <SaveButton disabled={!normalizedName || unchanged} />
    </form>
  );
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending}>{pending ? "Saving…" : "Save name"}</button>;
}
