#!/usr/bin/env python3
"""
restaurants.json → 목포맛집_리뷰분석.html 생성
Usage: python build_html.py
새 식당 추가 후 실행하면 HTML 자동 재생성
"""
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
JSON_FILE = os.path.join(BASE, "restaurants.json")
OUT_FILE = os.path.join(BASE, "목포맛집_리뷰분석.html")

with open(JSON_FILE, "r", encoding="utf-8") as f:
    restaurants = json.load(f)

# 그룹별 분류 + 비율 내림차순 정렬
a_group = sorted([r for r in restaurants if r["group"] == "A"], key=lambda x: x["ratio"], reverse=True)
b_group = sorted([r for r in restaurants if r["group"] == "B"], key=lambda x: x["ratio"], reverse=True)
c_group = sorted([r for r in restaurants if r["group"] == "C"], key=lambda x: x["ratio"], reverse=True)
all_sorted = sorted(restaurants, key=lambda x: x["ratio"], reverse=True)

# 전체 순위 재계산
for i, r in enumerate(all_sorted, 1):
    r["rank"] = i

total = len(restaurants)
count_a = len(a_group)
count_b = len(b_group)
count_c = len(c_group)


def fmt_count(n):
    """숫자를 콤마 포함 문자열로"""
    return f"{n:,}"


def render_card(r, group_rank):
    g = r["group"].lower()
    kws = r["keywords"]
    max_count = kws[0]["count"] if kws else 1

    kw_html = ""
    fill_classes = ["first", "second", "other"]
    for i, kw in enumerate(kws[:3]):
        width = round(kw["count"] / max_count * 100, 1)
        fc = fill_classes[i]
        cnt = fmt_count(kw["count"])
        kw_html += (
            f'    <div class="keyword-bar">\n'
            f'      <div class="keyword-label">'
            f'<span class="name">{i+1}위 {kw["text"]}</span>'
            f'<span class="count">{cnt}</span></div>\n'
            f'      <div class="bar-bg"><div class="bar-fill {fc}" style="width:{width}%">{cnt}</div></div>\n'
            f'    </div>\n'
        )

    tr = str(r.get("total_reviews", ""))
    ratio_str = f"{r['ratio']:.2f}"

    return (
        f'  <div class="card {g}">\n'
        f'    <div class="card-header">\n'
        f'      <div>\n'
        f'        <div class="rank">{r["group"]}-{group_rank}</div>\n'
        f'        <div class="restaurant-name">{r["name"]}</div>\n'
        f'        <div class="category">{r["category"]}</div>\n'
        f'      </div>\n'
        f'      <div class="ratio-badge {g}">{ratio_str}배</div>\n'
        f'    </div>\n'
        f'    <div class="review-count">방문자리뷰 {tr}건</div>\n'
        f'{kw_html}'
        f'    <div class="verdict {g}">\n'
        f'      {r["verdict"]}\n'
        f'    </div>\n'
        f'  </div>\n'
    )


def render_group(group_list):
    return "".join(render_card(r, i+1) for i, r in enumerate(group_list))


def render_table_row(rank, r):
    g = r["group"].lower()
    color = {"a": "#2ecc71", "b": "#f39c12", "c": "#e74c3c"}[g]
    kws = r["keywords"]
    kw1 = f"{kws[0]['text']} ({fmt_count(kws[0]['count'])})" if len(kws) > 0 else "-"
    kw2 = f"{kws[1]['text']} ({fmt_count(kws[1]['count'])})" if len(kws) > 1 else "-"
    name_html = f"<strong>{r['name']}</strong>" if r["group"] == "A" else r["name"]
    cat = r.get("category_short") or r["category"].split("|")[0].strip()
    tr = str(r.get("total_reviews", ""))
    ratio_str = f"{r['ratio']:.2f}"
    return (
        f'    <tr class="group-{g}">'
        f'<td>{rank}</td>'
        f'<td style="color:{color};font-weight:bold;">{r["group"]}</td>'
        f'<td>{name_html}</td>'
        f'<td>{cat}</td>'
        f'<td>{kw1}</td>'
        f'<td>{kw2}</td>'
        f'<td><strong>{ratio_str}x</strong></td>'
        f'<td>{tr}</td>'
        f'</tr>'
    )


def render_conclusion_list(group_list):
    return ", ".join(f"{r['name']}({r['ratio']:.2f}x)" for r in group_list)


# ── HTML 생성 ──────────────────────────────────────────────
table_rows_html = "\n".join(render_table_row(i+1, r) for i, r in enumerate(all_sorted))
a_cards_html = render_group(a_group)
b_cards_html = render_group(b_group)
c_cards_html = render_group(c_group)
a_list = render_conclusion_list(a_group)
b_list = render_conclusion_list(b_group)
c_list = render_conclusion_list(c_group)

html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>목포 맛집 리뷰 키워드 분석 ({total}곳)</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: 'Malgun Gothic', sans-serif; background: #f5f5f5; padding: 20px; }}
  h1 {{ text-align: center; margin: 20px 0 10px; color: #1a1a2e; font-size: 28px; }}
  .subtitle {{ text-align: center; color: #666; margin-bottom: 30px; font-size: 14px; line-height: 1.6; }}
  .time-banner {{
    text-align: center; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff;
    padding: 16px 30px; border-radius: 12px; font-size: 18px; font-weight: bold;
    max-width: 700px; margin: 0 auto 30px; box-shadow: 0 4px 15px rgba(102,126,234,0.4);
  }}
  .time-banner .big {{ font-size: 28px; display: block; margin-top: 4px; }}

  .legend {{ display: flex; justify-content: center; gap: 30px; margin-bottom: 25px; font-size: 13px; flex-wrap: wrap; }}
  .legend span {{ display: flex; align-items: center; gap: 6px; }}
  .dot-a {{ width: 14px; height: 14px; border-radius: 50%; background: #2ecc71; }}
  .dot-b {{ width: 14px; height: 14px; border-radius: 50%; background: #f39c12; }}
  .dot-c {{ width: 14px; height: 14px; border-radius: 50%; background: #e74c3c; }}

  .group-title {{
    max-width: 1400px; margin: 35px auto 18px; padding: 14px 22px; border-radius: 12px;
    font-size: 20px; font-weight: bold; color: #fff;
  }}
  .group-title.a {{ background: linear-gradient(90deg, #2ecc71, #27ae60); }}
  .group-title.b {{ background: linear-gradient(90deg, #f39c12, #e67e22); }}
  .group-title.c {{ background: linear-gradient(90deg, #e74c3c, #c0392b); }}
  .group-title .count {{ font-size: 14px; font-weight: normal; opacity: 0.9; margin-left: 10px; }}

  .card-container {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 18px; max-width: 1400px; margin: 0 auto; }}
  .card {{
    background: #fff; border-radius: 14px; padding: 22px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    border-left: 6px solid #ccc; transition: transform 0.15s;
  }}
  .card:hover {{ transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,0.12); }}
  .card.a {{ border-left-color: #2ecc71; }}
  .card.b {{ border-left-color: #f39c12; }}
  .card.c {{ border-left-color: #e74c3c; }}

  .card-header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }}
  .rank {{ font-size: 13px; color: #999; font-weight: bold; }}
  .restaurant-name {{ font-size: 20px; font-weight: bold; color: #1a1a2e; }}
  .category {{ font-size: 12px; color: #888; margin-top: 2px; }}
  .ratio-badge {{
    font-size: 15px; font-weight: bold; padding: 6px 14px; border-radius: 20px; color: #fff; white-space: nowrap;
  }}
  .ratio-badge.a {{ background: #2ecc71; }}
  .ratio-badge.b {{ background: #f39c12; }}
  .ratio-badge.c {{ background: #e74c3c; }}

  .review-count {{ font-size: 12px; color: #999; margin-bottom: 10px; }}

  .keyword-bar {{ margin: 5px 0; }}
  .keyword-label {{ display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px; }}
  .keyword-label .name {{ color: #333; }}
  .keyword-label .count {{ color: #888; font-weight: bold; }}
  .bar-bg {{ background: #eee; border-radius: 6px; height: 22px; overflow: hidden; }}
  .bar-fill {{ height: 100%; border-radius: 6px; display: flex; align-items: center; padding-left: 8px; font-size: 11px; color: #fff; font-weight: bold; min-width: 30px; }}
  .bar-fill.first {{ background: linear-gradient(90deg, #667eea, #764ba2); }}
  .bar-fill.second {{ background: linear-gradient(90deg, #f093fb, #f5576c); }}
  .bar-fill.other {{ background: #bbb; }}

  .verdict {{ margin-top: 12px; padding: 10px 14px; border-radius: 8px; font-size: 13px; line-height: 1.5; }}
  .verdict.a {{ background: #e8f8f0; color: #1a7a4c; }}
  .verdict.b {{ background: #fef5e7; color: #9a6c00; }}
  .verdict.c {{ background: #fdecea; color: #a93226; }}

  .info-section {{ max-width: 1400px; margin: 0 auto 30px; background: #fff; border-radius: 14px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }}
  .info-section h2 {{ color: #1a1a2e; margin-bottom: 12px; font-size: 18px; }}
  .info-section p {{ font-size: 14px; color: #555; line-height: 1.8; }}

  .summary-table {{ width: 100%; border-collapse: collapse; margin-top: 10px; max-width: 1400px; margin-left: auto; margin-right: auto; }}
  .summary-table th, .summary-table td {{ padding: 10px 14px; text-align: left; border-bottom: 1px solid #eee; font-size: 13px; }}
  .summary-table th {{ background: #f8f9fa; color: #333; font-weight: bold; position: sticky; top: 0; }}
  .summary-table tr:hover {{ background: #f8f9fa; }}
  .summary-table tr.group-a {{ background: #e8f8f0; }}
  .summary-table tr.group-b {{ background: #fef5e7; }}
  .summary-table tr.group-c {{ background: #fdecea; }}

  .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 20px 0; }}
  .stat-box {{ background: #f8f9fa; border-radius: 10px; padding: 18px; text-align: center; }}
  .stat-box .num {{ font-size: 32px; font-weight: bold; color: #1a1a2e; }}
  .stat-box .label {{ font-size: 13px; color: #888; margin-top: 4px; }}
</style>
</head>
<body>

<h1>목포 맛집 리뷰 키워드 분석 리포트</h1>
<p class="subtitle">
  네이버 플레이스 방문자 리뷰 키워드 기반 분석 | 총 <strong>{total}곳</strong> | 수집일: 2026-03-24<br>
  <strong>분석 기준:</strong> 리뷰 키워드 1순위가 2순위보다 <strong>2배 이상</strong> 많으면 = 해당 특성이 압도적으로 좋은 식당
</p>

<div class="time-banner">
  전체 크롤링 소요시간<span class="big">약 25분 (7차 배치 누적)</span>
</div>

<div class="legend">
  <span><div class="dot-a"></div> A그룹: 압도형 (2배 이상)</span>
  <span><div class="dot-b"></div> B그룹: 준수형 (1.5~2배)</span>
  <span><div class="dot-c"></div> C그룹: 동급형 (1.5배 미만, 별도관리)</span>
</div>

<div class="info-section">
  <h2>분석 방법론</h2>
  <p>
    네이버 플레이스의 <strong>방문자 리뷰 키워드</strong>는 실제 방문한 사람들이 선택한 태그입니다.<br>
    "1순위 키워드 / 2순위 키워드" 비율이 <strong>2배 이상</strong>이면, 해당 식당의 핵심 강점(주로 "음식이 맛있어요")이
    다른 요소를 압도한다는 뜻입니다. 즉 <strong>맛에 대한 확신이 매우 높은 식당</strong>이라고 볼 수 있습니다.<br>
    반면 비율이 낮으면 맛 외에도 분위기, 특별한 메뉴, 신선도 등 여러 요소가 고르게 좋다는 뜻이기도 합니다.
  </p>
  <div class="stats-grid">
    <div class="stat-box"><div class="num">{total}</div><div class="label">총 분석 식당</div></div>
    <div class="stat-box"><div class="num" style="color:#2ecc71;">{count_a}</div><div class="label">A그룹 (압도형)</div></div>
    <div class="stat-box"><div class="num" style="color:#f39c12;">{count_b}</div><div class="label">B그룹 (준수형)</div></div>
    <div class="stat-box"><div class="num" style="color:#e74c3c;">{count_c}</div><div class="label">C그룹 (동급형)</div></div>
  </div>
</div>

<!-- ==================== A그룹: 압도형 ==================== -->
<div class="group-title a">A그룹 - 압도형 (1순위/2순위 >= 2.0배)<span class="count">{count_a}곳</span></div>
<div class="card-container">

{a_cards_html}
</div>

<!-- ==================== B그룹: 준수형 ==================== -->
<div class="group-title b">B그룹 - 준수형 (1.5배 이상 ~ 2.0배 미만)<span class="count">{count_b}곳</span></div>
<div class="card-container">

{b_cards_html}
</div>

<!-- ==================== C그룹: 동급형 ==================== -->
<div class="group-title c">C그룹 - 동급형 (1.5배 미만, 별도관리)<span class="count">{count_c}곳</span></div>
<div class="card-container">

{c_cards_html}
</div>

<!-- ==================== 종합 순위표 ==================== -->
<h2 style="text-align:center; margin: 40px 0 20px; color: #1a1a2e;">종합 순위표 (1순위/2순위 비율 기준, {total}곳)</h2>

<div style="max-width:1400px; margin:0 auto; overflow-x:auto;">
<table class="summary-table">
  <thead>
    <tr>
      <th>순위</th>
      <th>그룹</th>
      <th>식당명</th>
      <th>전문분야</th>
      <th>1순위 키워드 (수)</th>
      <th>2순위 키워드 (수)</th>
      <th>비율</th>
      <th>총 리뷰</th>
    </tr>
  </thead>
  <tbody>
{table_rows_html}
  </tbody>
</table>
</div>

<div class="info-section" style="margin-top: 30px;">
  <h2>분석 결론</h2>
  <p>
    <strong>A그룹 (압도형, {count_a}곳) - "맛이 확실한 식당":</strong><br>
    {a_list}<br><br>

    <strong>B그룹 (준수형, {count_b}곳) - "맛 좋고 다른 요소도 훌륭":</strong><br>
    {b_list}<br><br>

    <strong>C그룹 (동급형, {count_c}곳) - "맛=신선도 동급, 별도관리":</strong><br>
    {c_list}<br><br>

    <strong>핵심 발견:</strong><br>
    - A그룹 식당들은 대부분 <strong>한 가지 전문 메뉴</strong>에 집중 (갈비, 동태탕, 한우, 라멘, 준치회, 해장국, 낙지, 꽃게, 국밥, 백반 등)<br>
    - C그룹은 회/해산물·조개 전문점이 대부분으로, "신선도"가 "맛" 만큼 중요한 장르적 특성. 남태평양은 신선도가 맛을 역전한 유일한 사례<br>
    - B그룹은 맛이 좋으면서도 가성비, 양, 친절함, 반찬 등 다른 강점도 고르게 갖춘 균형형<br><br>

    <strong>데이터 출처:</strong> 네이버 플레이스 방문자 리뷰 키워드 (2026년 3월 23~24일 수집)<br>
    <strong>수집 방법:</strong> Firecrawl MCP + r.jina.ai + 네이버 모바일 검색 최적화 크롤링 (7차 배치)<br>
    <strong>총 소요시간:</strong> 약 25분 | <strong>Firecrawl 크레딧:</strong> 399/500 사용<br>
    <strong>7차 배치 제외:</strong> 삼화횟집(네이버 플레이스 미등록), 맛깔나게수산(리뷰 10명 미만)
  </p>
</div>

</body>
</html>"""

with open(OUT_FILE, "w", encoding="utf-8") as f:
    f.write(html)

print(f"HTML 생성 완료: {total}곳 (A:{count_a} B:{count_b} C:{count_c})")
print(f"저장: {OUT_FILE}")
