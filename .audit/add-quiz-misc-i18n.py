"""Extend quizzes with compatibleTypes + takeAnother."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

EXTRA = {
    'en': {'compatibleTypes': 'Compatible Types', 'takeAnother': 'Take Another Quiz'},
    'ja': {'compatibleTypes': '相性の良いタイプ', 'takeAnother': '別の診断を受ける'},
    'ko': {'compatibleTypes': '궁합이 좋은 유형', 'takeAnother': '다른 퀴즈 풀기'},
    'zh': {'compatibleTypes': '相容的类型', 'takeAnother': '进行另一个测试'},
}

for lang, strings in EXTRA.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    q = d.setdefault('quizzes', {})
    rs = q.setdefault('resultSections', {})
    rs['compatibleTypes'] = strings['compatibleTypes']
    q['takeAnother'] = strings['takeAnother']
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: quiz misc added')
