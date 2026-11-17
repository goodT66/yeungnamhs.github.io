/**
 * 기존 Firebase functions/index.js에 추가할 코드입니다.
 * 기존 initializeApp(), onCall, HttpsError, getAuth 선언을 재사용합니다.
 * 기존 save2026Susi / getStudentInfo 함수를 수정하지 않습니다.
 *
 * 배포 전 확인: Apps Script의 doPost에 getTeacherSheet 액션이
 * 배포되어 있어야 합니다. FIREBASE/APPS_SCRIPT_URL은 기존 값 재사용.
 * 교사 허용 이메일 목록은 서버의 비밀 환경설정으로 관리하고
 * 공개 GitHub 저장소에 작성하지 마세요.
 *
 * 환경 변수 TEACHER_ALLOWED_EMAILS 는 쉼표 구분 이메일 목록.
 * 실제 배포에는 Secret Manager 등 안전한 구성 권장.
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
