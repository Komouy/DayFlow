import assert from 'node:assert/strict';
import test from 'node:test';
import { state } from '../src/services/state.js';

test('pinned notes toggle and sort before newer unpinned notes', () => {
  const pinnedId = `pin_test_${Date.now()}_pinned`;
  const unpinnedId = `${pinnedId}_newer`;

  try {
    state.addNote({ id: pinnedId, title: 'Pinned test', content: 'Older note' });
    state.notes.find((note) => note.id === pinnedId).updatedAt = 1;
    state.addNote({ id: unpinnedId, title: 'Unpinned test', content: 'Newer note' });

    assert.deepEqual(
      state.getNotes().filter((note) => [pinnedId, unpinnedId].includes(note.id)).map((note) => note.id),
      [unpinnedId, pinnedId]
    );

    const pinnedNote = state.togglePinNote(pinnedId);
    assert.equal(pinnedNote.pinned, true);
    assert.deepEqual(
      state.getNotes().filter((note) => [pinnedId, unpinnedId].includes(note.id)).map((note) => note.id),
      [pinnedId, unpinnedId]
    );

    assert.equal(state.togglePinNote(pinnedId).pinned, false);
  } finally {
    state.deleteNote(pinnedId);
    state.deleteNote(unpinnedId);
  }
});
