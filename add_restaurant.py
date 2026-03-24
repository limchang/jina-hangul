#!/usr/bin/env python3
"""
새 식당을 restaurants.json에 추가
Usage:
  python add_restaurant.py "식당명" "카테고리" "verdict 텍스트"

  또는 extract 결과를 파이프로:
  python extract_restaurant.py "식당명" | python add_restaurant.py - "카테고리" "verdict"

순서: extract → add → build_html + generate_gs 자동 실행
"""
import sys
import json
import os
import subprocess

BASE = os.path.dirname(os.path.abspath(__file__))

def main():
    sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) < 4:
        print("Usage: python add_restaurant.py \"식당명\" \"카테고리\" \"verdict\"")
        print("       python add_restaurant.py \"식당명\" \"카테고리\" \"verdict\" \"카테고리_short\"")
        sys.exit(1)

    name     = sys.argv[1]
    category = sys.argv[2]
    verdict  = sys.argv[3]
    cat_short = sys.argv[4] if len(sys.argv) > 4 else category.split("|")[0].strip()

    # extract_restaurant.py 실행해서 키워드 데이터 가져오기
    print(f"[1/3] 키워드 수집: {name}")
    result = subprocess.run(
        [sys.executable, os.path.join(BASE, "extract_restaurant.py"), name],
        capture_output=True, text=True, encoding='utf-8'
    )

    # stdout에서 JSON 파싱
    try:
        extract_data = json.loads(result.stdout.strip())
    except json.JSONDecodeError:
        print("오류: extract_restaurant.py 출력 파싱 실패")
        print("stderr:", result.stderr)
        sys.exit(1)

    if "error" in extract_data:
        print(f"오류: {extract_data['error']}")
        sys.exit(1)

    # 기존 데이터 로드
    json_path = os.path.join(BASE, "restaurants.json")
    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)

    # 중복 확인
    if any(r["name"] == name for r in data):
        print(f"이미 등록됨: {name}")
        sys.exit(1)

    # 새 항목 구성
    new_entry = {
        "rank": 0,
        "group": extract_data["group"],
        "name": name,
        "category": category,
        "category_short": cat_short,
        "total_reviews": str(extract_data.get("total_reviews", "")),
        "ratio": extract_data["ratio"],
        "keywords": [
            {"rank": i+1, **kw}
            for i, kw in enumerate(extract_data.get("keywords", []))
        ],
        "verdict": verdict
    }

    data.append(new_entry)

    # 저장
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[2/3] restaurants.json 추가 완료 ({len(data)}곳)")

    # HTML + GS 자동 재생성
    print("[3/3] HTML + GS 재생성...")
    subprocess.run([sys.executable, os.path.join(BASE, "build_html.py")])
    subprocess.run([sys.executable, os.path.join(BASE, "generate_gs.py")])

    print(f"\n완료: {name} ({new_entry['group']}그룹, {new_entry['ratio']}배)")

if __name__ == "__main__":
    main()
