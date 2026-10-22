import test from 'node:test';
import assert from 'node:assert/strict';

import { canSyncQueuedOperation, shouldQueueOfflineMutation } from './offline-ops';

test('queued work syncs only for its owning user', () => {
  assert.equal(canSyncQueuedOperation('cashier-a', 'cashier-a'), true);
  assert.equal(canSyncQueuedOperation('cashier-a', 'cashier-b'), false);
  assert.equal(canSyncQueuedOperation(undefined, 'cashier-a'), false);
  assert.equal(canSyncQueuedOperation('cashier-a', null), false);
});

test('queues network errors for offline sync', () => {
  assert.equal(shouldQueueOfflineMutation(new Error('NetworkError when attempting to fetch resource')), true);
  assert.equal(shouldQueueOfflineMutation(new Error('Failed to fetch')) , true);
  assert.equal(shouldQueueOfflineMutation(new Error('Validation failed: supplier required')), false);
  assert.equal(shouldQueueOfflineMutation(new Error('HTTP Error 401: unauthorized')), false);
});
