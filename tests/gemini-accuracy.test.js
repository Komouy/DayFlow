import assert from 'node:assert/strict';
import test from 'node:test';
import { getLocalDateString, state } from '../src/services/state.js';
import { GeminiService } from '../src/services/gemini.js';

function buildSchedule(overrides = {}) {
  return {
    title: 'Belajar Matematika',
    date: getLocalDateString(),
    time: '09:00',
    duration: 60,
    category: 'Fokus',
    recurrence: 'none',
    priority: 'medium',
    ...overrides
  };
}

function scheduleResponse(schedule) {
  return `[DAYFLOW_SCHEDULES]\n${JSON.stringify([schedule])}\n[/DAYFLOW_SCHEDULES]`;
}

test('does not infer a schedule from unstructured prose', () => {
  const parsed = GeminiService.parseStructuredSchedules('Besok pukul 09:00 belajar matematika.');
  assert.deepEqual(parsed, []);
});

test('rejects a specific schedule when its date or time is missing from the request', () => {
  const schedule = buildSchedule({ date: getLocalDateString() });
  const response = scheduleResponse(schedule);

  assert.deepEqual(
    GeminiService.parseStructuredSchedules(response, { userContext: 'Jadwalkan belajar matematika pukul 09:00.' }),
    []
  );
  assert.deepEqual(
    GeminiService.parseStructuredSchedules(response, { userContext: 'Jadwalkan belajar matematika hari ini.' }),
    []
  );
});

test('accepts a schedule only when its explicit date and time match the request', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = getLocalDateString(tomorrow);
  const response = scheduleResponse(buildSchedule({ date: tomorrowString, time: '10:30' }));

  const parsed = GeminiService.parseStructuredSchedules(response, {
    userContext: 'Jadwalkan belajar matematika besok pukul 10:30.'
  });

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].date, tomorrowString);
  assert.equal(parsed[0].time, '10:30');
});

test('supports explicit Indonesian calendar dates and rejects ambiguous hour-only times', () => {
  const date = '2026-10-30';
  const calendarDateResponse = scheduleResponse(buildSchedule({ date, time: '10:00' }));
  const parsedDate = GeminiService.parseStructuredSchedules(calendarDateResponse, {
    userContext: 'Jadwalkan belajar matematika tanggal 30 Oktober 2026 pukul 10:00.'
  });
  const ambiguousTime = GeminiService.parseStructuredSchedules(
    scheduleResponse(buildSchedule({ date: getLocalDateString(), time: '08:00' })),
    { userContext: 'Jadwalkan belajar matematika hari ini jam 8.' }
  );

  assert.equal(parsedDate.length, 1);
  assert.deepEqual(ambiguousTime, []);
});

test('resolves a time-period phrase only when the day period is clear', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = getLocalDateString(tomorrow);
  const parsed = GeminiService.parseStructuredSchedules(
    scheduleResponse(buildSchedule({ date, time: '20:00' })),
    { userContext: 'Jadwalkan belajar matematika besok malam jam 8.' }
  );

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].time, '20:00');
});

test('accepts a user-confirmed schedule date from the preceding clarification', () => {
  const parsed = GeminiService.parseStructuredSchedules(
    scheduleResponse(buildSchedule({ date: '2026-10-31', time: '15:00' })),
    {
      userContext: [
        'hari minggu ada deadline tugas kalkulus jam 6',
        'Jika ya, pukul berapa kamu ingin mulai mengerjakannya pada hari Sabtu, 31 Oktober 2026?',
        'ya, pukul 3 sore'
      ].join('\n')
    }
  );

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].date, '2026-10-31');
  assert.equal(parsed[0].time, '15:00');
});

test('does not treat a time mentioned only in the assistant question as user-confirmed', () => {
  const parsed = GeminiService.parseStructuredSchedules(
    scheduleResponse(buildSchedule({ date: '2026-10-31', time: '18:00' })),
    {
      userContext: [
        'hari minggu ada deadline tugas kalkulus jam 6',
        'Jika ya, pukul berapa kamu ingin mulai mengerjakannya pada hari Sabtu, 31 Oktober 2026?',
        'ya'
      ].join('\n')
    }
  );

  assert.deepEqual(parsed, []);
});

test('natural schedule parser asks for missing date or time before making a model request', async () => {
  await assert.rejects(
    GeminiService.parseNaturalSchedule('Jadwalkan belajar matematika pukul 10:00.'),
    /Tanggal jadwal belum jelas/
  );
  await assert.rejects(
    GeminiService.parseNaturalSchedule('Jadwalkan belajar matematika hari ini.'),
    /Waktu mulai belum jelas/
  );
});

test('allows AI-generated time slots for an explicitly dated flexible day plan', () => {
  const response = scheduleResponse(buildSchedule({ time: '08:30' }));
  const parsed = GeminiService.parseStructuredSchedules(response, {
    userContext: 'Susun jadwal fokus kerja dan istirahat hari ini.'
  });

  test('recognizes the built-in focus-planning prompt as a flexible plan', () => {
    const parsed = GeminiService.parseStructuredSchedules(
      scheduleResponse(buildSchedule({ time: '08:30' })),
      { userContext: 'Susun jadwal fokus hari ini' }
    );

    assert.equal(parsed.length, 1);
  });

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].time, '08:30');
});

test('rejects invalid dates, incomplete items, and malformed JSON without fallback guesses', () => {
  const invalidDate = scheduleResponse(buildSchedule({ date: '2026-02-31' }));
  const missingTime = scheduleResponse(buildSchedule({ time: '' }));
  const malformed = '[DAYFLOW_SCHEDULES] [{"title":"Belajar","date":"hari ini"} [/DAYFLOW_SCHEDULES]';
  const options = { userContext: 'Susun jadwal fokus kerja hari ini.' };

  assert.deepEqual(GeminiService.parseStructuredSchedules(invalidDate, options), []);
  assert.deepEqual(GeminiService.parseStructuredSchedules(missingTime, options), []);
  assert.deepEqual(GeminiService.parseStructuredSchedules(malformed, options), []);
});

test('requires complete valid note JSON', () => {
  assert.equal(GeminiService.parseStructuredNote('[DAYFLOW_NOTE]{"title":"Ide"}[/DAYFLOW_NOTE]'), null);
  assert.deepEqual(
    GeminiService.parseStructuredNote('[DAYFLOW_NOTE]{"title":"Rencana Belajar","content":"Baca bab dua"}[/DAYFLOW_NOTE]'),
    { title: 'Rencana Belajar', content: 'Baca bab dua' }
  );
});

test('blocks a destructive action when the target is ambiguous', () => {
  const schedules = [
    { id: 'one', title: 'Kuliah DDP', date: '2026-10-29', time: '08:00' },
    { id: 'two', title: 'Kuliah DDP', date: '2026-11-05', time: '08:00' }
  ];
  const actions = [{
    type: 'DELETE_SCHEDULE',
    targetId: 'one',
    targetTitle: 'Kuliah DDP'
  }];
  const result = GeminiService.resolveProposedActions(actions, 'Hapus Kuliah DDP', schedules, []);

  assert.deepEqual(result.resolvedActions, []);
  assert.equal(result.blockedActions.length, 1);
  assert.equal(result.blockedActions[0].candidates.length, 2);
});

test('requires a user-confirmed date or time to disambiguate duplicate schedules', () => {
  const today = getLocalDateString();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const schedules = [
    { id: 'one', title: 'Kuliah DDP', date: today, time: '08:00' },
    { id: 'two', title: 'Kuliah DDP', date: getLocalDateString(nextWeek), time: '08:00' }
  ];
  const result = GeminiService.resolveProposedActions(
    [{
      type: 'DELETE_SCHEDULE',
      targetId: 'one',
      targetTitle: 'Kuliah DDP',
      targetDate: today,
      targetTime: '08:00'
    }],
    `Hapus Kuliah DDP hari ini pukul 08:00`,
    schedules,
    []
  );

  assert.equal(result.blockedActions.length, 0);
  assert.equal(result.resolvedActions.length, 1);
  assert.equal(result.resolvedActions[0].schedule.id, 'one');
});

test('resolves an action only for a unique exact target explicitly named by the user', () => {
  const schedule = { id: 'unique', title: 'Kuliah DDP', date: '2026-10-29', time: '08:00' };
  const result = GeminiService.resolveProposedActions(
    [{ type: 'DELETE_SCHEDULE', targetId: schedule.id, targetTitle: schedule.title }],
    'Hapus jadwal Kuliah DDP',
    [schedule],
    []
  );

  assert.equal(result.blockedActions.length, 0);
  assert.equal(result.resolvedActions.length, 1);
  assert.equal(result.resolvedActions[0].schedule.id, schedule.id);
});

test('allows an explicit reschedule while keeping the old time separate from the requested new time', () => {
  const schedule = { id: 'unique', title: 'Kuliah DDP', date: '2026-10-29', time: '08:00' };
  const result = GeminiService.resolveProposedActions(
    [{
      type: 'RESCHEDULE',
      targetId: schedule.id,
      targetTitle: schedule.title,
      targetDate: schedule.date,
      targetTime: schedule.time,
      newTime: '10:00'
    }],
    'Pindah jadwal Kuliah DDP ke pukul 10:00',
    [schedule],
    []
  );

  assert.equal(result.blockedActions.length, 0);
  assert.equal(result.resolvedActions[0].schedule.id, schedule.id);
});

test('blocks actions that were not requested or whose target was not named', () => {
  const schedule = { id: 'one', title: 'Kuliah DDP', date: '2026-10-29', time: '08:00' };
  const action = [{ type: 'DELETE_SCHEDULE', targetId: 'one', targetTitle: 'Kuliah DDP' }];

  assert.equal(GeminiService.resolveProposedActions(action, 'Ceritakan jadwal Kuliah DDP', [schedule], []).resolvedActions.length, 0);
  assert.equal(GeminiService.resolveProposedActions(action, 'Hapus jadwal itu', [schedule], []).resolvedActions.length, 0);
});

test('summarizeNote sends only the selected note and its own attachment text', async () => {
  const originalRequest = GeminiService.requestGenerateContent;
  let requestPayload;
  GeminiService.requestGenerateContent = async (payload) => {
    requestPayload = payload;
    return { candidates: [{ content: { parts: [{ text: 'Rangkuman catatan terpilih.' }] } }] };
  };

  try {
    const result = await GeminiService.summarizeNote(
      { title: 'Materi Kalkulus', content: 'Bahas turunan fungsi.' },
      [{ name: 'materi.txt', extractedText: 'Aturan rantai dan contoh.' }]
    );

    const prompt = requestPayload.contents[0].parts.at(-1).text;
    assert.equal(result, 'Rangkuman catatan terpilih.');
    assert.match(prompt, /Materi Kalkulus/);
    assert.match(prompt, /Aturan rantai dan contoh/);
    assert.doesNotMatch(prompt, /catatan lain/i);
  } finally {
    GeminiService.requestGenerateContent = originalRequest;
  }
});

test('summarizeNote asks for the original scanned PDF when its data is unavailable', async () => {
  await assert.rejects(
    GeminiService.summarizeNote(
      { title: 'Dokumen scan', content: '' },
      [{ name: 'scan.pdf', mimeType: 'application/pdf', extractedText: '' }]
    ),
    /Lampirkan ulang berkas asli/
  );
});

test('sendChatMessage includes rendered PDF pages as vision parts', async () => {
  const originalHistory = state.getChatHistory;
  const originalRequest = GeminiService.requestGenerateContent;
  let requestPayload;
  state.getChatHistory = () => [{ role: 'user', text: '[Lampiran: scan.pdf]' }];
  GeminiService.requestGenerateContent = async (payload) => {
    requestPayload = payload;
    return { candidates: [{ content: { parts: [{ text: 'Isi PDF terbaca.' }] } }] };
  };

  try {
    const result = await GeminiService.sendChatMessage('', {
      name: 'scan.pdf',
      imageParts: [{ mimeType: 'image/jpeg', data: 'c2Nhbg==' }]
    });
    const userParts = requestPayload.contents.at(-1).parts;
    const openAiPayload = GeminiService.convertGeminiPayloadToOpenAI({
      contents: [{ role: 'user', parts: userParts }]
    });

    assert.equal(result, 'Isi PDF terbaca.');
    assert.equal(userParts[0].inlineData.mimeType, 'image/jpeg');
    assert.match(userParts.at(-1).text, /analisis gambar\/dokumen terlampir/i);
    assert.equal(openAiPayload.messages[0].content[0].image_url.url, 'data:image/jpeg;base64,c2Nhbg==');
  } finally {
    state.getChatHistory = originalHistory;
    GeminiService.requestGenerateContent = originalRequest;
  }
});

test('routes Groq preference through the shared gateway when no personal key is set', async () => {
  const methods = ['getAiProvider', 'getGroqApiKey', 'getGroqModel', 'getApiKey', 'getProxyUrl'];
  const originals = Object.fromEntries(methods.map((name) => [name, GeminiService[name]]));
  const originalFetch = globalThis.fetch;
  let gatewayRequest;
  GeminiService.getAiProvider = () => 'groq';
  GeminiService.getGroqApiKey = () => '';
  GeminiService.getGroqModel = () => 'llama-3.3-70b-versatile';
  GeminiService.getApiKey = () => '';
  GeminiService.getProxyUrl = () => 'https://gateway.example';
  globalThis.fetch = async (url, options) => {
    gatewayRequest = { url, body: JSON.parse(options.body) };
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Gateway response.' }] } }] })
    };
  };

  try {
    const result = await GeminiService.requestGenerateContent({
      contents: [{ role: 'user', parts: [{ text: 'Ringkas catatan ini.' }] }]
    });

    assert.equal(result.candidates[0].content.parts[0].text, 'Gateway response.');
    assert.equal(gatewayRequest.url, 'https://gateway.example/api/generate');
    assert.equal(gatewayRequest.body.provider, 'groq');
    assert.equal(gatewayRequest.body.model, 'llama-3.3-70b-versatile');
  } finally {
    methods.forEach((name) => { GeminiService[name] = originals[name]; });
    globalThis.fetch = originalFetch;
  }
});
