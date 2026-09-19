'use client';

import { Suspense } from 'react';
import ClientPage from '../[id]/ClientPage';

// Static-export safe detail route — dynamic [id] paths aren't emitted by
// `output: 'export'`, so the desktop app navigates here with ?id= instead.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ClientPage />
    </Suspense>
  );
}
