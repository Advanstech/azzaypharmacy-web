'use client';

import { useState, useEffect } from 'react';
import { 
  nativeCreateBackup, 
  nativeListBackups, 
  nativeRestoreBackup, 
  nativeDeleteBackup, 
  BackupInfo, 
  isTauri 
} from '@/lib/tauri-native';
import { exportIndexedDB, importIndexedDB } from '@/lib/offline';
import { errorHandler, ErrorCategory, ErrorSeverity } from '@/lib/error-handler';
import { Database, Download, Trash2, RefreshCw } from 'lucide-react';

export default function BackupManagementPanel() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);

  const loadBackups = async () => {
    if (!isTauri()) {
      setSupported(false);
      return;
    }
    try {
      const list = await nativeListBackups();
      setBackups(list);
    } catch (err: any) {
      errorHandler.handleBackupError('list_backups', err);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    if (!isTauri()) return;
    setLoading(true);
    try {
      const data = await exportIndexedDB();
      await nativeCreateBackup(data);
      await loadBackups();
    } catch (err: any) {
      errorHandler.handleBackupError('create_backup', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (path: string) => {
    if (!confirm('Are you sure you want to restore this backup? Current offline data will be replaced.')) return;
    setLoading(true);
    try {
      const data = await nativeRestoreBackup(path);
      await importIndexedDB(data);
      alert('Backup restored successfully!');
    } catch (err: any) {
      errorHandler.handleBackupError('restore_backup', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (path: string) => {
    if (!confirm('Delete this backup?')) return;
    try {
      await nativeDeleteBackup(path);
      await loadBackups();
    } catch (err: any) {
      errorHandler.handleBackupError('delete_backup', err);
    }
  };

  if (!supported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-yellow-700">Backup management is only supported in the Tauri Desktop App.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold flex items-center"><Database className="mr-2" /> Offline Data Backups</h2>
        <button 
          onClick={handleCreateBackup} 
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          {loading ? <RefreshCw className="mr-2 animate-spin w-4 h-4" /> : <Download className="mr-2 w-4 h-4" />}
          Create Backup
        </button>
      </div>

      {backups.length === 0 ? (
        <p className="text-gray-500">No backups found.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {backups.map(b => (
            <li key={b.path} className="py-3 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">{b.name}</p>
                <p className="text-sm text-gray-500">
                  {new Date(b.created_at * 1000).toLocaleString()} • {(b.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleRestore(b.path)}
                  disabled={loading}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Restore
                </button>
                <button 
                  onClick={() => handleDelete(b.path)}
                  disabled={loading}
                  className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
