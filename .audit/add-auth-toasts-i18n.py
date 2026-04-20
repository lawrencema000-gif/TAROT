"""Add auth toast translations to common.json in all locales."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

NEW = {
    'en': {
        'signInCancelled': 'Sign in was cancelled',
        'signInSessionExpired': 'Sign in session expired. Please try again.',
        'googleNotConfigured': 'Google sign-in is not configured. Please use email/password.',
    },
    'ja': {
        'signInCancelled': 'サインインがキャンセルされました',
        'signInSessionExpired': 'サインインセッションの有効期限が切れました。もう一度お試しください。',
        'googleNotConfigured': 'Googleサインインが構成されていません。メール/パスワードをご使用ください。',
    },
    'ko': {
        'signInCancelled': '로그인이 취소되었습니다',
        'signInSessionExpired': '로그인 세션이 만료되었습니다. 다시 시도해 주세요.',
        'googleNotConfigured': 'Google 로그인이 구성되지 않았습니다. 이메일/비밀번호를 사용하세요.',
    },
    'zh': {
        'signInCancelled': '登录已取消',
        'signInSessionExpired': '登录会话已过期。请重试。',
        'googleNotConfigured': '未配置 Google 登录。请使用邮箱/密码。',
    },
}

for lang, strings in NEW.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/common.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    auth = d.setdefault('auth', {})
    for k, v in strings.items():
        auth[k] = v
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: auth toast keys added')
