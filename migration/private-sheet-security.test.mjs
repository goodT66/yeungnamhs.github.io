import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const firebase = readFileSync(new URL('./firebase-teacher-sheet.js', import.meta.url), 'utf8');
const apps = readFileSync(new URL('./apps-script-teacher-sheet.gs', import.meta.url), 'utf8');
const keys = [
  'mock', 'studentInfo', 'graduates', 'gradJeongsi', 'gradSuneung',
  'susi2026', 'interview2026', 'susiResult', 'susiSchedule',
  'cheongun', 'grade3Supervisor'
];

test('all private sheet keys exist in both backend allowlists', () => {
  for (const key of keys) {
    assert.match(firebase, new RegExp("'"+key+"'"), 'Firebase missing '+key);
    assert.match(apps, new RegExp('\\b'+key+'\\s*:'), 'Apps Script missing '+key);
  }
});

test('private mode remains off until server deployment', () => {
  assert.match(html, /window\.ENABLE_PRIVATE_SHEETS\s*=\s*false\s*;/);
});

test('private-mode read requires authenticated teacher and rejects stale sessions', () => {
  assert.match(html, /const requestingUser = currentUser/);
  assert.match(html, /requestingUser\.getIdToken\(\)/);
  assert.match(html, /auth\.currentUser\.uid !== requestingUser\.uid/);
  assert.match(firebase, /verifyIdToken\(idToken, true\)/);
  assert.match(firebase, /decoded\.uid !== request\.auth\.uid/);
  assert.match(firebase, /TEACHER_ALLOWED_EMAILS/);
});

test('private mode has no public-sheet fallback on callable failure', () => {
  const start = html.indexOf('window.fetchTeacherSheetCsv =');
  const end = html.indexOf('window.getInterviewDateCache', start);
  assert.ok(start >= 0 && end > start);
  const reader = html.slice(start, end);
  assert.match(reader, /if \(!window\.ENABLE_PRIVATE_SHEETS\) return fetch\(url, options\)/);
  assert.match(reader, /await window\.fetchTeacherSheetRows\(sheetKey\)/);
  assert.doesNotMatch(reader, /catch\s*\([^)]*\)\s*\{[^}]*fetch\(url/s);
});
