"""Add per-spread position labels to all 4 locales."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

POSITIONS = {
    'en': {
        'single': ['Your Card'],
        'threeCard': ['Past', 'Present', 'Future'],
        'relationship': ['You', 'Them', 'Strengths of the connection', 'Challenges / friction', 'Guidance / next step'],
        'career': ['Where you are now', 'What drives you', 'Obstacle / pressure point', 'What to develop', 'Action you can take', 'Likely outcome'],
        'shadow': ['The mask you wear', 'The shadow aspect', 'Root cause', 'Trigger', 'Hidden gift', 'Integration step', 'Support / next step'],
        'celticCross': ['Present situation', 'Challenge or obstacle', 'Subconscious influences', 'Recent past', 'Best possible outcome', 'Near future', 'Your attitude', 'External influences', 'Hopes and fears', 'Final outcome'],
    },
    'ja': {
        'single': ['あなたのカード'],
        'threeCard': ['過去', '現在', '未来'],
        'relationship': ['あなた', '相手', 'つながりの強み', '課題/摩擦', '導き/次の一歩'],
        'career': ['今あなたがいる場所', 'あなたを動かすもの', '障害/プレッシャー', '育てるべきもの', '取れる行動', '起こりうる結果'],
        'shadow': ['あなたがつけている仮面', '影の側面', '根本原因', '引き金', '隠された贈り物', '統合の一歩', 'サポート/次の一歩'],
        'celticCross': ['現在の状況', '課題または障害', '無意識の影響', '近い過去', '最良の結果', '近い未来', 'あなたの態度', '外的影響', '希望と恐れ', '最終結果'],
    },
    'ko': {
        'single': ['당신의 카드'],
        'threeCard': ['과거', '현재', '미래'],
        'relationship': ['당신', '상대방', '연결의 강점', '도전/마찰', '안내/다음 단계'],
        'career': ['당신이 있는 곳', '당신을 움직이는 것', '장애물/압박점', '개발할 것', '취할 수 있는 행동', '예상되는 결과'],
        'shadow': ['당신이 쓰는 가면', '그림자 측면', '근본 원인', '촉발 요인', '숨겨진 선물', '통합의 단계', '지원/다음 단계'],
        'celticCross': ['현재 상황', '도전 또는 장애', '무의식적 영향', '최근 과거', '최선의 결과', '가까운 미래', '당신의 태도', '외부 영향', '희망과 두려움', '최종 결과'],
    },
    'zh': {
        'single': ['你的牌'],
        'threeCard': ['过去', '现在', '未来'],
        'relationship': ['你', '对方', '连结的优势', '挑战/摩擦', '指引/下一步'],
        'career': ['你现在的位置', '驱动你的事物', '障碍/压力点', '需要发展的', '你可以采取的行动', '可能的结果'],
        'shadow': ['你戴的面具', '阴影面向', '根本原因', '触发', '隐藏的礼物', '整合的步骤', '支持/下一步'],
        'celticCross': ['当前情况', '挑战或障碍', '潜意识影响', '近期过去', '最佳可能结果', '近期未来', '你的态度', '外部影响', '希望与恐惧', '最终结果'],
    },
}

for lang, pos in POSITIONS.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    r = d.setdefault('readings', {})
    r['spreadPositions'] = pos
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: readings.spreadPositions added')
