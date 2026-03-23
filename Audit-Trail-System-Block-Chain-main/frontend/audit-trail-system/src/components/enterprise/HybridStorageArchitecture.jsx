export default function HybridStorageArchitecture() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-900">Hybrid Storage Architecture</h2>
      <p className="mt-1 text-sm text-slate-500">
        Full records remain off-chain for scalability, while cryptographic fingerprints are anchored on-chain for immutability.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-sky-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Frontend</p>
          <p className="mt-2 text-sm text-slate-700">Inspector submits inspection payload via secure API.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Backend + MongoDB</p>
          <p className="mt-2 text-sm text-slate-700">Stores full structured data and timeline metadata for rich queries.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Blockchain</p>
          <p className="mt-2 text-sm text-slate-700">Stores only SHA-256 hash and approval evidence for tamper-proof auditability.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-800">Data Flow</p>
        <p className="mt-1">Frontend -&gt; Backend -&gt; MongoDB (full data)</p>
        <p className="mt-1">Backend -&gt; SHA-256 fingerprint -&gt; Blockchain (proof anchor)</p>
      </div>
    </section>
  );
}
