import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card" style={{ marginTop: "var(--s6)" }} role="status">
      <h1 style={{ marginTop: 0 }}>Not on today&apos;s board</h1>
      <p className="muted">That player or game isn&apos;t in today&apos;s slate. It may have been yesterday&apos;s.</p>
      <Link className="btn btn-primary" href="/props">Back to props</Link>
    </div>
  );
}
