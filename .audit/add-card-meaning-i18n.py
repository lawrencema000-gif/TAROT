"""Add cardMeaning.yesNo.* translations to all 4 locales."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA = {
    'en': {
        'yesNo': {
            'answer': {'yes': 'Yes', 'no': 'No', 'maybe': 'Maybe'},
            'keywordSeparator': ' and ',
            'explanation': {
                'yes': '{{name}} carries positive, affirming energy. This card supports forward movement and favorable outcomes.',
                'no': '{{name}} suggests obstacles, upheaval, or the need to pause. The timing may not be right, or a different approach is needed.',
                'maybe': '{{name}} is context-dependent. The answer depends on surrounding cards and your specific situation.',
            },
            'explanationKeywords': {
                'yes': "This card's energy of {{keywords}} leans toward a positive outcome.",
                'no': "This card's energy of {{keywords}} suggests challenges or delays.",
            },
        },
    },
    'ja': {
        'yesNo': {
            'answer': {'yes': 'はい', 'no': 'いいえ', 'maybe': 'かもしれません'},
            'keywordSeparator': 'と',
            'explanation': {
                'yes': '{{name}}はポジティブで肯定的なエネルギーを持ちます。このカードは前進と好ましい結果を支えます。',
                'no': '{{name}}は障害、動揺、または一時停止の必要性を示します。タイミングが合わないか、別のアプローチが必要かもしれません。',
                'maybe': '{{name}}は状況依存です。答えは周囲のカードと具体的な状況に依存します。',
            },
            'explanationKeywords': {
                'yes': 'このカードの{{keywords}}のエネルギーはポジティブな結果に傾きます。',
                'no': 'このカードの{{keywords}}のエネルギーは課題や遅延を示唆します。',
            },
        },
    },
    'ko': {
        'yesNo': {
            'answer': {'yes': '네', 'no': '아니요', 'maybe': '아마도'},
            'keywordSeparator': '와/과 ',
            'explanation': {
                'yes': '{{name}}은(는) 긍정적이고 확신적인 에너지를 지닙니다. 이 카드는 전진과 긍정적인 결과를 지지합니다.',
                'no': '{{name}}은(는) 장애, 격변, 혹은 잠시 멈춤이 필요함을 시사합니다. 타이밍이 맞지 않거나 다른 접근이 필요합니다.',
                'maybe': '{{name}}은(는) 맥락 의존적입니다. 답은 주변 카드와 구체적 상황에 달려 있습니다.',
            },
            'explanationKeywords': {
                'yes': '이 카드의 {{keywords}} 에너지는 긍정적인 결과로 기울어집니다.',
                'no': '이 카드의 {{keywords}} 에너지는 도전이나 지연을 시사합니다.',
            },
        },
    },
    'zh': {
        'yesNo': {
            'answer': {'yes': '是', 'no': '否', 'maybe': '也许'},
            'keywordSeparator': '与',
            'explanation': {
                'yes': '{{name}}承载着正向与肯定的能量。这张牌支持前进与有利的结果。',
                'no': '{{name}}暗示障碍、动荡或需要暂停。时机可能不对，或需要不同的方式。',
                'maybe': '{{name}}依情境而定。答案取决于周围的牌与你的具体情况。',
            },
            'explanationKeywords': {
                'yes': '这张牌{{keywords}}的能量偏向正面的结果。',
                'no': '这张牌{{keywords}}的能量暗示挑战或延迟。',
            },
        },
    },
}

for lang, groups in DATA.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    cm = d.setdefault('cardMeaning', {})
    for k, v in groups.items():
        cm[k] = v
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: cardMeaning.yesNo added')
