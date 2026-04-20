"""Add landing.trust.stats translations."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

STATS = {
    'en': [
        {'n': 78, 'l': 'Tarot Cards',         's': 'Full traditional deck'},
        {'n': 6,  'l': 'Spread Types',        's': 'Daily to Celtic Cross'},
        {'n': 5,  'l': 'Personality Tests',   's': 'MBTI, Enneagram & more'},
        {'n': 12, 'l': 'Zodiac Signs',        's': 'Updated daily'},
    ],
    'ja': [
        {'n': 78, 'l': 'タロットカード',      's': '完全な伝統的デッキ'},
        {'n': 6,  'l': 'スプレッド種類',      's': 'デイリーからケルト十字まで'},
        {'n': 5,  'l': '性格診断',            's': 'MBTI・エニアグラムなど'},
        {'n': 12, 'l': '星座',                's': '毎日更新'},
    ],
    'ko': [
        {'n': 78, 'l': '타로 카드',           's': '완전한 전통 덱'},
        {'n': 6,  'l': '스프레드 유형',       's': '데일리부터 켈틱 크로스까지'},
        {'n': 5,  'l': '성격 테스트',         's': 'MBTI, 에니어그램 등'},
        {'n': 12, 'l': '별자리',              's': '매일 업데이트'},
    ],
    'zh': [
        {'n': 78, 'l': '塔罗牌',              's': '完整的传统牌组'},
        {'n': 6,  'l': '牌阵类型',            's': '从日常到凯尔特十字'},
        {'n': 5,  'l': '性格测试',            's': 'MBTI、九型人格等'},
        {'n': 12, 'l': '星座',                's': '每日更新'},
    ],
}

for lang, stats in STATS.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/landing.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    trust = d.setdefault('trust', {})
    trust['stats'] = stats
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: landing.trust.stats added')
