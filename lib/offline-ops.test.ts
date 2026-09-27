import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldQueueOfflineMutation } from './offline-ops.ts';

test('queues network errors for offline sync', () => {
  assert.equal(shouldQueueOfflineMutation(new Error('NetworkError when attempting to fetch resource')), true);
  assert.equal(shouldQueueOfflineMutation(new Error('Failed to fetch')) , true);
  assert.equal(shouldQueueOfflineMutation(new Error('Validation failed: supplier required')), false);
  assert.equal(shouldQueueOfflineMutation(new Error('HTTP Error 401: unauthorized')), false);
});
