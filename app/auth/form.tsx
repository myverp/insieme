import type { ReactNode } from "react";
import { InsiemeLogo } from "@/app/logo";

type AuthFormProps = {
  title: string;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  error?: string;
  message?: string;
  next?: string;
  showDisplayName?: boolean;
  children: ReactNode;
};

export function AuthForm({ title, action, submitLabel, error, message, next, showDisplayName = false, children }: AuthFormProps) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand"><InsiemeLogo /></div>
        <h1>{title}</h1>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        {message ? <p className="auth-message" role="status">{message}</p> : null}
        <form action={action}>
          {next ? <input type="hidden" name="next" value={next} /> : null}
          {showDisplayName ? <><label htmlFor="display-name">Display name</label><input id="display-name" name="displayName" type="text" autoComplete="name" maxLength={80} required /></> : null}
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required />
          <button type="submit">{submitLabel}</button>
        </form>
        <div className="auth-switch">{children}</div>
      </section>
    </main>
  );
}
