"""Add premium.features.<id>.{name,description} to all 4 locales."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

FEATURES = {
    'en': {
        'unlimited_saves': {
            'name': 'Unlimited Saves',
            'description': 'Save as many readings and insights as you want',
        },
        'celtic_cross': {
            'name': 'Celtic Cross Spread',
            'description': 'The ultimate 10-card spread for deep insight',
        },
        'three_card': {
            'name': 'Three Card Spread',
            'description': 'Past, present, future readings',
        },
        'compatibility_full': {
            'name': 'Full Compatibility',
            'description': 'Complete partner compatibility analysis',
        },
        'deep_interpretations': {
            'name': 'Deep Interpretations',
            'description': 'Extended meanings and personalized guidance',
        },
        'guided_prompts': {
            'name': 'Guided Prompts',
            'description': 'AI-crafted reflection prompts based on your readings',
        },
        'journal_insights': {
            'name': 'Journal Insights',
            'description': 'Advanced mood tracking and pattern analysis',
        },
        'personalization': {
            'name': 'Personalization Engine',
            'description': 'Content tailored to your tone and goals',
        },
        'birth_chart': {
            'name': 'Birth Chart Analysis',
            'description': 'Complete astrological birth chart breakdown',
        },
        'extra_reading': {
            'name': 'Extra Reading',
            'description': 'One additional tarot reading beyond your daily limit',
        },
    },
    'ja': {
        'unlimited_saves': {
            'name': '無制限保存',
            'description': 'リーディングや洞察を何件でも保存できます',
        },
        'celtic_cross': {
            'name': 'ケルト十字スプレッド',
            'description': '深い洞察のための究極の10枚カードスプレッド',
        },
        'three_card': {
            'name': 'スリーカードスプレッド',
            'description': '過去・現在・未来のリーディング',
        },
        'compatibility_full': {
            'name': 'フル相性診断',
            'description': '完全なパートナー相性分析',
        },
        'deep_interpretations': {
            'name': '深層解釈',
            'description': '拡張された意味とパーソナライズされたガイダンス',
        },
        'guided_prompts': {
            'name': 'ガイド付きプロンプト',
            'description': 'あなたのリーディングに基づくAI生成リフレクションプロンプト',
        },
        'journal_insights': {
            'name': 'ジャーナル分析',
            'description': '高度な気分トラッキングとパターン分析',
        },
        'personalization': {
            'name': 'パーソナライゼーション',
            'description': 'あなたの個性と目標に合わせたコンテンツ',
        },
        'birth_chart': {
            'name': '出生チャート分析',
            'description': '占星術的な出生チャートの完全な解析',
        },
        'extra_reading': {
            'name': '追加リーディング',
            'description': 'デイリー上限を超えてタロットリーディングを1回追加',
        },
    },
    'ko': {
        'unlimited_saves': {
            'name': '무제한 저장',
            'description': '원하는 만큼의 리딩과 통찰을 저장하세요',
        },
        'celtic_cross': {
            'name': '켈틱 크로스 스프레드',
            'description': '깊은 통찰을 위한 궁극의 10장 카드 스프레드',
        },
        'three_card': {
            'name': '세 장 카드 스프레드',
            'description': '과거, 현재, 미래 리딩',
        },
        'compatibility_full': {
            'name': '완전 궁합 분석',
            'description': '파트너와의 완전한 궁합 분석',
        },
        'deep_interpretations': {
            'name': '심층 해석',
            'description': '확장된 의미와 개인화된 가이드',
        },
        'guided_prompts': {
            'name': '가이드 프롬프트',
            'description': '당신의 리딩을 바탕으로 AI가 만든 성찰 프롬프트',
        },
        'journal_insights': {
            'name': '저널 인사이트',
            'description': '고급 감정 추적과 패턴 분석',
        },
        'personalization': {
            'name': '개인화 엔진',
            'description': '당신의 톤과 목표에 맞춘 콘텐츠',
        },
        'birth_chart': {
            'name': '출생 차트 분석',
            'description': '완전한 점성술 출생 차트 분석',
        },
        'extra_reading': {
            'name': '추가 리딩',
            'description': '일일 한도를 넘는 타로 리딩 한 번 추가',
        },
    },
    'zh': {
        'unlimited_saves': {
            'name': '无限保存',
            'description': '想保存多少解读和洞察就保存多少',
        },
        'celtic_cross': {
            'name': '凯尔特十字牌阵',
            'description': '深度洞察的终极十张牌阵',
        },
        'three_card': {
            'name': '三张牌阵',
            'description': '过去、现在、未来解读',
        },
        'compatibility_full': {
            'name': '完整配对分析',
            'description': '完整的伴侣配对分析',
        },
        'deep_interpretations': {
            'name': '深度解读',
            'description': '扩展的含义和个性化指导',
        },
        'guided_prompts': {
            'name': '引导性提示',
            'description': '基于你的解读由AI生成的反思提示',
        },
        'journal_insights': {
            'name': '日记洞察',
            'description': '高级情绪追踪与模式分析',
        },
        'personalization': {
            'name': '个性化引擎',
            'description': '根据你的风格和目标量身定制的内容',
        },
        'birth_chart': {
            'name': '出生星盘分析',
            'description': '完整的占星出生星盘解析',
        },
        'extra_reading': {
            'name': '额外解读',
            'description': '超出每日限制的一次额外塔罗解读',
        },
    },
}

for lang, features in FEATURES.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    prem = d.setdefault('premium', {})
    prem['features'] = features
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: premium.features added')
