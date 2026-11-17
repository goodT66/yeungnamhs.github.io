/**
 * 기존 Apps Script의 공개 doGet 교체용 보안 차단 코드.
 * 주의: 기존 doGet의 기능과 호출자를 모두 조사하고 이전한 뒤 적용할 것.
 * Apps Script 웹 앱은 URL 파라미터만으로 Firebase 인증을 검증할 수 없습니다.
 * 비공개 데이터는 doGet으로 반환하지 않고 인증된 doPost 경로만 사용합니다.
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      message: '이 엔드포인트에서는 시트 공개 조회를 지원하지 않습니다.'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/*
 * 적용 시 별도 감독표 웹 앱 URL도 반드시 확인할 것:
 * SUPERVISOR_SHEET_API_URL은 다른 Apps Script 배포이므로
 * 이 파일만 적용해도 그 URL의 공개 조회는 차단되지 않습니다.
 *
 * 주의: 이 파일은 실행 중인 프로젝트에 자동 반영되지 않습니다.
 * 기존 doGet을 통째로 대체할 때만 사용하며 중복 선언하지 않습니다.
 */
