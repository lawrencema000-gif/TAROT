"""Add context dictionaries from zodiacContent.ts to i18n so
dailyContent.generateDailyReading produces fully-localized output."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PLANETS = {
    'en': {
        'sun':     {'theme': 'vitality and self-expression',   'positive': 'Your authentic self shines brightly today',    'focus': 'identity, creativity, and leadership'},
        'moon':    {'theme': 'emotions and intuition',          'positive': 'Your emotional wisdom guides you well',         'focus': 'feelings, home, and nurturing'},
        'mercury': {'theme': 'communication and thinking',      'positive': 'Clear communication opens doors',               'focus': 'ideas, learning, and connections'},
        'venus':   {'theme': 'love and beauty',                 'positive': 'Harmony and beauty surround you',               'focus': 'relationships, aesthetics, and values'},
        'mars':    {'theme': 'action and energy',               'positive': 'Your drive and determination are strong',       'focus': 'initiative, courage, and ambition'},
        'jupiter': {'theme': 'expansion and luck',              'positive': 'Abundance and opportunity flow toward you',     'focus': 'growth, optimism, and wisdom'},
        'saturn':  {'theme': 'structure and discipline',        'positive': 'Your efforts build lasting foundations',        'focus': 'responsibility, achievement, and mastery'},
        'uranus':  {'theme': 'innovation and change',           'positive': 'Unexpected breakthroughs are possible',         'focus': 'originality, freedom, and revolution'},
        'neptune': {'theme': 'dreams and spirituality',         'positive': 'Your imagination and intuition are heightened', 'focus': 'creativity, compassion, and transcendence'},
        'pluto':   {'theme': 'transformation and power',        'positive': 'Deep transformation brings renewal',            'focus': 'rebirth, intensity, and hidden truths'},
    },
    'ja': {
        'sun':     {'theme': '生命力と自己表現',           'positive': '今日、本来のあなたが輝きます',            'focus': 'アイデンティティ、創造性、リーダーシップ'},
        'moon':    {'theme': '感情と直感',                 'positive': '感情の知恵があなたをよく導きます',        'focus': '感情、家庭、育むこと'},
        'mercury': {'theme': 'コミュニケーションと思考',   'positive': '明晰な対話が扉を開きます',                'focus': '発想、学び、つながり'},
        'venus':   {'theme': '愛と美',                     'positive': '調和と美があなたを包みます',              'focus': '関係性、美意識、価値観'},
        'mars':    {'theme': '行動とエネルギー',           'positive': 'あなたの推進力と決意は強い',              'focus': 'イニシアティブ、勇気、野心'},
        'jupiter': {'theme': '拡大と幸運',                 'positive': '豊かさと機会があなたに流れ込みます',      'focus': '成長、楽観、叡智'},
        'saturn':  {'theme': '構造と規律',                 'positive': 'あなたの努力は永続的な基盤を築きます',    'focus': '責任、達成、熟達'},
        'uranus':  {'theme': '革新と変化',                 'positive': '予期せぬ突破口が可能です',                'focus': '独創性、自由、革命'},
        'neptune': {'theme': '夢と霊性',                   'positive': '想像力と直感が高まっています',            'focus': '創造性、慈悲、超越'},
        'pluto':   {'theme': '変容と力',                   'positive': '深い変容が再生をもたらします',            'focus': '再生、強度、隠された真実'},
    },
    'ko': {
        'sun':     {'theme': '활력과 자기 표현',         'positive': '오늘 진정한 당신이 빛납니다',             'focus': '정체성, 창의성, 리더십'},
        'moon':    {'theme': '감정과 직관',              'positive': '감정의 지혜가 당신을 잘 이끕니다',        'focus': '감정, 가정, 양육'},
        'mercury': {'theme': '소통과 사고',              'positive': '명료한 소통이 문을 엽니다',               'focus': '아이디어, 배움, 연결'},
        'venus':   {'theme': '사랑과 아름다움',          'positive': '조화와 아름다움이 당신을 둘러쌉니다',     'focus': '관계, 미학, 가치'},
        'mars':    {'theme': '행동과 에너지',            'positive': '당신의 추진력과 결단이 강합니다',         'focus': '주도성, 용기, 야망'},
        'jupiter': {'theme': '확장과 행운',              'positive': '풍요와 기회가 당신에게 흘러옵니다',       'focus': '성장, 낙관, 지혜'},
        'saturn':  {'theme': '구조와 규율',              'positive': '당신의 노력이 오래가는 기초를 쌓습니다',  'focus': '책임, 성취, 숙련'},
        'uranus':  {'theme': '혁신과 변화',              'positive': '예상 밖의 돌파가 가능합니다',             'focus': '독창성, 자유, 혁명'},
        'neptune': {'theme': '꿈과 영성',                'positive': '당신의 상상력과 직관이 고조됩니다',       'focus': '창의성, 자비, 초월'},
        'pluto':   {'theme': '변용과 힘',                'positive': '깊은 변용이 쇄신을 가져옵니다',           'focus': '재탄생, 강렬함, 숨겨진 진실'},
    },
    'zh': {
        'sun':     {'theme': '活力与自我表达', 'positive': '今天真实的你闪耀光芒',         'focus': '身份、创造力与领导力'},
        'moon':    {'theme': '情感与直觉',     'positive': '你的情感智慧很好地引导你',     'focus': '情感、家庭与滋养'},
        'mercury': {'theme': '沟通与思考',     'positive': '清晰的沟通打开大门',           'focus': '想法、学习与联系'},
        'venus':   {'theme': '爱与美',         'positive': '和谐与美包围着你',             'focus': '关系、美学与价值'},
        'mars':    {'theme': '行动与能量',     'positive': '你的驱动力与决心很强',         'focus': '主动、勇气与抱负'},
        'jupiter': {'theme': '扩张与幸运',     'positive': '丰盛与机会向你涌来',           'focus': '成长、乐观与智慧'},
        'saturn':  {'theme': '结构与纪律',     'positive': '你的努力建立持久的根基',       'focus': '责任、成就与精通'},
        'uranus':  {'theme': '创新与变革',     'positive': '出乎意料的突破是可能的',       'focus': '独创、自由与革命'},
        'neptune': {'theme': '梦想与灵性',     'positive': '你的想象力与直觉被增强',       'focus': '创造力、慈悲与超越'},
        'pluto':   {'theme': '转化与力量',     'positive': '深层转化带来更新',             'focus': '重生、强度与隐藏真相'},
    },
}

DAY_THEMES = {
    'en': [
        {'theme': 'reflection',       'focus': 'rest and spiritual renewal',         'energy': 'contemplative'},
        {'theme': 'new beginnings',   'focus': 'setting intentions and fresh starts','energy': 'initiating'},
        {'theme': 'action',           'focus': 'courage and determination',          'energy': 'dynamic'},
        {'theme': 'communication',    'focus': 'ideas and connections',              'energy': 'expressive'},
        {'theme': 'expansion',        'focus': 'growth and abundance',               'energy': 'optimistic'},
        {'theme': 'love',             'focus': 'relationships and pleasure',         'energy': 'harmonious'},
        {'theme': 'discipline',       'focus': 'structure and achievement',          'energy': 'grounded'},
    ],
    'ja': [
        {'theme': '内省',       'focus': '休息と精神的な更新',       'energy': '瞑想的な'},
        {'theme': '新しい始まり','focus': '意図を定め新たに始める',   'energy': '始動的な'},
        {'theme': '行動',       'focus': '勇気と決意',               'energy': '躍動的な'},
        {'theme': '対話',       'focus': 'アイデアとつながり',       'energy': '表現的な'},
        {'theme': '拡大',       'focus': '成長と豊かさ',             'energy': '楽観的な'},
        {'theme': '愛',         'focus': '人間関係と喜び',           'energy': '調和的な'},
        {'theme': '規律',       'focus': '構造と達成',               'energy': '地に足の着いた'},
    ],
    'ko': [
        {'theme': '성찰',       'focus': '휴식과 영적 갱신',         'energy': '사색적인'},
        {'theme': '새로운 시작','focus': '의도 설정과 새 출발',      'energy': '주도하는'},
        {'theme': '행동',       'focus': '용기와 결단',              'energy': '역동적인'},
        {'theme': '소통',       'focus': '아이디어와 연결',          'energy': '표현적인'},
        {'theme': '확장',       'focus': '성장과 풍요',              'energy': '낙관적인'},
        {'theme': '사랑',       'focus': '관계와 기쁨',              'energy': '조화로운'},
        {'theme': '규율',       'focus': '구조와 성취',              'energy': '안정된'},
    ],
    'zh': [
        {'theme': '反思',      'focus': '休息与心灵更新',       'energy': '冥思的'},
        {'theme': '新开始',    'focus': '设定意图与重新开始',   'energy': '起始的'},
        {'theme': '行动',      'focus': '勇气与决心',           'energy': '动态的'},
        {'theme': '沟通',      'focus': '想法与连结',           'energy': '表达的'},
        {'theme': '扩展',      'focus': '成长与丰盛',           'energy': '乐观的'},
        {'theme': '爱',        'focus': '关系与喜悦',           'energy': '和谐的'},
        {'theme': '纪律',      'focus': '结构与成就',           'energy': '扎根的'},
    ],
}

ELEMENTS = {
    'en': {
        'fire':  {'energy': 'dynamic and action-oriented',    'advice': 'Channel your passion into meaningful pursuits', 'challenge': "Practice patience and consider others' perspectives"},
        'earth': {'energy': 'grounded and practical',         'advice': 'Build steadily toward your goals',              'challenge': 'Embrace change as an opportunity for growth'},
        'air':   {'energy': 'intellectual and communicative', 'advice': 'Share your ideas and connect with others',     'challenge': 'Balance thinking with feeling and action'},
        'water': {'energy': 'emotional and intuitive',        'advice': 'Trust your inner wisdom and emotional intelligence', 'challenge': 'Set healthy boundaries while remaining compassionate'},
    },
    'ja': {
        'fire':  {'energy': '躍動的で行動志向',   'advice': '情熱を意味ある追求に注ぎましょう',         'challenge': '忍耐を実践し、他者の視点を考慮しましょう'},
        'earth': {'energy': '地に足がつき実用的', 'advice': '目標に向かって着実に築き上げましょう',     'challenge': '変化を成長の機会として受け入れましょう'},
        'air':   {'energy': '知的で対話的',       'advice': 'アイデアを共有し、他者とつながりましょう', 'challenge': '思考と感情と行動のバランスを取りましょう'},
        'water': {'energy': '感情的で直感的',     'advice': '内なる叡智と感情的知性を信頼しましょう',   'challenge': '慈愛を保ちつつ健全な境界線を設けましょう'},
    },
    'ko': {
        'fire':  {'energy': '역동적이며 행동 지향적', 'advice': '열정을 의미 있는 추구에 쏟으세요',           'challenge': '인내를 연습하고 타인의 관점을 고려하세요'},
        'earth': {'energy': '안정되고 실용적',         'advice': '목표를 향해 꾸준히 쌓아가세요',               'challenge': '변화를 성장의 기회로 받아들이세요'},
        'air':   {'energy': '지적이며 소통적',         'advice': '아이디어를 나누고 다른 이들과 연결되세요',    'challenge': '사고와 감정과 행동의 균형을 잡으세요'},
        'water': {'energy': '감정적이며 직관적',       'advice': '내면의 지혜와 감정 지능을 믿으세요',          'challenge': '자비로움을 유지하며 건강한 경계를 설정하세요'},
    },
    'zh': {
        'fire':  {'energy': '动态而行动导向', 'advice': '将你的热情投入有意义的追求',   'challenge': '练习耐心，并考虑他人的观点'},
        'earth': {'energy': '扎根而务实',     'advice': '朝着目标稳步建设',             'challenge': '将变化视为成长的机会'},
        'air':   {'energy': '理智而善沟通',   'advice': '分享你的想法并与他人连结',     'challenge': '平衡思考、感受与行动'},
        'water': {'energy': '情感化而直觉化', 'advice': '信任你的内在智慧与情感智能',   'challenge': '保持慈悲的同时设立健康的界限'},
    },
}

# Short phrase arrays used as {placeholder} interpolation values
VOCAB = {
    'en': {
        'focusAreas':        ['personal growth', 'relationships', 'career advancement', 'self-discovery', 'creative expression', 'emotional healing', 'spiritual development', 'financial wisdom', 'health and vitality', 'meaningful connections'],
        'loveActions':       ['expressing affection', 'deepening bonds', 'opening your heart', 'honest communication', 'romantic gestures', 'quality time together'],
        'workActivities':    ['strategic planning', 'collaboration', 'creative problem-solving', 'networking', 'skill development', 'leadership opportunities'],
        'selfCareActivities':['grounding meditation', 'creative expression', 'nature walks', 'journaling', 'restorative rest', 'mindful movement'],
        'careerActions':     ['taking initiative', 'building connections', 'showcasing expertise', 'strategic planning', 'collaborative projects', 'skill development'],
        'aspirations':       ['deeper connection', 'romantic harmony', 'authentic love'],
        'approaches':        ['authentic expression', 'dedicated effort', 'strategic thinking'],
        'healingActivities': ['reflection', 'release', 'restoration'],
        'nurturing':         ['rest', 'movement', 'creativity'],
        'healthFocuses':     ['balance', 'vitality', 'mindfulness'],
        'colors':            ['Crimson', 'Gold', 'Silver', 'Azure', 'Emerald', 'Amber', 'Rose', 'Ivory', 'Sapphire', 'Coral', 'Jade', 'Obsidian', 'Pearl', 'Copper', 'Lavender', 'Turquoise', 'Burgundy', 'Champagne', 'Onyx', 'Marigold'],
    },
    'ja': {
        'focusAreas':        ['自己成長', '人間関係', 'キャリアの前進', '自己発見', '創造的表現', '感情の癒し', '精神的な成長', '財務の叡智', '健康と活力', '意味あるつながり'],
        'loveActions':       ['愛情表現', '絆を深める', '心を開く', '正直な対話', 'ロマンティックな仕草', '共に過ごす質の高い時間'],
        'workActivities':    ['戦略的計画', '協働', '創造的問題解決', 'ネットワーキング', 'スキル開発', 'リーダーシップの機会'],
        'selfCareActivities':['グラウンディング瞑想', '創造的表現', '自然散歩', 'ジャーナリング', '回復的休息', 'マインドフルな運動'],
        'careerActions':     ['主導権を握る', 'つながりを築く', '専門性を見せる', '戦略的計画', '協働プロジェクト', 'スキル開発'],
        'aspirations':       ['より深いつながり', 'ロマンティックな調和', '本物の愛'],
        'approaches':        ['本物の表現', '献身的な努力', '戦略的思考'],
        'healingActivities': ['内省', '手放し', '回復'],
        'nurturing':         ['休息', '運動', '創造性'],
        'healthFocuses':     ['バランス', '活力', 'マインドフルネス'],
        'colors':            ['深紅', '金', '銀', '青', 'エメラルド', '琥珀', 'ローズ', 'アイボリー', 'サファイア', 'コーラル', '翡翠', '黒曜石', '真珠', '銅', 'ラベンダー', 'ターコイズ', 'バーガンディ', 'シャンパン', 'オニキス', 'マリーゴールド'],
    },
    'ko': {
        'focusAreas':        ['자기 성장', '관계', '커리어 전진', '자기 발견', '창의적 표현', '감정적 치유', '영적 발달', '재무 지혜', '건강과 활력', '의미 있는 연결'],
        'loveActions':       ['애정 표현', '유대 깊게 하기', '마음 열기', '솔직한 소통', '로맨틱한 제스처', '함께 보내는 질적인 시간'],
        'workActivities':    ['전략적 계획', '협업', '창의적 문제 해결', '네트워킹', '스킬 개발', '리더십 기회'],
        'selfCareActivities':['그라운딩 명상', '창의적 표현', '자연 산책', '저널링', '회복적 휴식', '마음챙김 운동'],
        'careerActions':     ['주도권 잡기', '연결 구축', '전문성 드러내기', '전략적 계획', '협업 프로젝트', '스킬 개발'],
        'aspirations':       ['더 깊은 연결', '로맨틱한 조화', '진실한 사랑'],
        'approaches':        ['진실한 표현', '헌신적인 노력', '전략적 사고'],
        'healingActivities': ['성찰', '놓아주기', '회복'],
        'nurturing':         ['휴식', '움직임', '창의성'],
        'healthFocuses':     ['균형', '활력', '마음챙김'],
        'colors':            ['진홍', '금', '은', '하늘', '에메랄드', '호박', '장미', '아이보리', '사파이어', '코랄', '비취', '흑요석', '진주', '구리', '라벤더', '터쿼이즈', '버건디', '샴페인', '오닉스', '메리골드'],
    },
    'zh': {
        'focusAreas':        ['个人成长', '关系', '职业前进', '自我发现', '创意表达', '情感疗愈', '心灵成长', '财务智慧', '健康与活力', '有意义的连结'],
        'loveActions':       ['表达情感', '深化羁绊', '敞开心扉', '坦诚沟通', '浪漫举动', '共度优质时光'],
        'workActivities':    ['策略规划', '合作', '创意解决问题', '人脉拓展', '技能发展', '领导机会'],
        'selfCareActivities':['扎根冥想', '创意表达', '自然漫步', '写日记', '恢复性休息', '正念运动'],
        'careerActions':     ['主动出击', '建立连结', '展现专业', '策略规划', '协作项目', '技能发展'],
        'aspirations':       ['更深的连结', '浪漫的和谐', '真实的爱'],
        'approaches':        ['真实的表达', '投入的努力', '策略性思考'],
        'healingActivities': ['反思', '释放', '恢复'],
        'nurturing':         ['休息', '运动', '创造'],
        'healthFocuses':     ['平衡', '活力', '正念'],
        'colors':            ['深红', '金', '银', '蔚蓝', '翠绿', '琥珀', '玫瑰', '象牙白', '蓝宝石', '珊瑚', '玉石', '黑曜石', '珍珠', '铜', '薰衣草', '绿松石', '勃艮第', '香槟', '缟玛瑙', '金盏花'],
    },
}

for lang in ['en', 'ja', 'ko', 'zh']:
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    daily = d.setdefault('dailyInsights', {})
    daily['planets'] = PLANETS[lang]
    daily['dayThemes'] = DAY_THEMES[lang]
    daily['elements'] = ELEMENTS[lang]
    for k, v in VOCAB[lang].items():
        daily[k] = v
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: context dicts added (planets+dayThemes+elements+vocab)')
