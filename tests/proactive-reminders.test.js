import assert from 'node:assert/strict';
import test from 'node:test';
import { getProactiveReminderSlot } from '../src/services/notifications.js';

test('creates two-hour reminder slots from 08:00 through 20:00', () => {
  const slots = [
    [8, 'slot-08'],
    [9, 'slot-08'],
    [10, 'slot-10'],
    [11, 'slot-10'],
    [12, 'slot-12'],
    [13, 'slot-12'],
    [14, 'slot-14'],
    [15, 'slot-14'],
    [16, 'slot-16'],
    [17, 'slot-16'],
    [18, 'slot-18'],
    [19, 'slot-18'],
    [20, 'slot-20'],
    [21, 'slot-20']
  ];

  for (const [hour, expectedId] of slots) {
    assert.equal(getProactiveReminderSlot(new Date(2026, 9, 29, hour)).id, expectedId);
  }
});

test('does not send proactive reminders outside daytime hours', () => {
  assert.equal(getProactiveReminderSlot(new Date(2026, 9, 29, 7)), null);
  assert.equal(getProactiveReminderSlot(new Date(2026, 9, 29, 22)), null);
  assert.equal(getProactiveReminderSlot(new Date(2026, 9, 29, 23)), null);
});
