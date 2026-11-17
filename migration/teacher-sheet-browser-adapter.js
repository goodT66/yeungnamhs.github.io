/**
 * 비공개 시트 전환용 브라우저 어댑터 초안.
 * 현재 index.html에서 import하지 않으므로 운영 동작에 영향이 없습니다.
 *
 * Firebase modular SDK의 httpsCallable 인스턴스와 인증된 user를 주입합니다.
 * 기존 Papa.parse(csv, ...)를 보존해야 하는 호출부에는 fetchCsvText()를 사용합니다.
 * CSV의 쉼표/따옴표/줄바꿈은 RFC 4180 방식으로 인코딩합니다.
 */
export function createTeacherSheetReader({ callable, getUser, allowedEmails }) {
  if (typeof callable !== 'function' || typeof getUser !== 'function') {
    throw new TypeError('Firebase callable 및 사용자 조회 함수가 필요합니다.');
  }
  const keys = new Set([
    'mock', 'studentInfo', 'graduates', 'gradJeongsi', 'gradSuneung',
    'susi2026', 'interview2026', 'susiResult', 'susiSchedule',
    'cheongun', 'grade3Supervisor'
  ]);
  async function fetchRows(sheetKey) {
    if (!keys.has(sheetKey)) throw new Error('허용되지 않은 시트 요청입니다.');
    const user = getUser();
    const email = String(user?.email || '').toLowerCase();
    if (!user || !allowedEmails.some(e => String(e).toLowerCase() === email)) {
      throw new Error('허용된 교사 계정으로 로그인해야 합니다.');
    }
    const idToken = await user.getIdToken();
    const response = await callable({ idToken, sheetKey });
    if (response.data?.success !== true || !Array.isArray(response.data.values)) {
      throw new Error('시트 데이터 응답이 올바르지 않습니다.');
    }
    return response.data.values;
  }
  function escapeCsv(value) {
    const str = String(value ?? '');
    return /[",\r\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
  }
  async function fetchCsvText(sheetKey) {
    const rows = await fetchRows(sheetKey);
    return rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
  }
  return { fetchRows, fetchCsvText };
}
