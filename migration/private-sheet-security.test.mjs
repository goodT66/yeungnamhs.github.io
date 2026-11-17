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
  assert.match(reader, /if \(!window\.ENABLE_PRIVATE_SHEETS && sheetKey !== 'susi2026'\) return fetch\(url, options\)/);
  assert.match(html, /window\.fetchTeacherSheetCsv\('susi2026', SUSI_2026_CSV_URL/);
  assert.match(reader, /await window\.fetchTeacherSheetRows\(sheetKey\)/);
  assert.doesNotMatch(reader, /catch\s*\([^)]*\)\s*\{[^}]*fetch\(url/s);
});

test('public GET replacement does not read any spreadsheet', () => {
  const shutdown = readFileSync(new URL('./apps-script-disable-public-get.gs', import.meta.url), 'utf8');
  const code = shutdown.slice(shutdown.indexOf('function doGet(e) {'), shutdown.indexOf('\n}', shutdown.indexOf('function doGet(e) {')) + 2);
  assert.match(code, /success: false/);
  assert.doesNotMatch(code, /SpreadsheetApp|openById|getDataRange|values:/);
});

test('independent supervisor API is explicitly tracked as a migration risk', () => {
  const gates = readFileSync(new URL('./DEPLOYMENT_GATES.md', import.meta.url), 'utf8');
  assert.match(html, /SUPERVISOR_SHEET_API_URL/);
  assert.match(gates, /별도 감독표 Apps Script/);
});

test('deployment requires checking the independent supervisor endpoint and published links', () => {
  const runbook = readFileSync(new URL('./LIVE_DEPLOY_RUNBOOK.md', import.meta.url), 'utf8');
  assert.match(runbook, /SUPERVISOR_SHEET_API_URL/);
  assert.match(runbook, /웹에 게시/);
  assert.match(runbook, /시크릿 창/);
  assert.match(runbook, /R~U열 저장/);
});

test('private-mode supervisor and schedule readers use authenticated callable', () => {
  assert.match(html, /fetchTeacherSheetRows\('grade3Supervisor'\)/);
  assert.match(html, /fetchTeacherSheetRows\('susiSchedule'\)/);
  assert.match(html, /window\.ENABLE_PRIVATE_SHEETS/);
});
