#!/usr/bin/env python3
"""
restaurants.json → 구글 시트 자동 업데이트
Usage: python update_sheets.py

API 호출 최소화: 데이터 1회 + 서식 1회 (배치)
"""
import json, os, sys, time
sys.stdout.reconfigure(encoding='utf-8')
import gspread
from google.oauth2.service_account import Credentials

BASE           = os.path.dirname(os.path.abspath(__file__))
CRED_FILE      = os.path.join(BASE, "gen-lang-client-0505770135-3e3c452d4f9b.json")
SPREADSHEET_ID = "18xGP4mMk43FkLgC8XcDlE7fxHetKNrptaDe0ALnvQcI"

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# ── 데이터 로드 ────────────────────────────────────────────
with open(os.path.join(BASE, "restaurants.json"), encoding="utf-8") as f:
    restaurants = json.load(f)

restaurants = sorted(restaurants, key=lambda x: x["ratio"], reverse=True)
for i, r in enumerate(restaurants, 1):
    r["rank"] = i

total   = len(restaurants)
count_a = sum(1 for r in restaurants if r["group"] == "A")
count_b = sum(1 for r in restaurants if r["group"] == "B")
count_c = sum(1 for r in restaurants if r["group"] == "C")

def kw_text(r, idx):
    kws = r.get("keywords", [])
    return kws[idx]["text"] if idx < len(kws) else ""

def kw_cnt(r, idx):
    kws = r.get("keywords", [])
    return kws[idx]["count"] if idx < len(kws) else 0

def retry(fn, retries=5, wait=15):
    for i in range(retries):
        try:
            return fn()
        except gspread.exceptions.APIError as e:
            if "429" in str(e) and i < retries - 1:
                print(f"  Rate limit → {wait}초 대기 후 재시도...")
                time.sleep(wait)
            else:
                raise

# ── 색상 정의 ──────────────────────────────────────────────
BLACK  = {"red": 0.10, "green": 0.10, "blue": 0.18}
WHITE  = {"red": 1.0,  "green": 1.0,  "blue": 1.0}
GREEN  = {"red": 0.91, "green": 0.97, "blue": 0.94}
ORANGE = {"red": 1.0,  "green": 0.96, "blue": 0.91}
RED    = {"red": 0.99, "green": 0.92, "blue": 0.92}
FC_A   = {"red": 0.18, "green": 0.80, "blue": 0.44}
FC_B   = {"red": 0.95, "green": 0.61, "blue": 0.07}
FC_C   = {"red": 0.91, "green": 0.30, "blue": 0.24}

# ── 인증 + 연결 ────────────────────────────────────────────
creds = Credentials.from_service_account_file(CRED_FILE, scopes=SCOPES)
gc    = gspread.authorize(creds)
ss    = gc.open_by_key(SPREADSHEET_ID)
print(f"연결: {ss.title}")
ss.update_title(f"목포 맛집 리뷰 키워드 분석 ({total}곳)")

# ══════════════════════════════════════════════════════════
# [1] 종합 순위표
# ══════════════════════════════════════════════════════════
try:
    ws = ss.worksheet("종합 순위표")
except gspread.WorksheetNotFound:
    ws = ss.add_worksheet("종합 순위표", rows=200, cols=15)

print("종합 순위표 — 데이터 쓰기...")

header = ["순위","그룹","식당명","전문분야","1순위 키워드","2순위 키워드","3순위 키워드","비율","총 리뷰","1순위 수","2순위 수"]
rows = [header]
for r in restaurants:
    cat = r.get("category_short") or r["category"].split("|")[0].strip()
    rows.append([
        r["rank"], r["group"], r["name"], cat,
        kw_text(r,0), kw_text(r,1), kw_text(r,2),
        r["ratio"], str(r.get("total_reviews","")),
        kw_cnt(r,0), kw_cnt(r,1),
    ])

# 데이터 1회 쓰기
retry(lambda: ws.update(rows, value_input_option="USER_ENTERED"))
print(f"  → {total}행 완료")

# 서식: 모든 범위를 한 번의 batch_format 호출로 처리
print("종합 순위표 — 서식 적용 (배치)...")
time.sleep(3)

formats = [
    # 헤더
    {
        "range": "A1:K1",
        "format": {
            "backgroundColor": BLACK,
            "textFormat": {"foregroundColor": WHITE, "bold": True},
            "horizontalAlignment": "CENTER",
        }
    },
    # 비율 컬럼 볼드
    {
        "range": f"H2:H{total+1}",
        "format": {"textFormat": {"bold": True}, "horizontalAlignment": "CENTER"}
    },
    # 순위/그룹 가운데
    {"range": f"A2:B{total+1}", "format": {"horizontalAlignment": "CENTER"}},
    # 리뷰수/키워드수 가운데
    {"range": f"I2:K{total+1}", "format": {"horizontalAlignment": "CENTER"}},
]

# 그룹별 배경색 + 그룹 폰트 색
for r in restaurants:
    row = r["rank"] + 1
    bg = GREEN if r["group"] == "A" else ORANGE if r["group"] == "B" else RED
    fc = FC_A  if r["group"] == "A" else FC_B   if r["group"] == "B" else FC_C
    formats.append({"range": f"A{row}:K{row}", "format": {"backgroundColor": bg}})
    formats.append({"range": f"B{row}", "format": {"textFormat": {"foregroundColor": fc, "bold": True}}})

retry(lambda: ws.batch_format(formats))
print("  → 서식 완료")

# ══════════════════════════════════════════════════════════
# [2] 분석 요약
# ══════════════════════════════════════════════════════════
time.sleep(3)
print("분석 요약 — 업데이트...")

try:
    ws2 = ss.worksheet("분석 요약")
except gspread.WorksheetNotFound:
    ws2 = ss.add_worksheet("분석 요약", rows=30, cols=3)

summary = [
    ["목포 맛집 리뷰 키워드 분석", ""],
    ["", ""],
    ["분석 기준",     "1순위 키워드 / 2순위 키워드 비율"],
    ["A그룹 (압도형)", f"2.0배 이상 — {count_a}곳"],
    ["B그룹 (준수형)", f"1.5~2.0배 — {count_b}곳"],
    ["C그룹 (동급형)", f"1.5배 미만 — {count_c}곳"],
    ["", ""],
    ["총 분석 식당",   f"{total}곳"],
    ["데이터 출처",    "네이버 플레이스 방문자 리뷰 키워드"],
    ["수집일",        "2026-03-24"],
    ["수집 방법",     "r.jina.ai + extract_restaurant.py 자동화"],
]

retry(lambda: ws2.update(summary, value_input_option="USER_ENTERED"))
time.sleep(2)

retry(lambda: ws2.batch_format([
    {"range": "A1:B1", "format": {"textFormat": {"bold": True, "fontSize": 14}}},
    {"range": "A3:A6", "format": {"textFormat": {"bold": True}}},
    {"range": "A8:A11","format": {"textFormat": {"bold": True}}},
]))

print(f"  → 완료")
print(f"\n완료! ({total}곳, A:{count_a} B:{count_b} C:{count_c})")
print(f"URL: {ss.url}")
