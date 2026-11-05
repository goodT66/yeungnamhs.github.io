import json
import os
import re

from google.oauth2 import service_account
from googleapiclient.discovery import build
import firebase_admin
from firebase_admin import credentials, firestore

# The user's November score sheet (first row contains column headings).
SPREADSHEET_ID = "1psYLHk_Wnl-S-yvkTq9BK80byIxqulTMxlPXHLPB-BM"
SHEET_RANGE = "'11월'!A:AE"
COLLECTION = "novemberScoreReports"

FIELDS = [
    "cls", "no", "studentId", "name",
    "korSubject", "korCommon", "korElective", "korTotal",
    "korStandard", "korPercentile", "korGrade",
    "mathSubject", "mathCommon", "mathElective", "mathTotal",
    "mathStandard", "mathPercentile", "mathGrade",
    "engScore", "engGrade", "historyScore",
    "social1Subject", "social1Score", "social1Standard",
    "social1Percentile", "social1Grade",
    "social2Subject", "social2Score", "social2Standard",
    "social2Percentile", "social2Grade",
]


def clean(value):
    if value is None:
        return ""
    return str(value).strip()


def main():
    raw = os.environ.get("SCORE_SYNC_SERVICE_ACCOUNT_JSON", "")
    if not raw:
        raise RuntimeError("GitHub Actions secret SCORE_SYNC_SERVICE_ACCOUNT_JSON is not configured.")

    service_info = json.loads(raw)
    google_credentials = service_account.Credentials.from_service_account_info(
        service_info,
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
    )

    sheets = build("sheets", "v4", credentials=google_credentials, cache_discovery=False)
    response = sheets.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=SHEET_RANGE,
        valueRenderOption="FORMATTED_VALUE",
    ).execute()
    values = response.get("values", [])
    if len(values) < 2:
        raise RuntimeError("11월 시트에 제목행과 성적 데이터가 모두 있는지 확인해 주세요.")

    records = []
    for row_number, row in enumerate(values[1:], start=2):
        padded = list(row) + [""] * (len(FIELDS) - len(row))
        data = {field: clean(padded[index]) for index, field in enumerate(FIELDS)}
        if not data["cls"] or not data["no"] or not data["name"]:
            continue
        class_key = re.sub(r"\D", "", data["cls"])
        number_key = re.sub(r"\D", "", data["no"])
        if not class_key or not number_key:
            continue
        doc_id = f"{int(class_key):02d}_{int(number_key):02d}"
        data["cls"] = str(int(class_key))
        data["no"] = str(int(number_key))
        data["sourceRow"] = row_number
        records.append((doc_id, data))

    if not records:
        raise RuntimeError("유효한 학생 성적 데이터가 0건이므로 Firestore 자료를 변경하지 않았습니다.")

    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(service_info))
    db = firestore.client()
    collection = db.collection(COLLECTION)
    existing = list(collection.stream())
    wanted_ids = {doc_id for doc_id, _ in records}

    batch = db.batch()
    pending = 0
    for doc_id, data in records:
        batch.set(collection.document(doc_id), data)
        pending += 1
        if pending >= 400:
            batch.commit()
            batch = db.batch()
            pending = 0

    for snapshot in existing:
        if snapshot.id not in wanted_ids:
            batch.delete(snapshot.reference)
            pending += 1
            if pending >= 400:
                batch.commit()
                batch = db.batch()
                pending = 0

    if pending:
        batch.commit()

    print(f"Synced {len(records)} November score reports to Firestore.")
    print(f"Removed {sum(1 for item in existing if item.id not in wanted_ids)} stale records.")


if __name__ == "__main__":
    main()
