// Run: node --test migration/teacher-sheet-browser-adapter.test.mjs
// Does not contact Firebase, Apps Script, or real student data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./teacher-sheet-browser-adapter.js', import.meta.url), 'utf8');
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const { createTeacherSheetReader } = await import(moduleUrl);

const user = { email: 'teacher@example.test', getIdToken: async () => 'test-token' };
const allowedEmails = ['teacher@example.test'];

test('authorized teacher gets only allowlisted sheet data', async () => {
  const calls = [];
  const reader = createTeacherSheetReader({
    callable: async payload => {
      calls.push(payload);
      return { data: { success: true, values: [['이름', '내용'], ['홍길동', '가,나']] } };
    },
    getUser: () => user,
    allowedEmails
  });
  assert.deepEqual(await reader.fetchRows('mock'), [['이름', '내용'], ['홍길동', '가,나']]);
  assert.deepEqual(calls, [{ idToken: 'test-token', sheetKey: 'mock' }]);
  assert.equal(await reader.fetchCsvText('mock'), '이름,내용\r\n홍길동,"가,나"');
});

test('CSV correctly quotes commas, double quotes and line breaks', async () => {
  const reader = createTeacherSheetReader({
    callable: async () => ({ data: { success: true, values: [['a,b', 'a"b', 'line1\nline2']] } }),
    getUser: () => user, allowedEmails
  });
  assert.equal(await reader.fetchCsvText('susi2026'), '"a,b","a""b","line1\nline2"');
});

test('unauthorized and signed-out users never call backend', async () => {
  let calls = 0;
  const callable = async () => { calls++; return { data: { success: true, values: [] } }; };
  const signedOut = createTeacherSheetReader({ callable, getUser: () => null, allowedEmails });
  await assert.rejects(signedOut.fetchRows('mock'), /로그인/);
  const unauthorized = createTeacherSheetReader({
    callable, getUser: () => ({ ...user, email: 'outsider@example.test' }), allowedEmails
  });
  await assert.rejects(unauthorized.fetchRows('mock'), /로그인/);
  assert.equal(calls, 0);
});

test('arbitrary sheet keys are rejected before any backend call', async () => {
  let calls = 0;
  const reader = createTeacherSheetReader({
    callable: async () => { calls++; return { data: { success: true, values: [] } }; },
    getUser: () => user, allowedEmails
  });
  await assert.rejects(reader.fetchRows('../secrets'), /허용되지 않은/);
  assert.equal(calls, 0);
});

test('malformed backend response is rejected', async () => {
  const reader = createTeacherSheetReader({
    callable: async () => ({ data: { success: true, values: null } }),
    getUser: () => user, allowedEmails
  });
  await assert.rejects(reader.fetchRows('mock'), /응답/);
});
