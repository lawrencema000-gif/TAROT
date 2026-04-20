"""Add billing.* error translations."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA = {
    'en': {'purchaseCancelled': 'Purchase cancelled', 'purchaseFailed': 'Purchase failed'},
    'ja': {'purchaseCancelled': '購入がキャンセルされました', 'purchaseFailed': '購入に失敗しました'},
    'ko': {'purchaseCancelled': '구매가 취소되었습니다', 'purchaseFailed': '구매에 실패했습니다'},
    'zh': {'purchaseCancelled': '购买已取消', 'purchaseFailed': '购买失败'},
}

for lang, strings in DATA.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    d['billing'] = strings
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: billing added')
