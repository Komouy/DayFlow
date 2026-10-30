import assert from 'node:assert/strict';
import test from 'node:test';
import { formatFileSize } from '../src/services/noteAttachments.js';

test('formats an empty attachment total as zero instead of one kilobyte', () => {
  assert.equal(formatFileSize(0), '0 B');
});
