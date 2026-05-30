'use client';

import { Building2, Activity, Shield, Database } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const settingsTabs = [
  { label: 'Organization', href: '/admin/settings/organization', icon: Building2 },
  { label: 'Branches', href: '/admin/settings/branches', icon: Activity },
  { label: 'Security', href: '/admin/settings/security', icon: Shield },
  { label: 'System', href: '/admin/settings/system', icon: Database },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">System Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your organization, branches, and security configurations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
        {settingsTabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-red-500 dark:text-red-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
