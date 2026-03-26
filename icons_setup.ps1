$chars = 'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ', 'ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'
$base = "d:\바탕화면\진아글자공부\icons"
if (-not (Test-Path $base)) { New-Item -ItemType Directory -Path $base -Force }
foreach ($c in $chars) {
    New-Item -ItemType Directory -Path "$base\$c\character" -Force
    New-Item -ItemType Directory -Path "$base\$c\target" -Force
}
