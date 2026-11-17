/**
 * 기존 Apps Script 프로젝트에 이 함수만 추가합니다.
 * 기존 doPost의 allowedActions에 'getTeacherSheet'를 추가하고,
 * verifySusiTeacher_(request.idToken) 실행 직후 아래 분기를 추가하세요.
 *
 * if (request.action === 'getTeacherSheet') {
 *   return jsonResponse(getTeacherSheet_(request.sheetKey));
 * }
 *
 * 기존 doGet()은 이 변경만으로 안전해지지 않습니다.
 * 기존 호출처를 모두 이전한 뒤 별도로 비활성화해야 합니다.
 */
function getTeacherSheet_(sheetKey) {
  const sheets = {
    mock: { gid: 0 },
    studentInfo: { gid: 750853389 },
    graduates: { name: '졸업생' },
    gradJeongsi: { gid: 1123384481 },
    susiSchedule: { gid: 1502883874 },
    gradSuneung: { name: '졸업생수능' },
    susi2026: { name: '2026수시' },
    interview2026: { name: '2026면접' },
    susiResult: { gid: 1822882619 },
    cheongun: { name: '청운관감독표' },
    grade3Supervisor: { name: '3학년감독표' }
  };
  if (typeof sheetKey !== 'string' ||
      !Object.prototype.hasOwnProperty.call(sheets, sheetKey)) {
    throw new Error('허용되지 않은 시트 조회 요청입니다.');
  }
  const spreadsheet = SpreadsheetApp.openById(SUSI_SAVE_CONFIG.spreadsheetId);
  const target = sheets[sheetKey];
  const sheet = target.gid !== undefined
    ? spreadsheet.getSheets().find(s => s.getSheetId() === target.gid)
    : spreadsheet.getSheetByName(target.name);
  if (!sheet) throw new Error('시트를 찾을 수 없습니다.');
  return { success: true, sheetKey, values: sheet.getDataRange().getDisplayValues() };
}
