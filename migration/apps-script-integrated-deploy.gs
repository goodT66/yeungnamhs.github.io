/**
 * 교사 전용 Google Sheets API - 통합 배포본
 * 기존 doGet, doPost, jsonResponse, verifySusiTeacher_, authorizeSusiPermissions를
 * 이 파일의 함수로 교체합니다. 기존 동일 이름의 함수와 중복 선언하지 마세요.
 *
 * 중요: 이 파일을 GitHub에 저장하는 것만으로 Apps Script에 배포되지 않습니다.
 * 별도 감독표 Apps Script 웹앱 배포도 독립적으로 차단해야 합니다.
 */
const SUSI_SAVE_CONFIG = {
  spreadsheetId: '1psYLHk_Wnl-S-yvkTq9BK80byIxqulTMxlPXHLPB-BM',
  sheetName: '2026수시'
};

const TEACHER_SHEET_KEYS = Object.freeze({
  mock: { gid: 0 },
  studentInfo: { gid: 750853389 },
  graduates: { name: '졸업생' },
  gradJeongsi: { gid: 1123384481 },
  gradSuneung: { name: '졸업생수능' },
  susi2026: { name: '2026수시' },
  interview2026: { name: '2026면접' },
  susiResult: { gid: 1822882619 },
  susiSchedule: { gid: 1502883874 },
  cheongun: { name: '청운관감독표' },
  grade3Supervisor: { name: '3학년감독표' }
});

// GET은 Firebase ID 토큰 인증을 하지 않으므로 절대 시트 데이터를 반환하지 않습니다.
function doGet() {
  return jsonResponse({
    success: false,
    message: '공개 시트 조회는 지원하지 않습니다.'
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('요청이 비어 있습니다.');
    }
    const request = JSON.parse(e.postData.contents);
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      throw new Error('요청 형식이 올바르지 않습니다.');
    }

    const allowedActions = ['save2026Susi', 'getStudentInfo', 'getTeacherSheet'];
    if (!allowedActions.includes(request.action)) {
      throw new Error('지원하지 않는 요청입니다.');
    }

    // 모든 데이터 읽기 및 쓰기 분기보다 먼저 인증합니다.
    const teacherEmail = verifySusiTeacher_(request.idToken);

    if (request.action === 'getTeacherSheet') {
      return jsonResponse(getTeacherSheet_(request.sheetKey));
    }

    if (request.action === 'getStudentInfo') {
      const spreadsheet = SpreadsheetApp.openById(SUSI_SAVE_CONFIG.spreadsheetId);
      const studentSheet = spreadsheet.getSheets().find(
        sheet => sheet.getSheetId() === 750853389
      );
      if (!studentSheet) throw new Error('학생정보 시트를 찾을 수 없습니다.');
      const lastRow = studentSheet.getLastRow();
      if (lastRow < 1) throw new Error('학생정보 시트가 비어 있습니다.');
      return jsonResponse({
        success: true,
        values: studentSheet.getRange(1, 1, lastRow, 6).getDisplayValues()
      });
    }

    // 기존 2026수시 저장 동작을 유지합니다.
    if (!Array.isArray(request.items) ||
        request.items.length < 1 ||
        request.items.length > 100) {
      throw new Error('저장 건수는 1~100건이어야 합니다.');
    }

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      throw new Error('다른 저장 작업이 진행 중입니다.');
    }
    try {
      const sheet = SpreadsheetApp
        .openById(SUSI_SAVE_CONFIG.spreadsheetId)
        .getSheetByName(SUSI_SAVE_CONFIG.sheetName);
      if (!sheet) throw new Error('2026수시 시트를 찾지 못했습니다.');

      const rows = sheet.getDataRange().getDisplayValues();
      const makeKey = row => JSON.stringify(
        row.slice(1, 10).map(value => String(value ?? '').trim())
      );
      const rowMap = new Map();
      rows.slice(1).forEach((row, index) => {
        const key = makeKey(row);
        if (!rowMap.has(key)) rowMap.set(key, []);
        rowMap.get(key).push(index + 2);
      });

      const updates = [];
      const usedRows = new Set();
      request.items.forEach(item => {
        if (!Array.isArray(item.identity) || item.identity.length !== 9) {
          throw new Error('지원정보 식별값이 올바르지 않습니다.');
        }
        const key = JSON.stringify(
          item.identity.map(value => String(value ?? '').trim())
        );
        const matches = rowMap.get(key) || [];
        if (matches.length !== 1) {
          // 학생 식별정보가 서버 로그/오류 응답에 노출되지 않도록 합니다.
          throw new Error('지원 행 검색 실패 (일치 건수: ' + matches.length + ')');
        }
        const rowNumber = matches[0];
        if (usedRows.has(rowNumber)) {
          throw new Error('동일한 행이 중복 요청되었습니다.');
        }
        usedRows.add(rowNumber);

        const values = item.values;
        if (!values || typeof values !== 'object' || Array.isArray(values)) {
          throw new Error('저장 값이 올바르지 않습니다.');
        }
        const allowedColumns = ['17', '18', '19', '20'];
        const entries = Object.entries(values);
        if (!entries.length ||
            entries.some(([key, value]) =>
              !allowedColumns.includes(key) ||
              typeof value !== 'string' ||
              value.length > 200 ||
              (value !== '-' && /^[=+\-@\t\r]/.test(value))
            )) {
          throw new Error('허용되지 않는 셀 값입니다.');
        }
        updates.push({ rowNumber, entries });
      });

      // 요청된 R~U열만 기록합니다.
      updates.forEach(update => {
        update.entries.forEach(([columnIndex, value]) => {
          sheet.getRange(update.rowNumber, Number(columnIndex) + 1).setValue(value);
        });
      });
      console.log('2026수시 저장: ' + teacherEmail + ', 행 수: ' + updates.length);
      return jsonResponse({ success: true, savedRows: updates.length });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error('교사 API 요청 실패: ' + String(error && error.message || error));
    return jsonResponse({
      success: false,
      message: String(error && error.message || '요청 처리에 실패했습니다.')
    });
  }
}

function getTeacherSheet_(sheetKey) {
  if (typeof sheetKey !== 'string' ||
      !Object.prototype.hasOwnProperty.call(TEACHER_SHEET_KEYS, sheetKey)) {
    throw new Error('허용되지 않은 시트 조회 요청입니다.');
  }
  const target = TEACHER_SHEET_KEYS[sheetKey];
  const spreadsheet = SpreadsheetApp.openById(SUSI_SAVE_CONFIG.spreadsheetId);
  const sheet = target.gid !== undefined
    ? spreadsheet.getSheets().find(s => s.getSheetId() === target.gid)
    : spreadsheet.getSheetByName(target.name);
  if (!sheet) throw new Error('시트를 찾을 수 없습니다.');
  return { success: true, sheetKey, values: sheet.getDataRange().getDisplayValues() };
}

function verifySusiTeacher_(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('교사 인증 토큰이 없습니다.');
  }
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('FIREBASE_API_KEY');
  const allowed = props.getProperty('SUSI_ALLOWED_EMAILS');
  if (!apiKey || !allowed) {
    throw new Error('서버 인증 설정이 완료되지 않았습니다.');
  }

  const response = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' +
      encodeURIComponent(apiKey),
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken }),
      muteHttpExceptions: true
    }
  );
  if (response.getResponseCode() !== 200) {
    throw new Error('유효하지 않은 로그인입니다.');
  }
  const result = JSON.parse(response.getContentText());
  const user = result.users && result.users[0];
  if (!user || !user.emailVerified || user.disabled) {
    throw new Error('확인된 교사 계정이 아닙니다.');
  }
  const email = String(user.email || '').toLowerCase();
  const allowedEmails = allowed.split(',')
    .map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!allowedEmails.includes(email)) {
    throw new Error('시트 조회 또는 저장 권한이 없는 계정입니다.');
  }
  return email;
}

function authorizeSusiPermissions() {
  const spreadsheet = SpreadsheetApp.openById(SUSI_SAVE_CONFIG.spreadsheetId);
  UrlFetchApp.fetch('https://www.google.com', { muteHttpExceptions: true });
  Logger.log('권한 확인 완료: ' + spreadsheet.getName());
}
