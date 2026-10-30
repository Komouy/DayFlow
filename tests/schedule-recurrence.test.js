import assert from 'node:assert/strict';
import test from 'node:test';
import { StateManager } from '../src/services/state.js';

function createManager() {
  const manager = new StateManager();
  manager.schedules = [];
  return manager;
}

function addRecurringSchedule(manager, recurrence) {
  return manager.addSchedule({
    title: `Rutinitas ${recurrence}`,
    date: '2026-10-30',
    time: '14:00',
    recurrence
  });
}

test('creates recurring daily, weekday, and weekly schedule occurrences', () => {
  const manager = createManager();
  addRecurringSchedule(manager, 'daily');
  addRecurringSchedule(manager, 'weekdays');
  addRecurringSchedule(manager, 'weekly');

  const friday = manager.getSchedules('2026-11-06');
  assert.equal(friday.length, 3);
  assert.ok(friday.every((schedule) => schedule.isRecurring));

  const saturday = manager.getSchedules('2026-11-07');
  assert.deepEqual(
    saturday.map((schedule) => schedule.recurrence).sort(),
    ['daily']
  );
});

test('recurring schedule does not appear before its start date', () => {
  const manager = createManager();
  addRecurringSchedule(manager, 'daily');

  assert.deepEqual(manager.getSchedules('2026-10-29'), []);
});

test('completion of a recurring occurrence is stored for that date only', () => {
  const manager = createManager();
  const schedule = addRecurringSchedule(manager, 'weekly');

  manager.toggleScheduleComplete(schedule.id, '2026-11-06');

  assert.equal(manager.getSchedules('2026-11-06')[0].completed, true);
  assert.equal(manager.getSchedules('2026-11-13')[0].completed, false);
});
