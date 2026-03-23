const LIFECYCLE_STEPS = [
  { key: 'CREATED', label: 'CREATED', aliases: ['CREATED'] },
  { key: 'SUBMITTED', label: 'PENDING APPROVAL', aliases: ['SUBMITTED'] },
  { key: 'APPROVED', label: 'APPROVED (LOCKED)', aliases: ['APPROVED'] },
  { key: 'VERIFIED', label: 'VERIFIED', aliases: ['VERIFIED'] },
];

function getEventForStep(timeline, aliases) {
  if (!Array.isArray(timeline)) return null;
  return timeline.find((event) => aliases.includes((event.type || '').toUpperCase())) || null;
}

export default function InspectionLifecycleVisualization({ timeline }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-900">Inspection Lifecycle Visualization</h2>
      <p className="mt-1 text-sm text-slate-500">
        CREATED -&gt; PENDING APPROVAL -&gt; APPROVED (LOCKED) -&gt; VERIFIED
      </p>

      <div className="mt-6 grid gap-4">
        {LIFECYCLE_STEPS.map((step, index) => {
          const event = getEventForStep(timeline, step.aliases);
          const isCompleted = !!event;

          return (
            <div key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-300 bg-white text-slate-500'
                  }`}
                >
                  {index + 1}
                </span>
                {index < LIFECYCLE_STEPS.length - 1 && <span className="mt-1 h-10 w-px bg-slate-300" />}
              </div>

              <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{step.label}</p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isCompleted ? 'Completed' : 'Pending'}
                  </span>
                </div>

                {event ? (
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <p>Time: {new Date(event.timestamp).toLocaleString()}</p>
                    {event.actor && <p>Actor: {event.actor}</p>}
                    {event.txHash && (
                      <p className="break-words">
                        Tx: <code>{event.txHash}</code>
                      </p>
                    )}
                    {event.details && <p>Action: {event.details}</p>}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">No action recorded yet.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
