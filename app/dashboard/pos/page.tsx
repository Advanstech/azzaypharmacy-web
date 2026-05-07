'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function POSRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the standalone POS terminal
    router.replace('/pos');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      <p className="text-sm font-medium text-slate-500 animate-pulse">
        Opening Standalone POS Terminal...
      </p>
    </div>
  );
}
