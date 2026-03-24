#!/usr/bin/env python3
"""
목포 맛집 키워드 추출기
Usage:
  python extract_restaurant.py "식당명"
  python extract_restaurant.py "식당명" --debug   # Jina 원본 출력 (파싱 안 될 때)
Output: JSON (stdout)
"""

import sys
import re
import json
import urllib.request
import urllib.parse
import time

JINA_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'text/plain',
}

FIRECRAWL_API_KEY = "fc-7a3e6fd28e044b6aa1e8c84b53029f49"

def fetch(url, retries=2):
    jina_url = "https://r.jina.ai/" + url
    for attempt in range(retries):
        try:
            req = urllib.request.Request(jina_url, headers=JINA_HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode('utf-8')
        except Exception as e:
            if attempt == retries - 1:
                raise RuntimeError(f"Fetch 실패: {e}")
            time.sleep(3)

def get_place_id(name):
    """식당명 → Naver Place ID, 플레이스 플러스 여부 반환"""
    query = urllib.parse.quote(f"목포 {name}")
    url = f"https://m.search.naver.com/search.naver?query={query}&where=m_local"
    content = fetch(url)

    for pattern in [
        r'place\.naver\.com/restaurant/(\d+)',
        r'/restaurant/(\d+)',
        r'place\.naver\.com/place/(\d+)',
        r'/place/(\d+)',
    ]:
        m = re.search(pattern, content)
        if m:
            place_id = m.group(1)
            # 검색 결과에서 플레이스 플러스 여부 감지
            snippet_start = max(0, m.start() - 500)
            snippet_end = min(len(content), m.end() + 500)
            snippet = content[snippet_start:snippet_end]
            is_plus = '플레이스 플러스' in snippet
            return place_id, content, is_plus
    return None, content, False

def get_home_content(place_id):
    """Place ID → /home 페이지 원본"""
    url = f"https://m.place.naver.com/restaurant/{place_id}/home"
    return fetch(url)

def get_home_content_firecrawl(place_id):
    """Jina 실패 시 Firecrawl로 JS 렌더링 (플레이스 플러스 등 동적 페이지 대응)"""
    url = f"https://m.place.naver.com/restaurant/{place_id}/home"
    payload = json.dumps({
        "url": url,
        "formats": ["markdown"],
        "waitFor": 1500,
        "mobile": True,
        "onlyMainContent": True,
    }).encode('utf-8')
    req = urllib.request.Request(
        "https://api.firecrawl.dev/v1/scrape",
        data=payload,
        headers={
            "Authorization": f"Bearer {FIRECRAWL_API_KEY}",
            "Content-Type": "application/json",
        }
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode('utf-8'))
    return result.get("data", {}).get("markdown", "")

def parse_data(content):
    """Jina 마크다운에서 리뷰 카운트, 키워드 추출"""
    result = {'total_reviews': 0, 'category': '', 'keywords': []}

    # 총 리뷰수: "방문자 리뷰 918" 링크 텍스트 형태
    m = re.search(r'방문자\s*리뷰\s*([\d,]+)', content)
    if m:
        result['total_reviews'] = int(m.group(1).replace(',', ''))

    # 카테고리: "식당명 카테고리명" 형태로 등장
    m = re.search(r'# ([^\n]+)\n\n.{0,200}?([가-힣,·\s]+(?:요리|전문|식당|집|점|관|포차|회|탕|국|밥|찜|구이|볶음|면|수산|분식|한식|중식|일식|양식))', content[:3000], re.DOTALL)
    if m:
        result['category'] = m.group(2).strip()

    # 키워드: '"키워드텍스트"이 키워드를 선택한 인원 숫자' 패턴 (공백 있/없 모두 허용)
    keywords = re.findall(
        r'"([^"]+)"이 키워드를 선택한 인원\s*([\d,]+)',
        content
    )

    result['keywords'] = [
        {'text': text.strip(), 'count': int(count.replace(',', ''))}
        for text, count in keywords
    ]

    return result

def calc_ratio(keywords):
    if len(keywords) < 2:
        return None
    return round(keywords[0]['count'] / keywords[1]['count'], 2)

def determine_group(ratio):
    if ratio is None:
        return '?'
    if ratio >= 2.0:
        return 'A'
    elif ratio >= 1.5:
        return 'B'
    else:
        return 'C'

def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_restaurant.py \"식당명\" [--debug]", file=sys.stderr)
        sys.exit(1)

    name = sys.argv[1]
    debug = '--debug' in sys.argv

    print(f"[1/2] Place ID 검색 중: {name}", file=sys.stderr)
    place_id, search_content, is_plus = get_place_id(name)

    if not place_id:
        if debug:
            print("=== SEARCH PAGE RAW ===\n", search_content[:3000], file=sys.stderr)
        print(json.dumps({'error': 'Place ID를 찾을 수 없습니다', 'name': name}, ensure_ascii=False))
        sys.exit(1)

    print(f"[2/2] 키워드 수집 중: Place ID={place_id}{' (플레이스 플러스→Firecrawl)' if is_plus else ''}", file=sys.stderr)

    if is_plus:
        # 플레이스 플러스: Jina 홈 페이지 스킵, 바로 Firecrawl
        data = {'total_reviews': 0, 'category': '', 'keywords': []}
        try:
            fc_content = get_home_content_firecrawl(place_id)
            data = parse_data(fc_content)
            if data['keywords']:
                print(f"[2/2] Firecrawl 키워드 수집 성공: {len(data['keywords'])}개", file=sys.stderr)
        except Exception as e:
            print(f"[2/2] Firecrawl 실패: {e}", file=sys.stderr)
    else:
        home_content = get_home_content(place_id)
        if debug:
            print("=== HOME PAGE RAW ===\n", home_content[:5000], file=sys.stderr)
        data = parse_data(home_content)
        # Jina 키워드 없으면 Firecrawl 폴백
        if not data['keywords']:
            print(f"[2/2] Jina 키워드 없음 → Firecrawl 재시도...", file=sys.stderr)
            try:
                fc_content = get_home_content_firecrawl(place_id)
                fc_data = parse_data(fc_content)
                if fc_data['keywords']:
                    data = fc_data
                    print(f"[2/2] Firecrawl 키워드 수집 성공: {len(data['keywords'])}개", file=sys.stderr)
                else:
                    print(f"[2/2] Firecrawl도 키워드 없음", file=sys.stderr)
            except Exception as e:
                print(f"[2/2] Firecrawl 실패: {e}", file=sys.stderr)
    ratio = calc_ratio(data['keywords'])
    group = determine_group(ratio)

    output = {
        'name': name,
        'place_id': place_id,
        'category': data['category'],
        'total_reviews': data['total_reviews'],
        'keywords': data['keywords'][:3],
        'ratio': ratio,
        'group': group,
    }

    print(json.dumps(output, ensure_ascii=False, indent=2))

    if data['keywords']:
        print(f"\n[결과] {group}그룹 | 비율 {ratio}배 | 1위: {data['keywords'][0]['text']} ({data['keywords'][0]['count']})", file=sys.stderr)
    else:
        print("\n[경고] 키워드를 파싱하지 못했습니다. --debug 플래그로 원본 확인하세요.", file=sys.stderr)

if __name__ == '__main__':
    main()
