# 실제 배포 실행 절차 (운영 사이트 변경 전)

> 이 문서는 GitHub 코드 준비와 별개로 **Firebase 프로젝트 관리자, Apps Script 편집자, 스프레드시트 소유자**가 실행해야 하는 단계입니다. 현재 어느 서버에도 자동 배포되지 않았습니다.

## 0. 준비 및 백업
1. Firebase 프로젝트 `goodt66-15409`, Functions 지역 `asia-northeast3`, Google 시트 ID `1psYLHk_Wnl-S-yvkTq9BK80byIxqulTMxlPXHLPB-BM` 일치 확인.
2. 운영 Apps Script의 전체 소스와 현재 배포 버전/웹 앱 URL을 별도 보관. Firebase Functions 소스 및 환경 설정을 백업.
3. GitHub `main`과 실제 운영 URL `https://goodt66.github.io`이 일치하는지 확인.
4. 학생 정보가 포함된 원본 시트 내용이나 인증 토큰을 공개 저장소/이슈/CI 로그에 게시하지 않기.

## 1. Apps Script 인증 조회 추가
1. 기존 `doPost(e)`의 JSON 파싱, `verifySusiTeacher_(request.idToken)` 인증, 기존 `save2026Susi` 및 `getStudentInfo` 동작을 보존.
2. `migration/apps-script-teacher-sheet.gs`의 `getTeacherSheet_(sheetKey)` 함수 추가.
3. 기존 `doPost`에서 인증 검증 **이후에만** `action === 'getTeacherSheet'` 분기를 추가. 인증 실패가 JSON 오류로 변환되어 성공으로 처리되지 않도록 검토.
4. `SUSI_ALLOWED_EMAILS`가 실제 허용 교사 목록인지 검증. 비어 있으면 전부 거부.
5. 웹 앱 새 버전 배포. **실행 사용자(소유자) 및 접근 권한**이 기존 서버 호출과 호환되는지 확인. 공개 GET 경로는 아직 유지하되 전환 직후 차단 계획 확정.

## 2. Firebase Functions 인증 조회 추가
1. 실제 `functions/index.js`에서 `onCall`, `HttpsError`, `getAuth`, `APPS_SCRIPT_URL` 변수와 초기화 위치를 확인.
2. `migration/firebase-teacher-sheet.js`를 기존 파일에 통합. 이름 충돌/중복 `initializeApp` 금지.
3. 서버 환경 설정 `TEACHER_ALLOWED_EMAILS`를 허용된 교사 이메일 목록으로 설정. 공개 웹 코드에 포함된 목록을 보안의 근거로 사용하지 않기. 배포 환경에 실제 값이 적용되는지 확인.
4. `getTeacherSheet` 함수만 먼저 배포하고 `save2026Susi`, `getStudentInfo`는 변경하지 않기.
5. 로그인 없음, 미허용 이메일, 이메일 미인증, 만료/폐기 토큰, UID 불일치, 허용되지 않은 시트 키가 모두 거부되는지 검증.
6. 허용된 교사 계정에서 11개 시트의 헤더·행 수·날짜 표시를 기존 방식과 비교. 대용량 시트의 응답 크기/시간초과 확인.

## 3. 비공개 프런트엔드 사전 검증
1. 운영 `main`을 변경하기 전 테스트 브랜치/테스트 배포에서만 `window.ENABLE_PRIVATE_SHEETS = true`로 설정.
2. 개발자 도구 Network에서 원본 시트 ID를 포함하는 `docs.google.com/spreadsheets/.../export`, `gviz/tq` 요청이 **0건**인지 확인.
3. 모의고사, 졸업생, 정시·수능, 수시·면접, 수시 결과, 수시일정, 청운관/3학년 감독표, 학생정보, R~U열 저장을 각각 실제 교사 계정으로 확인.
4. 로그인 상태 전환 중 진행 중인 요청이 이전 교사의 자료를 화면에 노출하지 않는지 확인.
5. 모든 기능이 검증되면 프런트엔드 플래그를 켠 상태로 운영 배포. **공개 CSV 폴백을 다시 켜서 장애를 우회하지 않기.**

## 4. 공개 경로 폐쇄
1. 기존 Apps Script의 무인증 `doGet()`은 `migration/apps-script-disable-public-get.gs` 예시를 참고하여 데이터 반환 불가로 변경 후 **새 버전 배포**. 중복 `doGet` 선언 금지.
2. 별도 `SUPERVISOR_SHEET_API_URL`에 연결된 Apps Script 프로젝트도 별도로 수정/재배포하거나 배포 자체를 비활성화.
3. 이전 배포 버전 URL, 웹에 게시된 링크, CSV/gviz 직접 접근을 각각 **로그아웃 상태/시크릿 창**에서 시험. 새 버전만 안전하고 과거 URL이 열려 있는 상태를 방치하지 않기.
4. 시트 공유를 `제한됨`으로 변경하고, `파일 > 공유 > 웹에 게시`가 활성화되어 있다면 게시 중지. 링크 공유 제한과 웹 게시 해제는 서로 다른 설정임.
5. 기존 기능을 다시 검증하고 무인증 접근 차단 증거(상태코드, 응답 형태, 시간)를 기록. 학생정보 자체를 로그에 남기지 않기.

## 5. 장애 및 되돌리기
- 새 조회 함수 오류: 서버 로그에서 권한·실행 사용자·Apps Script 배포 버전·응답 크기 확인.
- **시트 공유를 공개로 되돌리는 것은 개인정보 노출 위험이 있으므로 장애 대응책으로 사용하지 않기.**
- 프런트엔드 롤백 시 과거 직접 CSV 조회가 복구되므로, 시트가 제한된 상태에서는 기능이 작동하지 않을 수 있음. 보안 담당자와 함께 대응.
- 앱스크립트 공개 GET 차단은 프런트엔드 롤백과 별개로 유지.
- 작업 완료 기준: 허용 교사는 전체 기능 사용 가능 + 비허용/비로그인 사용자는 원본 데이터에 어떤 경로로도 접근 불가.

## 연결 권한의 한계
이 GitHub 저장소에는 실제 Firebase Functions 프로젝트와 Apps Script 배포 소스가 없으므로, GitHub PR만 병합해서는 서버 변경이 배포되지 않습니다.
