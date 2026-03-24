#!/usr/bin/env python3
"""
목포 맛집 후보 수집기 - Claude 개입 없이 독립 실행
Usage: python collect_candidates.py
Output: candidates.json (이름 + Place ID 목록)
"""
import re
import json
import time
import urllib.request
import urllib.parse
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE = os.path.dirname(os.path.abspath(__file__))

# ── 검색 쿼리 목록 ─────────────────────────────────────────
QUERIES = [
    "목포 맛집",
    "목포 낙지 맛집",
    "목포 회 맛집",
    "목포 해산물 맛집",
    "목포 한식 맛집",
    "목포 백반 맛집",
    "목포 중식 맛집",
    "목포 일식 맛집",
    "목포 분식 맛집",
    "목포 고기 맛집",
    "목포 게장 맛집",
    "목포 민어 맛집",
    "목포 홍어 맛집",
    "목포 아구찜 맛집",
    "목포 포차 맛집",
    "목포 갈치 맛집",
    "목포 꽃게 맛집",
    "목포 전복 맛집",
    "목포 복어 맛집",
    "목포 라멘 맛집",
    "목포 짬뽕 맛집",
    "목포 국밥 맛집",
    "목포 추어탕 맛집",
    "목포 오리 맛집",
    "목포 갈비 맛집",
]

def fetch_jina(url, retries=2):
    jina_url = "https://r.jina.ai/" + url
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                jina_url,
                headers={"User-Agent": "Mozilla/5.0", "Accept": "text/plain"}
            )
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.read().decode("utf-8")
        except Exception as e:
            if attempt == retries - 1:
                return ""
            time.sleep(2)
    return ""

SERVICE_TAGS = {'네이버페이', '예약', '쿠폰', '배달', '톡톡', '주문', '포장', '픽업', '할인'}
SOLO_CATEGORIES = {
    '국밥', '생선회', '한식', '중식', '일식', '양식', '분식',
    '포장마차', '냉면', '초밥', '라멘', '짬뽕',
    '종합분식', '해장국', '베이커리', '일본식라면',
}

def clean_name(name):
    """링크 텍스트에서 서비스 배지·카테고리 메타데이터 제거"""
    # 패턴1: "이름 카테고리 목포" → 카테고리+목포 제거
    m = re.search(r'\s+[가-힣,·/]+\s+목포\b', name)
    if m and m.start() >= 2:
        name = name[:m.start()].strip()

    # 패턴2: 서비스 태그·콤마 카테고리·단독 카테고리어 이후 제거
    parts = name.split()
    for i, part in enumerate(parts):
        if i == 0:
            continue
        is_category = (
            part in SERVICE_TAGS
            or (',' in part and re.match(r'^[가-힣,·/]+$', part))
            or part in SOLO_CATEGORIES
            or re.match(r'^[가-힣]{1,4}요리$', part)       # 낙지요리, 복어요리 등
            or re.match(r'^(?:한|중|일|양)식당$', part)    # 중식당, 한식당 등
        )
        if is_category:
            name = ' '.join(parts[:i]).strip()
            break

    return name

def extract_restaurants(content):
    """Jina 마크다운에서 식당명 + Place ID + 주소 힌트 추출"""
    results = {}  # pid → {name, mokpo_hint}

    # 패턴1: "[식당명](https://m.place.naver.com/restaurant/ID"
    for m in re.finditer(
        r'\[([^\]]{1,40})\]\(https://m\.place\.naver\.com/restaurant/(\d+)',
        content
    ):
        name, pid = clean_name(m.group(1).strip()), m.group(2)
        if not name or len(name) < 2 or pid in results:
            continue
        # 주변 200자에 목포 언급 여부
        snippet = content[max(0, m.start()-100):m.end()+100]
        mokpo_hint = "목포" in snippet
        results[pid] = {"name": name, "mokpo_hint": mokpo_hint}

    return results

def is_mokpo(pid):
    """Place ID의 주소가 목포인지 확인 (검증 필요한 경우만 호출)"""
    url = f"https://m.place.naver.com/restaurant/{pid}/home"
    content = fetch_jina(url)
    return "목포시" in content or "전남 목포" in content

def main():
    skip_verify = "--skip-verify" in sys.argv

    # 기존 등록된 식당 로드
    json_path = os.path.join(BASE, "restaurants.json")
    with open(json_path, encoding="utf-8") as f:
        existing = json.load(f)
    existing_names = {r["name"] for r in existing}

    # 블랙리스트 로드
    bl_path = os.path.join(BASE, "blacklist.json")
    if os.path.exists(bl_path):
        with open(bl_path, encoding="utf-8") as f:
            blacklist = json.load(f)
        bl_names = {r["name"] for r in blacklist}
        bl_ids   = {r["place_id"] for r in blacklist}
    else:
        bl_names, bl_ids = set(), set()

    print(f"기존 등록: {len(existing_names)}곳")
    if skip_verify:
        print("[빠른 모드] 목포 소재 검증 건너뜀 (모든 쿼리에 '목포' 포함으로 신뢰)")

    # 수집
    all_candidates = {}  # pid → {name, mokpo_hint}

    for i, query in enumerate(QUERIES):
        encoded = urllib.parse.quote(query)
        url = f"https://m.search.naver.com/search.naver?query={encoded}&where=m_local"
        print(f"[{i+1}/{len(QUERIES)}] {query} ...", end=" ", flush=True)
        content = fetch_jina(url)
        found = extract_restaurants(content)
        new = {pid: info for pid, info in found.items()
               if pid not in all_candidates
               and info["name"] not in existing_names
               and info["name"] not in bl_names
               and pid not in bl_ids}
        all_candidates.update(new)
        print(f"+{len(new)}개 (누적 {len(all_candidates)}개)")
        time.sleep(0.5)

    print(f"\n총 후보: {len(all_candidates)}개")

    # 목포 소재 필터링
    verified = []
    skipped = 0

    if skip_verify:
        # 검색 결과 힌트만으로 필터 (목포 언급 있거나 쿼리에 목포 포함)
        for pid, info in all_candidates.items():
            verified.append({"name": info["name"], "place_id": pid})
    else:
        print("목포 소재 확인 중... (--skip-verify 로 건너뛸 수 있음)")
        for j, (pid, info) in enumerate(all_candidates.items()):
            name = info["name"]
            # 힌트로 목포 확인된 경우 API 호출 생략
            if info["mokpo_hint"]:
                verified.append({"name": name, "place_id": pid})
                print(f"  [{j+1}] {name} → 목포 ✓ (힌트)")
            else:
                print(f"  [{j+1}] {name} 확인 중...", end=" ", flush=True)
                if is_mokpo(pid):
                    verified.append({"name": name, "place_id": pid})
                    print("목포 ✓")
                else:
                    skipped += 1
                    print("제외")
                time.sleep(0.3)

    # 저장
    out_path = os.path.join(BASE, "candidates.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(verified, f, ensure_ascii=False, indent=2)

    print(f"\n완료: {len(verified)}곳 저장 → candidates.json")
    if not skip_verify:
        print(f"(비목포 제외: {skipped}곳)")

if __name__ == "__main__":
    main()
