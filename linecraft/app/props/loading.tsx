export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <h1>Props today</h1>
      <div className="table-wrap" style={{ height: 480 }}><span className="vh">Loading props</span></div>
    </div>
  );
}
