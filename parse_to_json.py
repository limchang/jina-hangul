#!/usr/bin/env python3
"""
목포맛집_리뷰분석.html → restaurants.json 변환 (1회성 실행)
Usage: python parse_to_json.py
"""
import re
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
HTML_FILE = os.path.join(BASE, "목포맛집_리뷰분석.html")
OUT_FILE = os.path.join(BASE, "restaurants.json")

with open(HTML_FILE, "r", encoding="utf-8") as f:
    html = f.read()

# ── 1. 카드 파싱 (name, group, category, keywords, ratio, total_reviews, verdict) ──
cards = {}

card_chunks = re.split(r'(?=<div class="card [abc]">)', html)
for chunk in card_chunks:
    if not chunk.startswith('<div class="card '):
        continue

    group_m = re.match(r'<div class="card ([abc])">', chunk)
    if not group_m:
        continue
    group = group_m.group(1).upper()

    name_m = re.search(r'<div class="restaurant-name">(.+?)</div>', chunk)
    if not name_m:
        continue
    name = name_m.group(1).strip()

    cat_m = re.search(r'<div class="category">(.+?)</div>', chunk)
    category = cat_m.group(1).strip() if cat_m else ""

    rev_m = re.search(r'방문자리뷰\s*([\d,~]+)건', chunk)
    total_reviews = rev_m.group(1).strip() if rev_m else ""

    ratio_m = re.search(r'<div class="ratio-badge [abc]">([\d.]+)배</div>', chunk)
    ratio = float(ratio_m.group(1)) if ratio_m else 0.0

    kw_matches = re.findall(
        r'<span class="name">(\d)위 (.+?)</span><span class="count">([^<]+)</span>',
        chunk
    )
    keywords = []
    for rank_str, text, count_str in kw_matches:
        # "약 380", "~380", "1,234" 등 모두 처리
        digits = re.sub(r'[^\d]', '', count_str)
        keywords.append({
            "rank": int(rank_str),
            "text": text.strip(),
            "count": int(digits) if digits else 0
        })
    keywords.sort(key=lambda x: x["rank"])

    verdict_m = re.search(r'<div class="verdict [abc]">\s*(.*?)\s*</div>', chunk, re.DOTALL)
    verdict = ""
    if verdict_m:
        verdict = re.sub(r'\s+', ' ', verdict_m.group(1).strip())

    cards[name] = {
        "group": group,
        "name": name,
        "category": category,
        "total_reviews": total_reviews,
        "ratio": ratio,
        "keywords": keywords,
        "verdict": verdict,
        "rank": 0,
        "category_short": ""
    }

# ── 2. 테이블에서 rank + category_short 추출 ──────────────
table_rows = re.findall(
    r'<tr class="group-[abc]"><td>(\d+)</td><td[^>]*>[ABC]</td>'
    r'<td>(?:<strong>)?(.+?)(?:</strong>)?</td>'
    r'<td>(.+?)</td>',
    html
)
for rank_str, name, cat_short in table_rows:
    name = name.strip()
    cat = cat_short.strip()
    if name in cards:
        cards[name]["rank"] = int(rank_str)
        cards[name]["category_short"] = cat
    else:
        # 카드 이름이 더 길 수 있음 (예: "카와루라멘" vs "카와루라멘 목포본점")
        matched = next((cn for cn in cards if cn.startswith(name) or name in cn), None)
        if matched:
            cards[matched]["rank"] = int(rank_str)
            cards[matched]["category_short"] = cat

# ── 3. 정렬 및 저장 ───────────────────────────────────────
restaurants = sorted(cards.values(), key=lambda x: x["rank"])

with open(OUT_FILE, "w", encoding="utf-8") as f:
    json.dump(restaurants, f, ensure_ascii=False, indent=2)

print(f"완료: {len(restaurants)}곳 → restaurants.json")
missing = [r for r in restaurants if r["rank"] == 0]
if missing:
    print(f"[경고] rank 매칭 실패: {[r['name'] for r in missing]}")
no_kw = [r for r in restaurants if not r["keywords"]]
if no_kw:
    print(f"[경고] 키워드 없음: {[r['name'] for r in no_kw]}")
