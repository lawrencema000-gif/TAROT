"""Add search.recent.* translations."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA = {
    'en': {'towerMeaning': 'The Tower meaning', 'loveCompatibilityAries': 'Love compatibility Aries', 'threeCardSpread': 'Three card spread'},
    'ja': {'towerMeaning': '塔の意味', 'loveCompatibilityAries': '牡羊座との恋愛相性', 'threeCardSpread': '3枚スプレッド'},
    'ko': {'towerMeaning': '타워 카드 의미', 'loveCompatibilityAries': '양자리 연애 궁합', 'threeCardSpread': '세 장 스프레드'},
    'zh': {'towerMeaning': '塔牌的含义', 'loveCompatibilityAries': '白羊座爱情配对', 'threeCardSpread': '三张牌阵'},
}

for lang, strings in DATA.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    s = d.setdefault('search', {})
    s['recent'] = strings
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: search.recent added')
