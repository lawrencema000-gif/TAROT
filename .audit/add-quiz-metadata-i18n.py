"""Extend quizzes.definitions.<id> with whatYouGet + timeEstimate in 4 locales."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ids match src/i18n/locales/*/app.json quizzes.definitions.* keys
META = {
    'en': {
        'mbti': {
            'timeEstimate': '10-15 min',
            'whatYouGet': [
                'Your type profile with strengths + blind spots',
                'Stress mode patterns + recovery strategies',
                'Relationship style notes + communication tips',
                'Tarot archetype alignment',
            ],
        },
        'loveLanguage': {
            'timeEstimate': '5-7 min',
            'whatYouGet': [
                'Primary + secondary love language',
                '"When healthy" vs "when deprived" insight',
                'Clear ways to ask for love in your language',
                'Partner tips for supporting you',
            ],
        },
        'mood': {
            'timeEstimate': '30 sec',
            'whatYouGet': [
                'A mood profile (calm/charged/drained/steady)',
                'A "best next step" recommendation',
                'A journal prompt for your current state',
                'Optional tarot archetype suggestion',
            ],
        },
        'bigfive': {
            'timeEstimate': '8-10 min',
            'whatYouGet': [
                'Five trait scores with real-life interpretation',
                'Strengths + potential pitfalls for each trait',
                'Lifestyle and relationship suggestions',
                'A "growth lever" for meaningful change',
            ],
        },
        'enneagram': {
            'timeEstimate': '10-12 min',
            'whatYouGet': [
                'Your Enneagram type + wing',
                'Growth and stress direction paths',
                'Core motivation, fear, and desire',
                'Tarot archetype alignment',
            ],
        },
        'attachment': {
            'timeEstimate': '5-7 min',
            'whatYouGet': [
                'Your primary attachment pattern',
                'Triggers + deactivation/activation behaviors',
                'What you need from a partner to feel safe',
                'A path toward secure attachment',
            ],
        },
    },
    'ja': {
        'mbti': {
            'timeEstimate': '10〜15分',
            'whatYouGet': [
                'あなたのタイプ別プロフィール（長所と盲点）',
                'ストレス時のパターンと回復戦略',
                '人間関係のスタイルとコミュニケーション術',
                'タロットアーキタイプとの対応',
            ],
        },
        'loveLanguage': {
            'timeEstimate': '5〜7分',
            'whatYouGet': [
                '主要な愛の言語と二次的な愛の言語',
                '「健全なとき」と「枯渇したとき」の違い',
                'あなたの言語で愛を求める具体的な方法',
                'パートナーへのサポートのヒント',
            ],
        },
        'mood': {
            'timeEstimate': '30秒',
            'whatYouGet': [
                '気分プロファイル（穏やか／高揚／消耗／安定）',
                '「次の最善の一歩」のおすすめ',
                '今の状態に合わせた日記プロンプト',
                'タロットアーキタイプの提案（任意）',
            ],
        },
        'bigfive': {
            'timeEstimate': '8〜10分',
            'whatYouGet': [
                '5因子スコアと実生活での解釈',
                '各特性の強みと潜在的な落とし穴',
                'ライフスタイルと人間関係の提案',
                '意味のある変化のための「成長のレバー」',
            ],
        },
        'enneagram': {
            'timeEstimate': '10〜12分',
            'whatYouGet': [
                'エニアグラムのタイプとウィング',
                '成長とストレス方向のパス',
                '中核的な動機・恐れ・欲望',
                'タロットアーキタイプとの対応',
            ],
        },
        'attachment': {
            'timeEstimate': '5〜7分',
            'whatYouGet': [
                'あなたの主要な愛着パターン',
                'トリガーと非活性化／活性化行動',
                '安心できるためにパートナーに必要なもの',
                '安定型愛着への道筋',
            ],
        },
    },
    'ko': {
        'mbti': {
            'timeEstimate': '10-15분',
            'whatYouGet': [
                '유형별 프로필 — 강점과 사각지대',
                '스트레스 시의 패턴과 회복 전략',
                '관계 스타일과 소통 팁',
                '타로 아키타입 매칭',
            ],
        },
        'loveLanguage': {
            'timeEstimate': '5-7분',
            'whatYouGet': [
                '주요 + 보조 사랑의 언어',
                '"건강할 때" vs "결핍될 때" 통찰',
                '당신의 언어로 사랑을 요청하는 방법',
                '파트너 지원 팁',
            ],
        },
        'mood': {
            'timeEstimate': '30초',
            'whatYouGet': [
                '기분 프로필 (평온/고조/지침/안정)',
                '"다음 최선의 한 걸음" 추천',
                '현재 상태에 맞는 저널 프롬프트',
                '타로 아키타입 제안 (선택 사항)',
            ],
        },
        'bigfive': {
            'timeEstimate': '8-10분',
            'whatYouGet': [
                '5가지 특성 점수와 실생활 해석',
                '각 특성별 강점과 함정',
                '라이프스타일과 관계 제안',
                '의미 있는 변화를 위한 "성장 레버"',
            ],
        },
        'enneagram': {
            'timeEstimate': '10-12분',
            'whatYouGet': [
                '에니어그램 유형 + 날개',
                '성장과 스트레스 방향 경로',
                '핵심 동기, 두려움, 욕구',
                '타로 아키타입 매칭',
            ],
        },
        'attachment': {
            'timeEstimate': '5-7분',
            'whatYouGet': [
                '주요 애착 유형',
                '트리거 + 비활성화/활성화 행동',
                '안전하다 느끼기 위해 파트너에게 필요한 것',
                '안정형 애착을 향한 길',
            ],
        },
    },
    'zh': {
        'mbti': {
            'timeEstimate': '10-15分钟',
            'whatYouGet': [
                '你的类型档案（优势与盲点）',
                '压力模式与恢复策略',
                '关系风格与沟通技巧',
                '塔罗原型对应',
            ],
        },
        'loveLanguage': {
            'timeEstimate': '5-7分钟',
            'whatYouGet': [
                '主要 + 次要爱之语',
                '"健康时" 与 "匮乏时" 的洞察',
                '用你的语言表达爱的方式',
                '伴侣支持小贴士',
            ],
        },
        'mood': {
            'timeEstimate': '30秒',
            'whatYouGet': [
                '情绪档案（平静/激动/疲惫/稳定）',
                '"下一步最佳行动" 建议',
                '适合当前状态的日记提示',
                '塔罗原型建议（可选）',
            ],
        },
        'bigfive': {
            'timeEstimate': '8-10分钟',
            'whatYouGet': [
                '五大特质评分与实际解读',
                '每项特质的优势与潜在陷阱',
                '生活方式与关系建议',
                '促进有意义改变的"成长杠杆"',
            ],
        },
        'enneagram': {
            'timeEstimate': '10-12分钟',
            'whatYouGet': [
                '九型人格类型 + 侧翼',
                '成长与压力方向路径',
                '核心动机、恐惧与渴望',
                '塔罗原型对应',
            ],
        },
        'attachment': {
            'timeEstimate': '5-7分钟',
            'whatYouGet': [
                '你的主要依恋模式',
                '触发点 + 去激活/激活行为',
                '在关系中获得安全感的需求',
                '通往安全型依恋的路径',
            ],
        },
    },
}

for lang, qmap in META.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    defs = d.setdefault('quizzes', {}).setdefault('definitions', {})
    for qid, meta in qmap.items():
        entry = defs.setdefault(qid, {})
        entry['timeEstimate'] = meta['timeEstimate']
        entry['whatYouGet'] = meta['whatYouGet']
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: quizzes.definitions extended')
