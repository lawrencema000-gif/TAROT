"""Add achievements.stats.* translations."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA = {
    'en': {'totalXP': 'Total XP', 'streak': 'Streak', 'streakDays_one': '{{count}} day', 'streakDays_other': '{{count}} days', 'readings': 'Readings', 'journal': 'Journal', 'quizzes': 'Quizzes'},
    'ja': {'totalXP': '合計XP', 'streak': 'ストリーク', 'streakDays_one': '{{count}}日', 'streakDays_other': '{{count}}日', 'readings': 'リーディング', 'journal': 'ジャーナル', 'quizzes': '診断'},
    'ko': {'totalXP': '총 XP', 'streak': '연속', 'streakDays_one': '{{count}}일', 'streakDays_other': '{{count}}일', 'readings': '리딩', 'journal': '저널', 'quizzes': '퀴즈'},
    'zh': {'totalXP': '总XP', 'streak': '连续', 'streakDays_one': '{{count}}天', 'streakDays_other': '{{count}}天', 'readings': '解读', 'journal': '日记', 'quizzes': '测试'},
}

for lang, strings in DATA.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    ach = d.setdefault('achievements', {})
    ach['stats'] = strings
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: achievements.stats added')
