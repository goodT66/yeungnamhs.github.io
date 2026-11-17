/**
 * 실제 제공된 Firebase functions/index.js에 추가할 배포용 블록.
 *
 * 기존 save2026Susi, getStudentInfo, require/import, initializeApp(),
 * APPS_SCRIPT_URL 정의를 그대로 유지하고 파일 맨 아래에 붙입니다.
 * 아래 코드는 위에서 선언한 onCall, HttpsError, getAuth, APPS_SCRIPT_URL을 재사용합니다.
 *
 * TEACHER_ALLOWED_EMAILS를 서버 런타임 환경에 안전하게 구성해야 하며,
 * 미설정이면 모든 요청을 거부합니다. Firebase 배포 시 환경변수 적용 확인 필수.
 */
exports.getTeacherSheet = onCall(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 60,
    maxInstances: 3,
    cors: ['https://goodt66.github.io']
  },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', '교사 로그인이 필요합니다.');
    const { idToken, sheetKey } = request.data || {};
    if (typeof idToken !== 'string' || typeof sheetKey !== 'string') {
      throw new HttpsError('invalid-argument', '인증 또는 시트 요청이 올바르지 않습니다.');
    }
    const keys = new Set([
      'mock', 'studentInfo', 'graduates', 'gradJeongsi', 'susiSchedule',
      'gradSuneung', 'susi2026', 'interview2026', 'susiResult',
      'cheongun', 'grade3Supervisor'
    ]);
    if (!keys.has(sheetKey)) throw new HttpsError('invalid-argument', '허용되지 않은 시트입니다.');
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(idToken, true);
    } catch {
      throw new HttpsError('unauthenticated', '로그인이 만료되었거나 유효하지 않습니다.');
    }
    if (decoded.uid !== request.auth.uid || !decoded.email_verified) {
      throw new HttpsError('permission-denied', '확인된 교사 계정이 아닙니다.');
    }
    const allowed = (process.env.TEACHER_ALLOWED_EMAILS || '')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(String(decoded.email || '').toLowerCase())) {
      throw new HttpsError('permission-denied', '교사 조회 권한이 없습니다.');
    }
    let response;
    try {
      response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getTeacherSheet', idToken, sheetKey }),
        redirect: 'follow',
        signal: AbortSignal.timeout(50000)
      });
    } catch {
      throw new HttpsError('unavailable', '시트 서버에 연결하지 못했습니다.');
    }
    if (!response.ok) throw new HttpsError('unavailable', '시트 서버 응답 오류');
    let result;
    try { result = await response.json(); }
    catch { throw new HttpsError('internal', '시트 서버 응답 형식 오류'); }
    if (result.success !== true || !Array.isArray(result.values)) {
      throw new HttpsError('failed-precondition', result.message || '시트 조회 실패');
    }
    return { success: true, sheetKey, values: result.values };
  }
);
