const ROLE_STYLES = {
  ADMIN: 'bg-violet-100 text-violet-700',
  INSPECTOR: 'bg-sky-100 text-sky-700',
  APPROVER: 'bg-emerald-100 text-emerald-700',
  AUDITOR: 'bg-amber-100 text-amber-700',
  NONE: 'bg-slate-100 text-slate-700',
};

export default function RoleBadge({ role }) {
  const normalizedRole = (role || 'NONE').toUpperCase();
  const style = ROLE_STYLES[normalizedRole] || ROLE_STYLES.NONE;

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${style}`}>
      {normalizedRole}
    </span>
  );
}
