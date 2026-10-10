import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <h1>Sign in</h1>
      <div className="card" style={{ maxWidth: 420 }}>
        <p className="muted sm">We email you a one-time link. No password to remember.</p>
        <form className="grid" aria-describedby="signin-note">
          <label className="field">Email<input className="input" type="email" name="email" autoComplete="email" required disabled /></label>
          <button className="btn btn-primary" type="submit" disabled>Email me a link</button>
        </form>
        <p id="signin-note" className="xs muted">Accounts arrive with the backend (Supabase Auth). Until then the app works without one: your saved props stay in this browser.</p>
      </div>
    </>
  );
}
