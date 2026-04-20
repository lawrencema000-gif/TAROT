"""Add library.tabs.* + library.filters.* translations."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TABS = {
    'en': {'tabs': {'saved': 'Saved', 'aiReadings': 'AI Readings', 'guides': 'Guides'},
           'filters': {'all': 'All', 'tarot': 'Tarot', 'horoscope': 'Horoscope', 'spreads': 'Spreads'}},
    'ja': {'tabs': {'saved': '保存済み', 'aiReadings': 'AIリーディング', 'guides': 'ガイド'},
           'filters': {'all': 'すべて', 'tarot': 'タロット', 'horoscope': '占星術', 'spreads': 'スプレッド'}},
    'ko': {'tabs': {'saved': '저장됨', 'aiReadings': 'AI 리딩', 'guides': '가이드'},
           'filters': {'all': '전체', 'tarot': '타로', 'horoscope': '운세', 'spreads': '스프레드'}},
    'zh': {'tabs': {'saved': '已保存', 'aiReadings': 'AI解读', 'guides': '指南'},
           'filters': {'all': '全部', 'tarot': '塔罗', 'horoscope': '运势', 'spreads': '牌阵'}},
}

for lang, data in TABS.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    lib = d.setdefault('library', {})
    lib['tabs'] = data['tabs']
    lib['filters'] = data['filters']
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: library.tabs + filters added')
