#!/usr/bin/env python3
"""
candidates.json에서 N개를 골라 자동 분석 후 restaurants.json에 추가 + 시트 업데이트
Usage: python batch_add.py [개수=10]
"""
import json, os, sys, subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

# 서브프로세스 UTF-8 강제 환경변수
ENV = os.environ.copy()
ENV["PYTHONIOENCODING"] = "utf-8"

BASE = os.path.dirname(os.path.abspath(__file__))
N       = int(sys.argv[1]) if len(sys.argv) > 1 else 10
WORKERS = int(sys.argv[2]) if len(sys.argv) > 2 else 3  # 동시 처리 수

# 카페/베이커리/비음식 제외 키워드
SKIP_KEYWORDS = ['카페', '베이커리', '디저트', '샐러드', '편의점', '마트', 'SUKSAN', '케이블카맛집']

# ── 기존 데이터 로드 ───────────────────────────────────────
with open(os.path.join(BASE, "restaurants.json"), encoding='utf-8') as f:
    existing = json.load(f)
existing_names = {r["name"] for r in existing}
existing_ids   = {r.get("place_id","") for r in existing}

with open(os.path.join(BASE, "candidates.json"), encoding='utf-8') as f:
    candidates = json.load(f)

# ── 블랙리스트 로드 ────────────────────────────────────────
bl_path = os.path.join(BASE, "blacklist.json")
if os.path.exists(bl_path):
    with open(bl_path, encoding='utf-8') as f:
        blacklist = json.load(f)
    bl_names = {r["name"] for r in blacklist}
    bl_ids   = {r["place_id"] for r in blacklist}
else:
    bl_names, bl_ids = set(), set()

# ── 후보 필터링 ────────────────────────────────────────────
filtered = [
    c for c in candidates
    if c["name"] not in existing_names
    and c["place_id"] not in existing_ids
    and c["name"] not in bl_names
    and c["place_id"] not in bl_ids
    and not any(kw in c["name"] for kw in SKIP_KEYWORDS)
]

print(f"후보 {len(filtered)}개 중 {N}개 처리 시작\n")


# ── 자동 verdict 생성 ──────────────────────────────────────
def auto_verdict(name, ratio, group, keywords):
    if not keywords or len(keywords) < 2:
        return f"{ratio:.2f}배."
    kw1, kw2 = keywords[0]["text"], keywords[1]["text"]
    c1, c2   = keywords[0]["count"], keywords[1]["count"]
    kw3_part = f" {keywords[2]['text']}도 높게 평가." if len(keywords) >= 3 else ""
    if group == "A":
        return f'맛 평가({c1})가 2순위({kw2}, {c2})의 <strong>{ratio:.2f}배</strong>로 압도적.{kw3_part}'
    elif group == "B":
        return f'맛 평가({c1})가 2순위({kw2}, {c2})의 <strong>{ratio:.2f}배</strong>. {kw2}도 고르게 높은 균형형.{kw3_part}'
    else:
        return f'맛({c1})과 {kw2}({c2})이 <strong>{ratio:.2f}배</strong>로 근접. 여러 강점이 동급 수준.'

# ── 단일 식당 처리 함수 ────────────────────────────────────
def process_one(cand):
    name = cand["name"]
    pid  = cand["place_id"]
    result = subprocess.run(
        [sys.executable, os.path.join(BASE, "extract_restaurant.py"), name],
        capture_output=True, text=True, encoding='utf-8', env=ENV
    )
    try:
        data = json.loads(result.stdout.strip())
    except:
        return name, pid, None, "파싱 실패"
    if "error" in data or not data.get("keywords"):
        return name, pid, None, "키워드 없음"
    if data.get("total_reviews", 0) < 10:
        return name, pid, None, f"리뷰 {data.get('total_reviews')}건"
    category = data.get("category", "")
    cat_short = category.split("|")[0].strip() if category else ""
    entry = {
        "rank": 0,
        "group": data["group"],
        "name": name,
        "category": category,
        "category_short": cat_short,
        "total_reviews": str(data.get("total_reviews", "")),
        "ratio": data["ratio"],
        "keywords": [{"rank": j+1, **kw} for j, kw in enumerate(data["keywords"])],
        "verdict": auto_verdict(name, data["ratio"], data["group"], data["keywords"]),
        "place_id": pid,
    }
    return name, pid, entry, "ok"

# ── 병렬 배치 처리 ─────────────────────────────────────────
added   = []
skipped = []
pool    = filtered[:N*2]  # 실패분 감안해 여유있게

print(f"동시 처리: {WORKERS}개\n")

with ThreadPoolExecutor(max_workers=WORKERS) as executor:
    futures = {}
    submitted = 0

    # 초기 WORKERS개 제출
    while submitted < len(pool) and len(futures) < WORKERS:
        cand = pool[submitted]
        if cand["name"] not in existing_names and cand["place_id"] not in existing_ids:
            f = executor.submit(process_one, cand)
            futures[f] = cand
        submitted += 1

    while futures and len(added) < N:
        done_future = next(as_completed(futures))
        cand = futures.pop(done_future)
        name, pid, entry, status = done_future.result()

        if entry:
            existing.append(entry)
            existing_names.add(name)
            existing_ids.add(pid)
            added.append(name)
            print(f"[{len(added)}/{N}] {name} → {entry['group']}그룹 {entry['ratio']:.2f}배 ({entry['keywords'][0]['text']} {entry['keywords'][0]['count']}) ✓")
        else:
            skipped.append(name)
            print(f"[ - ] {name} → {status} 건너뜀")

        # 부족하면 다음 후보 제출
        while submitted < len(pool) and len(added) < N:
            cand = pool[submitted]
            submitted += 1
            if cand["name"] not in existing_names and cand["place_id"] not in existing_ids:
                f = executor.submit(process_one, cand)
                futures[f] = cand
                break

# ── restaurants.json 저장 ──────────────────────────────────
with open(os.path.join(BASE, "restaurants.json"), 'w', encoding='utf-8') as f:
    json.dump(existing, f, ensure_ascii=False, indent=2)

print(f"\n추가 완료: {len(added)}곳 → restaurants.json ({len(existing)}곳)")
if skipped:
    print(f"건너뜀: {skipped}")

# ── HTML + GS + 시트 업데이트 ─────────────────────────────
print("\nHTML 재생성...")
subprocess.run([sys.executable, os.path.join(BASE, "build_html.py")])

print("구글 시트 업데이트...")
subprocess.run([sys.executable, os.path.join(BASE, "update_sheets.py")])

# ── candidates.json에서 추가된 항목 제거 ──────────────────
remaining = [c for c in candidates if c["name"] not in existing_names]
with open(os.path.join(BASE, "candidates.json"), 'w', encoding='utf-8') as f:
    json.dump(remaining, f, ensure_ascii=False, indent=2)

print(f"\n완료. candidates.json 잔여: {len(remaining)}곳")
