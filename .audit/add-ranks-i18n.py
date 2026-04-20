"""Add achievement rank translations to all 4 locales."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

RANKS = {
    'en': {
        'novice': 'Novice Seeker',
        'apprentice': 'Apprentice Seeker',
        'adept': 'Adept Seeker',
        'master': 'Master Seeker',
        'oracle': 'Oracle Seeker',
        'xpToNext': '{{xp}} XP to {{name}}',
    },
    'ja': {
        'novice': '初心者の探求者',
        'apprentice': '見習いの探求者',
        'adept': '熟練の探求者',
        'master': '達人の探求者',
        'oracle': '神秘の探求者',
        'xpToNext': '{{name}}まで {{xp}} XP',
    },
    'ko': {
        'novice': '초보 탐구자',
        'apprentice': '수습 탐구자',
        'adept': '숙련 탐구자',
        'master': '고수 탐구자',
        'oracle': '오라클 탐구자',
        'xpToNext': '{{name}}까지 {{xp}} XP',
    },
    'zh': {
        'novice': '初学探索者',
        'apprentice': '学徒探索者',
        'adept': '熟练探索者',
        'master': '大师探索者',
        'oracle': '神谕探索者',
        'xpToNext': '距离{{name}}还差 {{xp}} XP',
    },
}

for lang, strings in RANKS.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    ach = d.setdefault('achievements', {})
    ranks = ach.setdefault('ranks', {})
    for k, v in strings.items():
        ranks[k] = v
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: achievements.ranks updated')
