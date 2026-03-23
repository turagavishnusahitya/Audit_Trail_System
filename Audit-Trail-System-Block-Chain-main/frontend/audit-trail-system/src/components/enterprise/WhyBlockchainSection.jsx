export default function WhyBlockchainSection() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-900">Why Blockchain?</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-800">Centralized Risk</p>
          <p className="mt-2 text-sm text-rose-700">
            Single-database systems can be silently altered by privileged actors, weakening trust and traceability.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">Decentralized Assurance</p>
          <p className="mt-2 text-sm text-emerald-700">
            Blockchain creates a shared, immutable proof layer where approvals and hashes cannot be repudiated.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        <li>Hashing protects privacy by storing proofs, not full records, on-chain.</li>
        <li>Smart contracts enforce workflow constraints and immutable approval state.</li>
        <li>Event logs provide transparent evidence for audit and forensic analysis.</li>
      </ul>
    </section>
  );
}
