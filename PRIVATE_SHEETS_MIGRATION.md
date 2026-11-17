# 비공개 스프레드시트 전환 — 배포 전 점검

> 이 브랜치는 준비용입니다. 운영 사이트(main), Firebase 배포, Apps Script 배포, Google 시트 공유 설정은 아직 변경하지 않습니다.

## 현재 구조
- Firebase 프로젝트: `goodt66-15409`, Functions region: `asia-northeast3`.
- 현재 배포 함수: `save2026Susi`, `getStudentInfo`.
- Apps Script는 웹 앱 소유자 권한으로 실행되며 `doPost`에서 `verifySusiTeacher_`를 통해 교사 허용 이메일을 확인합니다.
- `doGet`은 현재 인증 없이 `3학년감독표`를 반환하므로 비공개 전환 전 보호가 필요합니다.

## 작업 전제
1. 기존 `save2026Susi` 및 `getStudentInfo`와 저장 셀 범위(R~U)는 그대로 보존.
2. Apps Script에 **교사 인증 후 고정된 시트만 조회하는** `getTeacherSheet` 액션 추가. `verifySusiTeacher_`를 재사용하고, 임의 스프레드시트 ID나 범위 입력은 금지.
3. Firebase에 `getTeacherSheet` callable 추가. `request.auth`, ID 토큰, UID 일치, 이메일 검증 및 교사 허용 목록을 서버에서 검증. Apps Script 인증도 유지.
4. 사이트의 모든 Google 시트 직접 조회(CSV, gviz/JSONP)를 callable 조회로 변경하고 기존 CSV 파서·UI 데이터 구조를 유지.
5. `doGet` 공개 조회 호출처를 먼저 확인하고 대체한 후 인증 없는 응답 제거.
6. 모든 시트별 읽기, 수시 저장, 로그인/로그아웃, 권한 거부, 오류 처리, 새로고침을 검증.
7. **모든 배포와 테스트가 완료된 후** Google 시트 공유를 '제한됨'으로 변경. 웹 앱 실행 계정의 시트 접근 권한 유지.

## 확인된 사이트 직접 조회 지점
- `index.html`: `MOCK_CSV_URL`, `GRAD_CSV_URL`, `GRAD_JEONGSI_CSV_URL`, `GRAD_SUNEUNG_CSV_URL`, `SUSI_2026_CSV_URL`, `INTERVIEW_2026_CSV_URL`, `SUSI_RESULT_CSV_URL`, `CHEONGUN_SHEET_CSV_URL`.
- `index.html`: `SUSI_SHEET_ID`를 사용하는 gviz JSONP 조회.
- 다른 Apps Script 엔드포인트가 동일 시트에 접근하는지 확인 필요.
- 공개 저장소 내 CSV/JSON 파일이 개인정보를 포함하는지 별도 점검 필요.

## 보안 주의
- Firebase 로그인 여부와 `email_verified`만으로 교사 자격이 보장되지는 않습니다. 서버의 명시적 허용 이메일 목록 검사가 필요합니다.
- Apps Script 웹 앱이 공개 실행 가능하다면 `doGet`의 인증 없는 조회는 시트 공유 제한과 별개로 데이터 노출 경로입니다.
- 서비스 계정 키, Firebase 비밀 값, 교사 이메일 목록을 공개 GitHub 저장소에 커밋하지 않습니다.
- Firebase/Apps Script 배포는 GitHub 커밋만으로 수행되지 않습니다. 별도 배포 및 테스트가 필요합니다.
