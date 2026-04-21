"""Native-polish pass 5 — onboarding polish.

Mostly targeted: the 'cosmic ___' headings read as literal translations
in all three languages (コスミック・우주・宇宙 as a modifier prefix). Also
small register + spacing fixes.
"""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PATCHES = {
    'ja': {
        'welcome.heading': '毎日のリチュアル、はじまる。',
        'welcome.subheading': 'タロット、占星術、性格診断——ぜんぶを、ひとつの美しい場所に。',
        'oauth.welcomeSub': 'いくつかのステップで、あなただけの体験をつくっていきます',
        'oauth.basics.heading': '基本のプロフィール',
        'oauth.basics.hint': '星座を決めるのに使います',
        'oauth.basics.birthPlaceHint': 'のちほど出生図の計算に使います',
        'oauth.basics.invalidBirthDate': '生年月日が正しくありません',
        'oauth.tone.heading': '言葉のトーン',
        'oauth.tone.hint': 'どんな語り口がお好みですか?',
        'oauth.tone.gentle.label': 'やさしく・寄り添って',
        'oauth.tone.gentle.desc': '温かく、そっと支えるようなガイダンス',
        'oauth.tone.direct.label': '率直に・まっすぐ',
        'oauth.tone.direct.desc': '明快で、迷いのない洞察',
        'oauth.tone.playful.label': '遊び心をもって・神秘的に',
        'oauth.tone.playful.desc': 'ふしぎで、心を惹きつける知恵',
    },
    'ko': {
        'welcome.heading': '매일의 의식이 시작됩니다.',
        'welcome.subheading': '타로, 점성술, 성격 통찰이 하나로 아름답게 어우러집니다.',
        'oauth.welcomeSub': '몇 단계만 거치면, 당신만을 위한 경험이 준비돼요',
        'oauth.basics.heading': '기본 프로필',
        'oauth.basics.hint': '별자리를 정하는 데 사용돼요',
        'oauth.basics.birthPlaceHint': '나중에 네이탈 차트를 계산할 때 써요',
        'oauth.basics.invalidBirthDate': '생년월일이 올바르지 않아요',
        'oauth.tone.heading': '어울리는 말투',
        'oauth.tone.hint': '어떤 어조가 좋을까요?',
        'oauth.tone.gentle.label': '부드럽게 · 다정하게',
        'oauth.tone.gentle.desc': '포근하고, 곁에서 받쳐주는 안내',
        'oauth.tone.direct.label': '솔직하게 · 또렷하게',
        'oauth.tone.direct.desc': '군더더기 없는 선명한 통찰',
        'oauth.tone.playful.label': '장난기 있게 · 신비롭게',
        'oauth.tone.playful.desc': '환상적이고 매혹적인 지혜',
        'toast.userExists': '이미 가입된 이메일이에요. 로그인해 보세요.',
        'toast.accountCreated': '계정이 만들어졌어요! 이제 나만의 설정으로 꾸며볼까요.',
    },
    'zh': {
        'welcome.heading': '你的每日仪式,从这里开始。',
        'welcome.subheading': '塔罗、占星、性格洞察——合成一个温柔的空间。',
        'oauth.welcomeSub': '只要几个步骤,就能做出专属你的体验',
        'oauth.basics.heading': '基本资料',
        'oauth.basics.hint': '用来定下你的星座',
        'oauth.basics.birthPlaceHint': '之后会用来计算你的本命星盘',
        'oauth.basics.invalidBirthDate': '出生日期不正确',
        'oauth.tone.heading': '你喜欢的语气',
        'oauth.tone.hint': '我们该用怎样的口吻跟你说话?',
        'oauth.tone.gentle.label': '温柔、陪伴',
        'oauth.tone.gentle.desc': '温暖、轻轻撑着你的指引',
        'oauth.tone.direct.label': '直接、坦白',
        'oauth.tone.direct.desc': '清晰、不拐弯的洞察',
        'oauth.tone.playful.label': '俏皮、神秘',
        'oauth.tone.playful.desc': '带点奇幻,又让人想再看一眼的智慧',
        'toast.userExists': '这个邮箱已经注册过了,直接登录就好。',
        'toast.accountCreated': '账号建好了!来把这里打造成你的专属空间吧。',
    },
}

def set_nested(d, path, value):
    parts = path.split('.')
    for p in parts[:-1]:
        if p not in d: d[p] = {}
        d = d[p]
    d[parts[-1]] = value
    return True

total = 0
for lang, updates in PATCHES.items():
    p = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/onboarding.json'
    with open(p,'r',encoding='utf-8') as f: doc = json.load(f)
    for k, v in updates.items():
        set_nested(doc, k, v)
        total += 1
    with open(p,'w',encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=2); f.write('\n')
    print(f'{lang}: {len(updates)} onboarding keys polished')
print(f'\nTotal: {total}')
