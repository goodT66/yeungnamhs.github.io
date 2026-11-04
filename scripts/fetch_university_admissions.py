import json
import os
from pathlib import Path

import requests

API_URL = "https://sam.adiga.kr/kcue/ast/cou/por/bbs/selectUnventInfDtaInfo.do"
YEARS = ("2026", "2027", "2028")

HEADERS = {
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Origin": "https://sam.adiga.kr",
    "Referer": "https://sam.adiga.kr/",
    "User-Agent": "Mozilla/5.0 (compatible; YeungnamHSAdmissionsBot/1.0)",
    "X-Requested-With": "XMLHttpRequest",
}

def extract_rows(data):
    for candidate in (
        data.get("resultPuidList"),
        (data.get("resultVO") or {}).get("resultPuidList"),
        (data.get("data") or {}).get("resultPuidList"),
    ):
        if isinstance(candidate, list):
            return candidate
    raise RuntimeError("대입정보포털 응답에 resultPuidList 배열이 없습니다.")

def main():
    output = Path("data/university-admissions")
    output.mkdir(parents=True, exist_ok=True)
    session = requests.Session()

    for year in YEARS:
        response = session.post(
            API_URL,
            headers=HEADERS,
            data={
                "selYear": year,
                "selUniType": "02",
                "selLetter": "1",
                "uni_ty": "on",
                "searchKeyword": "",
            },
            timeout=45,
        )
        response.raise_for_status()
        try:
            payload = response.json()
        except ValueError as exc:
            raise RuntimeError(f"{year}학년도 응답이 JSON이 아닙니다.") from exc

        rows = extract_rows(payload)
        if not rows:
            raise RuntimeError(f"{year}학년도 대학 목록이 비어 있어 기존 자료를 보호합니다.")

        target = output / f"{year}.json"
        target.write_text(
            json.dumps(
                {"year": year, "count": len(rows), "updatedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(), "rows": rows},
                ensure_ascii=False,
                indent=2,
            ) + "\n",
            encoding="utf-8",
        )
        print(f"{year}: {len(rows)}개 대학 저장 완료")

if __name__ == "__main__":
    main()
