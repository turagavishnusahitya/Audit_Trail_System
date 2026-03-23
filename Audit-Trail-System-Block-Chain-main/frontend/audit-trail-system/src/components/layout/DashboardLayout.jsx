import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout({ children, activeSection, onSectionChange }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <Topbar onToggleMobileMenu={() => setIsMobileOpen((prev) => !prev)} />

      <div className="relative flex min-h-[calc(100vh-4rem)]">
        {isMobileOpen && (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] xl:hidden"
          />
        )}

        <div
          className={`fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-72 transform bg-white/80 backdrop-blur transition-transform duration-300 xl:sticky xl:top-16 xl:h-[calc(100vh-4rem)] xl:translate-x-0 xl:shrink-0 ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            activeSection={activeSection}
            onSelect={(section) => {
              onSectionChange(section);
              setIsMobileOpen(false);
            }}
          />
        </div>

        <main className="relative flex-1 min-w-0">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 right-12 h-64 w-64 rounded-full bg-brand-200/30 blur-3xl" />
            <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-sky-200/20 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="animate-fade-in-up">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
