/**
 * 정적 회귀 검사: 비공개 전환 전에 기존 공개 Google Sheets 요청이
 * 반드시 기능 플래그로 우회되는지 확인합니다.
 * 운영 계정이나 학생 데이터에 접근하지 않습니다.
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const firebase = readFileSync(new URL('./firebase-teacher-sheet.js', import.meta.url), 'utf8');
const apps = readFileSync(new URL('./apps-script-teacher-sheet.gs', import.meta.url), 'utf8');
const keys = [
  'mock', 'studentInfo', 'graduates', 'gradJeongsi', 'gradSuneung',
  'susi2026', 'interview2026', 'susiResult', 'cheongun',
  'grade3Supervisor', 'susiSchedule'
];
assert.match(html, /window\.ENABLE_PRIVATE_SHEETS\s*=\s*false\s*;/,
  '운영 배포 전 비공개 모드가 활성화되면 안 됩니다');
assert.match(html, /if\s*\(!window\.ENABLE_PRIVATE_SHEETS\)\s*return fetch\(url, options\)/);
assert.match(html, /if\s*\(window\.ENABLE_PRIVATE_SHEETS\)/);
assert.match(html, /getTeacherSheetCallable/);
assert.match(html, /currentUser\?\.uid !== requestingUser\.uid/);
assert.match(html, /auth\.currentUser\.uid !== requestingUser\.uid/);
assert.match(firebase, /verifyIdToken\(idToken, true\)/);
assert.match(firebase, /decoded\.uid !== request\.auth\.uid/);
assert.match(firebase, /TEACHER_ALLOWED_EMAILS/);
assert.match(apps, /SpreadsheetApp\.openById/);
for (const key of keys) {
  assert.ok(firebase.includes("'" + key + "'"), 'Firebase 누락: ' + key);
  assert.ok(apps.includes(key + ':'), 'Apps Script 누락: ' + key);
}
for (const [key, constant] of [
  ['mock', 'MOCK_CSV_URL'],
  ['graduates', 'GRAD_CSV_URL'],
  ['gradJeongsi', 'GRAD_JEONGSI_CSV_URL'],
  ['gradSuneung', 'GRAD_SUNEUNG_CSV_URL'],
  ['susi2026', 'SUSI_2026_CSV_URL'],
  ['interview2026', 'INTERVIEW_2026_CSV_URL'],
  ['susiResult', 'SUSI_RESULT_CSV_URL'],
  ['cheongun', 'CHEONGUN_SHEET_CSV_URL']
]) {
  assert.ok(html.includes('fetchTeacherSheetCsv('), '브라우저 CSV 어댑터 누락');
  assert.ok(html.includes("'" + key + "'") || html.includes('"' + key + '"'), '키 누락: ' + key);
  assert.ok(html.includes(constant), '기존 URL 상수 누락: ' + constant);
}
assert.match(html, /fetchTeacherSheetRows\('susiSchedule'\)/);
assert.match(html, /fetchTeacherSheetRows\('grade3Supervisor'\)/);
console.log('11개 시트 키, 인증 및 기능 플래그 정적 검사 통과');
