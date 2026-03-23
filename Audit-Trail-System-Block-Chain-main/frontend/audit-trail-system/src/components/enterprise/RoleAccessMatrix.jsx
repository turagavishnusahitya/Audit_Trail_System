import RoleBadge from './RoleBadge';

const ROLE_PERMISSIONS = [
  {
    role: 'ADMIN',
    permissions: ['Register users', 'Manage files', 'View analytics', 'Monitor blockchain activity'],
  },
  {
    role: 'INSPECTOR',
    permissions: ['Create inspections', 'Submit inspections', 'Upload files', 'Store hash on blockchain'],
  },
  {
    role: 'APPROVER',
    permissions: ['Review submitted inspections', 'Approve/reject inspections', 'Lock approved records'],
  },
  {
    role: 'AUDITOR',
    permissions: ['Verify integrity', 'Review audit trail', 'Analyze tamper evidence'],
  },
];

export default function RoleAccessMatrix() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-900">Role-Based Access Dashboard</h2>
      <p className="mt-1 text-sm text-slate-500">
        Access controls enforce least privilege and strengthen non-repudiation.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {ROLE_PERMISSIONS.map((entry) => (
          <div key={entry.role} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{entry.role}</p>
              <RoleBadge role={entry.role} />
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {entry.permissions.map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
