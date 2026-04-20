import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA = {'en': 'Type {{n}}', 'ja': 'タイプ{{n}}', 'ko': '유형 {{n}}', 'zh': '类型{{n}}'}

for lang, v in DATA.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    rs = d.setdefault('quizzes', {}).setdefault('resultSections', {})
    rs['enneagramType'] = v
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: enneagramType added')
