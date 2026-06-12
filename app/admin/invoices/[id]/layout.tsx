// Server component — provides generateStaticParams for Tauri static export

export function generateStaticParams() {
  return [
    { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' },
  ];
}

export default function InvoiceDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
