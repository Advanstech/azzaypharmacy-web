'use client';

import { FileText, DollarSign, Truck } from 'lucide-react';

export type ProductModalTab = 'basic' | 'pricing' | 'supplier';

interface ProductModalTabsProps {
  active: ProductModalTab;
  onSelect: (tab: ProductModalTab) => void;
  primary: string;
  muted: string;
}

const TABS = [
  { id: 'basic' as ProductModalTab, label: 'Basic Info', icon: FileText },
  { id: 'pricing' as ProductModalTab, label: 'Pricing & Stock', icon: DollarSign },
  { id: 'supplier' as ProductModalTab, label: 'Supplier & Media', icon: Truck },
];

export function ProductModalTabs({ active, onSelect, primary, muted }: ProductModalTabsProps) {
  return (
    <div className="flex px-6 pt-4 border-b gap-6" style={{ borderColor: 'rgba(148,163,184,0.12)' }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className="flex items-center gap-2 pb-3 text-sm font-bold transition-colors relative"
          style={{ color: active === tab.id ? primary : muted }}
        >
          <tab.icon size={16} />
          {tab.label}
          {active === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: primary }} />
          )}
        </button>
      ))}
    </div>
  );
}
