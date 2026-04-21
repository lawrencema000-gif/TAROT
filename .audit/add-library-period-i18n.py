import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA = {
    'en': {'periodWeekly': 'Weekly', 'periodMonthly': 'Monthly'},
    'ja': {'periodWeekly': '週間', 'periodMonthly': '月間'},
    'ko': {'periodWeekly': '주간', 'periodMonthly': '월간'},
    'zh': {'periodWeekly': '每周', 'periodMonthly': '每月'},
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
    print(f'{lang}: library period keys added')
