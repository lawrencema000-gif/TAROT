"""Add library section headers + period Daily translations."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA = {
    'en': {'savedSpreads': 'Saved Spreads', 'savedCards': 'Saved Cards', 'savedHoroscopes': 'Saved Horoscopes', 'periodDaily': 'Daily'},
    'ja': {'savedSpreads': '保存したスプレッド', 'savedCards': '保存したカード', 'savedHoroscopes': '保存した占い', 'periodDaily': 'デイリー'},
    'ko': {'savedSpreads': '저장된 스프레드', 'savedCards': '저장된 카드', 'savedHoroscopes': '저장된 운세', 'periodDaily': '데일리'},
    'zh': {'savedSpreads': '已保存的牌阵', 'savedCards': '已保存的牌', 'savedHoroscopes': '已保存的运势', 'periodDaily': '每日'},
}

for lang, strings in DATA.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    lib = d.setdefault('library', {})
    for k, v in strings.items():
        lib[k] = v
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: library section headers added')
