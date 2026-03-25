#!/bin/bash
# icons 폴더를 스캔하여 캐릭터 이미지 매핑 JS 생성
# 사용법: bash build-icons.sh

echo "// 자동 생성 — build-icons.sh 실행 시 갱신" > src/icon-map.js
echo "const ICON_MAP = {" >> src/icon-map.js

for dir in icons/*/character; do
  char=$(basename "$(dirname "$dir")")
  img=$(find "$dir" -maxdepth 1 -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.gif" -o -iname "*.webp" -o -iname "*.svg" \) ! -iname "readme*" | head -1)
  if [ -n "$img" ]; then
    echo "  '${char}': '${img}'," >> src/icon-map.js
  fi
done

echo "};" >> src/icon-map.js
echo "icon-map.js 생성 완료"
