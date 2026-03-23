import { Home, FileText, Database, ListChecks, BarChart3, Settings, ShieldCheck } from 'lucide-react';

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'fileManagement', label: 'File Management', icon: FileText },
  { key: 'blockchain', label: 'Blockchain', icon: Database },
  { key: 'auditLogs', label: 'Audit Logs', icon: ListChecks },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'enterprise', label: 'Enterprise Lab', icon: ShieldCheck },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeSection, onSelect }) {
  return (
    <aside className="relative flex h-full flex-col border-r border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-brand-100/60 to-transparent" />

      <div className="relative px-6 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-500 text-white shadow-soft transition-transform duration-300 hover:scale-105">
            <span className="text-lg font-bold">A</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Audit Trail</p>
            <p className="text-xs text-slate-500">Quality Inspection</p>
          </div>
        </div>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-4 pb-8">
        <ul className="space-y-1">
          {MENU_ITEMS.map((item) => {
            const active = activeSection === item.key;
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onSelect(item.key)}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'translate-x-1 bg-gradient-to-r from-brand-600/15 to-indigo-500/10 text-brand-700 shadow-soft'
                      : 'text-slate-600 hover:translate-x-1 hover:bg-slate-100/90 hover:text-slate-900'
                  }`}
                >
                  {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-brand-600" />}
                  <Icon className={`h-4 w-4 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative px-6 pb-6">
        <div className="rounded-xl border border-slate-200/90 bg-white/90 p-4 shadow-soft">
          <p className="text-xs text-slate-500">Need help?</p>
          <p className="mt-1 text-sm font-medium text-slate-700">Check docs or reach out to your team</p>
        </div>
      </div>
    </aside>
  );
}
