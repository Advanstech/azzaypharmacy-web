'use client';

import { useState } from 'react';
import { useErrorMonitoring, ErrorCategory } from '@/lib/error-handler';
import { gql } from '@/lib/gql';
import { ShieldAlert, Check } from 'lucide-react';

const RESOLVE_CONFLICT_MUTATION = `
  mutation ResolveSyncConflict($saleId: ID!, $strategy: String!) {
    resolveSyncConflict(saleId: $saleId, strategy: $strategy)
  }
`;

export default function ConflictResolutionPanel() {
  const { logs, resolve } = useErrorMonitoring();
  const [resolving, setResolving] = useState<string | null>(null);

  const conflicts = logs.filter(e => e.category === ErrorCategory.CONFLICT && !e.resolved);

  const handleResolve = async (errorId: string, saleId: string, strategy: 'server_wins' | 'client_wins') => {
    setResolving(errorId);
    try {
      await gql(RESOLVE_CONFLICT_MUTATION, { saleId, strategy });
      resolve(errorId);
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
      alert('Failed to resolve conflict. Check network connection.');
    } finally {
      setResolving(null);
    }
  };

  if (conflicts.length === 0) {
    return null; // Don't show if there are no conflicts
  }

  return (
    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
      <h2 className="text-lg font-bold text-orange-800 flex items-center mb-4">
        <ShieldAlert className="mr-2" /> Sync Conflicts Detected ({conflicts.length})
      </h2>
      <p className="text-orange-700 text-sm mb-4">
        The following sales have conflicting data between your local device and the server.
        Please choose a resolution strategy.
      </p>

      <ul className="space-y-3">
        {conflicts.map(conflict => {
          const saleId = conflict.details?.saleId;
          return (
            <li key={conflict.id} className="p-3 bg-white border border-orange-100 rounded flex flex-col md:flex-row md:justify-between md:items-center">
              <div>
                <p className="font-medium">Sale ID: {saleId}</p>
                <p className="text-sm text-gray-500">{conflict.message}</p>
              </div>
              <div className="flex space-x-2 mt-3 md:mt-0">
                <button
                  onClick={() => handleResolve(conflict.id, saleId, 'server_wins')}
                  disabled={resolving === conflict.id}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-sm flex items-center"
                >
                  {resolving === conflict.id ? '...' : 'Keep Server Version'}
                </button>
                <button
                  onClick={() => handleResolve(conflict.id, saleId, 'client_wins')}
                  disabled={resolving === conflict.id}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm flex items-center"
                >
                  {resolving === conflict.id ? '...' : 'Force Local Version'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
