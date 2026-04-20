"""Extend billing.* with web-checkout error translations."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA = {
    'en': {
        'webNotAvailableOnMobile': 'Web billing is not available on mobile. Please use the app store.',
        'userNotAuthenticated': 'User not authenticated',
        'alreadyPremium': 'Already have premium',
        'stripeNotConfigured': 'Stripe is not configured. Please contact support.',
        'notAuthenticated': 'Not authenticated',
        'checkoutSessionFailed': 'Failed to create checkout session',
        'noCheckoutUrl': 'No checkout URL returned',
    },
    'ja': {
        'webNotAvailableOnMobile': 'ウェブ決済はモバイルでは利用できません。アプリストアをご利用ください。',
        'userNotAuthenticated': 'ユーザーが認証されていません',
        'alreadyPremium': 'すでにプレミアムをお持ちです',
        'stripeNotConfigured': 'Stripeが構成されていません。サポートにお問い合わせください。',
        'notAuthenticated': '認証されていません',
        'checkoutSessionFailed': 'チェックアウトセッションの作成に失敗しました',
        'noCheckoutUrl': 'チェックアウトURLが返されませんでした',
    },
    'ko': {
        'webNotAvailableOnMobile': '웹 결제는 모바일에서 이용할 수 없습니다. 앱 스토어를 이용해 주세요.',
        'userNotAuthenticated': '사용자가 인증되지 않았습니다',
        'alreadyPremium': '이미 프리미엄을 사용 중입니다',
        'stripeNotConfigured': 'Stripe가 구성되지 않았습니다. 지원팀에 문의하세요.',
        'notAuthenticated': '인증되지 않았습니다',
        'checkoutSessionFailed': '체크아웃 세션 생성에 실패했습니다',
        'noCheckoutUrl': '체크아웃 URL이 반환되지 않았습니다',
    },
    'zh': {
        'webNotAvailableOnMobile': '网页结算在移动设备上不可用。请使用应用商店。',
        'userNotAuthenticated': '用户未认证',
        'alreadyPremium': '已经拥有高级会员',
        'stripeNotConfigured': 'Stripe未配置。请联系支持。',
        'notAuthenticated': '未认证',
        'checkoutSessionFailed': '创建结账会话失败',
        'noCheckoutUrl': '未返回结账URL',
    },
}

for lang, strings in DATA.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    billing = d.setdefault('billing', {})
    for k, v in strings.items():
        billing[k] = v
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: billing web-checkout keys added')
