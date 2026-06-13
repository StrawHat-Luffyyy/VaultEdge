'use client';

import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/overview': 'Overview',
  '/projects': 'Projects',
  '/api-keys': 'API Keys',
  '/usage': 'Usage & Analytics',
  '/providers': 'Providers',
  '/prompts': 'Prompt Templates',
  '/audit-log': 'Audit Log',
  '/settings': 'Settings',
  '/members': 'Members',
  '/budgets': 'Budgets',
  '/alerts': 'Alerts',
};

export function Topbar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? 'Dashboard';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Quick actions */}
        <div className="flex h-8 items-center gap-1 rounded-lg border border-border bg-secondary/50 px-2.5 text-xs text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span>Search...</span>
          <kbd className="ml-2 rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
          <span>Operational</span>
        </div>
      </div>
    </header>
  );
}
