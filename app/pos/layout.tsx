// POS Terminal — standalone layout, no sidebar
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'POS Terminal — Azzay Pharmacy NEXUS',
};

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
