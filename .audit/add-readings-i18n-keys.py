"""Add the missing readings keys surfaced by the audit + screenshot to all
four locale files. Keeps existing key order; only appends new entries."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Translations per locale for the new keys
NEW_KEYS = {
    'positions': {
        'en': {
            'yourCard': 'Your Card',
            'past': 'Past',
            'present': 'Present',
            'future': 'Future',
            'generic': 'Position {{index}}',
        },
        'ja': {
            'yourCard': 'あなたのカード',
            'past': '過去',
            'present': '現在',
            'future': '未来',
            'generic': 'ポジション{{index}}',
        },
        'ko': {
            'yourCard': '당신의 카드',
            'past': '과거',
            'present': '현재',
            'future': '미래',
            'generic': '위치 {{index}}',
        },
        'zh': {
            'yourCard': '你的牌',
            'past': '过去',
            'present': '现在',
            'future': '未来',
            'generic': '位置 {{index}}',
        },
    },
    'focusInterpretation': {
        'en': {
            'loveRelationships': 'Love & Relationships',
            'careerFinance': 'Career & Finance',
        },
        'ja': {
            'loveRelationships': '恋愛と人間関係',
            'careerFinance': 'キャリアとお金',
        },
        'ko': {
            'loveRelationships': '사랑과 관계',
            'careerFinance': '커리어와 재정',
        },
        'zh': {
            'loveRelationships': '爱情与关系',
            'careerFinance': '事业与财运',
        },
    },
    'paywall': {
        'en': {
            'unlimited': 'Unlimited Readings',
            'aiInterpretation': 'AI Interpretation',
        },
        'ja': {
            'unlimited': '無制限リーディング',
            'aiInterpretation': 'AIによる解釈',
        },
        'ko': {
            'unlimited': '무제한 리딩',
            'aiInterpretation': 'AI 해석',
        },
        'zh': {
            'unlimited': '无限次解读',
            'aiInterpretation': 'AI解读',
        },
    },
    # Additional toasts (merged into existing readings.toasts)
    'toasts_extend': {
        'en': {
            'aiReady': 'AI interpretation ready',
            'interpretationReady': 'Interpretation ready',
            'aiFailed': 'Failed to generate interpretation',
        },
        'ja': {
            'aiReady': 'AI解釈の準備ができました',
            'interpretationReady': '解釈の準備ができました',
            'aiFailed': '解釈の生成に失敗しました',
        },
        'ko': {
            'aiReady': 'AI 해석 준비 완료',
            'interpretationReady': '해석 준비 완료',
            'aiFailed': '해석 생성에 실패했습니다',
        },
        'zh': {
            'aiReady': 'AI解读已就绪',
            'interpretationReady': '解读已就绪',
            'aiFailed': '生成解读失败',
        },
    },
}

for lang in ['en', 'ja', 'ko', 'zh']:
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)

    readings = d.setdefault('readings', {})
    readings['positions'] = NEW_KEYS['positions'][lang]
    readings['focusInterpretation'] = NEW_KEYS['focusInterpretation'][lang]
    readings['paywall'] = NEW_KEYS['paywall'][lang]
    toasts = readings.setdefault('toasts', {})
    toasts.update(NEW_KEYS['toasts_extend'][lang])

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: updated — positions, focusInterpretation, paywall, toasts')
