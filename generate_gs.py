#!/usr/bin/env python3
"""
restaurants.json → google_sheets_목포맛집.gs 자동 생성
Usage: python generate_gs.py
"""
import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE, "restaurants.json"), encoding="utf-8") as f:
    restaurants = json.load(f)

# 비율 내림차순 정렬 + 전체 순위 재계산
restaurants = sorted(restaurants, key=lambda x: x["ratio"], reverse=True)
for i, r in enumerate(restaurants, 1):
    r["rank"] = i

total   = len(restaurants)
count_a = sum(1 for r in restaurants if r["group"] == "A")
count_b = sum(1 for r in restaurants if r["group"] == "B")
count_c = sum(1 for r in restaurants if r["group"] == "C")

def kw(r, idx):
    """idx번째 키워드 텍스트 (없으면 빈 문자열)"""
    kws = r.get("keywords", [])
    return kws[idx]["text"] if idx < len(kws) else ""

def cnt(r, idx):
    """idx번째 키워드 카운트 (없으면 0)"""
    kws = r.get("keywords", [])
    return kws[idx]["count"] if idx < len(kws) else 0

def js_str(s):
    """JS 문자열 이스케이프"""
    return s.replace("\\", "\\\\").replace('"', '\\"')

def fmt_total(s):
    s = str(s)
    return s if s else "?"

# ── 데이터 행 생성 ──────────────────────────────────────────
rows = []
for r in restaurants:
    row = (
        f'    [{r["rank"]}, '
        f'"{r["group"]}", '
        f'"{js_str(r["name"])}", '
        f'"{js_str(r.get("category_short") or r["category"].split("|")[0].strip())}", '
        f'"{js_str(kw(r, 0))}", '
        f'"{js_str(kw(r, 1))}", '
        f'"{js_str(kw(r, 2))}", '
        f'{r["ratio"]:.2f}, '
        f'"{fmt_total(r.get("total_reviews", ""))}", '
        f'{cnt(r, 0)}, '
        f'{cnt(r, 1)}]'
    )
    rows.append(row)

data_js = ",\n".join(rows)

# ── GS 스크립트 생성 ────────────────────────────────────────
gs = f"""// 목포 맛집 리뷰 키워드 분석 - 구글 시트 스크립트
// 생성: generate_gs.py (restaurants.json 기준, {total}곳)
// 사용법: 구글 시트 → 확장 프로그램 → Apps Script → 붙여넣기 → 실행

// ──────────────────────────────────────────────────────────
// [A] 새 스프레드시트 생성
// ──────────────────────────────────────────────────────────
function createMokpoRestaurantSheet() {{
  var ss = SpreadsheetApp.create("목포 맛집 리뷰 키워드 분석 ({total}곳)");
  _buildSheet(ss);
  var url = ss.getUrl();
  Logger.log("생성 완료: " + url);
  SpreadsheetApp.getUi().alert("생성 완료!\\n\\n{total}곳 데이터 입력 완료.\\n\\n" + url);
}}

// ──────────────────────────────────────────────────────────
// [B] 기존 스프레드시트 업데이트 (ID 입력 필요)
// ──────────────────────────────────────────────────────────
function updateMokpoRestaurantSheet() {{
  // TODO: 아래 ID를 실제 스프레드시트 ID로 교체하세요
  var SPREADSHEET_ID = "여기에_스프레드시트_ID_입력";
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  _buildSheet(ss);
  Logger.log("업데이트 완료");
  SpreadsheetApp.getUi().alert("{total}곳으로 업데이트 완료!");
}}

// ──────────────────────────────────────────────────────────
// 공통: 시트 구성
// ──────────────────────────────────────────────────────────
function _buildSheet(ss) {{
  // 기존 시트 초기화
  var mainSheet = ss.getSheetByName("종합 순위표");
  if (!mainSheet) mainSheet = ss.getActiveSheet();
  mainSheet.setName("종합 순위표");
  mainSheet.clearContents();
  mainSheet.clearFormats();

  // 컬럼 너비
  mainSheet.setColumnWidth(1, 50);
  mainSheet.setColumnWidth(2, 50);
  mainSheet.setColumnWidth(3, 160);
  mainSheet.setColumnWidth(4, 120);
  mainSheet.setColumnWidth(5, 220);
  mainSheet.setColumnWidth(6, 220);
  mainSheet.setColumnWidth(7, 220);
  mainSheet.setColumnWidth(8, 70);
  mainSheet.setColumnWidth(9, 80);
  mainSheet.setColumnWidth(10, 70);
  mainSheet.setColumnWidth(11, 70);

  // 헤더
  var header = ["순위","그룹","식당명","전문분야","1순위 키워드","2순위 키워드","3순위 키워드","비율","총 리뷰","1순위 수","2순위 수"];
  mainSheet.getRange(1, 1, 1, header.length).setValues([header])
    .setBackground("#1a1a2e")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  mainSheet.setFrozenRows(1);

  // 데이터
  var data = [
{data_js}
  ];

  mainSheet.getRange(2, 1, data.length, data[0].length).setValues(data);

  // 그룹별 색상
  var greenBg = "#e8f8f0", orangeBg = "#fef5e7", redBg = "#fdecea";
  for (var i = 0; i < data.length; i++) {{
    var row = i + 2;
    var group = data[i][1];
    var bg = group === "A" ? greenBg : group === "B" ? orangeBg : redBg;
    mainSheet.getRange(row, 1, 1, header.length).setBackground(bg);
    var fc = group === "A" ? "#2ecc71" : group === "B" ? "#f39c12" : "#e74c3c";
    mainSheet.getRange(row, 2).setFontColor(fc).setFontWeight("bold");
  }}

  // 정렬
  mainSheet.getRange(2, 8, data.length, 1).setFontWeight("bold").setHorizontalAlignment("center");
  mainSheet.getRange(2, 1, data.length, 1).setHorizontalAlignment("center");
  mainSheet.getRange(2, 2, data.length, 1).setHorizontalAlignment("center");
  mainSheet.getRange(2, 9, data.length, 1).setHorizontalAlignment("center");
  mainSheet.getRange(2, 10, data.length, 2).setHorizontalAlignment("center");

  // ── 분석 요약 시트 ──
  var sumSheet = ss.getSheetByName("분석 요약");
  if (!sumSheet) sumSheet = ss.insertSheet("분석 요약");
  sumSheet.clearContents();
  sumSheet.clearFormats();
  sumSheet.setColumnWidth(1, 200);
  sumSheet.setColumnWidth(2, 320);

  var summary = [
    ["목포 맛집 리뷰 키워드 분석", ""],
    ["", ""],
    ["분석 기준", "1순위 키워드 / 2순위 키워드 비율"],
    ["A그룹 (압도형)", "2.0배 이상 - {count_a}곳"],
    ["B그룹 (준수형)", "1.5~2.0배 - {count_b}곳"],
    ["C그룹 (동급형)", "1.5배 미만 - {count_c}곳"],
    ["", ""],
    ["총 분석 식당", "{total}곳"],
    ["데이터 출처", "네이버 플레이스 방문자 리뷰 키워드"],
    ["수집일", "2026-03-24"],
    ["수집 방법", "r.jina.ai 크롤링 + extract_restaurant.py"],
    ["", ""],
    ["핵심 발견", ""],
    ["1", "A그룹은 대부분 한 가지 전문 메뉴에 집중 (갈비, 추어탕, 한우, 라멘 등)"],
    ["2", "C그룹은 회/해산물/조개 전문점이 대부분 - 신선도가 맛만큼 중요한 장르적 특성"],
    ["3", "B그룹은 맛+가성비/양/친절함 등 여러 강점이 고르게 분포된 균형형"],
    ["4", "남태평양은 신선도(70)가 맛(68)을 역전한 유일한 사례"],
  ];

  sumSheet.getRange(1, 1, summary.length, 2).setValues(summary);
  sumSheet.getRange(1, 1, 1, 2).setFontSize(16).setFontWeight("bold");
  sumSheet.getRange(3, 1, 4, 1).setFontWeight("bold");
  sumSheet.getRange(8, 1, 4, 1).setFontWeight("bold");
  sumSheet.getRange(13, 1, 1, 1).setFontWeight("bold");
}}
"""

out_path = os.path.join(BASE, "google_sheets_목포맛집.gs")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(gs)

print(f"생성 완료: google_sheets_목포맛집.gs ({total}곳, A:{count_a} B:{count_b} C:{count_c})")
