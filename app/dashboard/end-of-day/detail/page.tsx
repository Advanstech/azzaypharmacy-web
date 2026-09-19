'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import ClientPage from '../[id]/ClientPage';

// Static-export safe detail route — dynamic [id] paths aren't emitted by
// `output: 'export'`, so the desktop app navigates here with ?id= instead.
function Detail() {
  const searchParams = useSearchParams();
  const params = useMemo(
    () => Promise.resolve({ id: searchParams?.get('id') ?? '' }),
    [searchParams]
  );
  return <ClientPage params={params} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Detail />
    </Suspense>
  );
}
