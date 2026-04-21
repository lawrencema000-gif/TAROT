"""Native-polish pass 3 — planets / dayThemes / moods / actionSteps.

These get rendered frequently on Horoscope Today (Power Move card,
category blurbs, mood pill, action step). Fix tone + naturalness +
drop heavy pronouns.
"""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PATCHES = {
    'ja': {
        'planets': {
            'sun':     {'theme': '生命力と自己表現', 'positive': '今日、本来のあなたが自然と輝いています。', 'focus': 'アイデンティティ・創造性・リーダーシップ'},
            'moon':    {'theme': '感情と直感',       'positive': '感情の知恵が、そっと道を示してくれます。',   'focus': '感情・家庭・育むこと'},
            'mercury': {'theme': '対話と思考',       'positive': '明晰な言葉が、新しい扉を開いていきます。',   'focus': '発想・学び・つながり'},
            'venus':   {'theme': '愛と美',           'positive': '調和と美が、やさしく包んでくれます。',       'focus': '人間関係・美意識・大切にしたい価値'},
            'mars':    {'theme': '行動とエネルギー', 'positive': '推進力と決意が、今日強く働いています。',     'focus': 'イニシアティブ・勇気・野心'},
            'jupiter': {'theme': '拡がりと幸運',     'positive': '豊かさと機会が、静かに流れ込んできます。',   'focus': '成長・楽観・叡智'},
            'saturn':  {'theme': '構造と規律',       'positive': '積み重ねてきた努力が、確かな土台になります。', 'focus': '責任・達成・熟達'},
            'uranus':  {'theme': '革新と変化',       'positive': '思いがけない突破口が、今日開くかもしれません。', 'focus': '独創性・自由・変革'},
            'neptune': {'theme': '夢と霊性',         'positive': '想像と直感が、いつもより澄んでいます。',     'focus': '創造性・慈しみ・超越'},
            'pluto':   {'theme': '変容と力',         'positive': '深いところで起きている変化が、再生をもたらします。', 'focus': '再生・深み・隠された真実'},
        },
        'dayThemes': [
            {'theme': '内省',         'focus': '休息と心の整え',         'energy': '穏やかに瞑想するような'},
            {'theme': '新しい始まり', 'focus': '意図を定め、踏み出す',    'energy': '動き出すような'},
            {'theme': '行動',         'focus': '勇気と決意',              'energy': '躍動するような'},
            {'theme': '対話',         'focus': 'アイデアとつながり',      'energy': '言葉が流れるような'},
            {'theme': '拡がり',       'focus': '成長と豊かさ',            'energy': '開けていくような'},
            {'theme': '愛',           'focus': '人間関係と喜び',          'energy': '調和のとれた'},
            {'theme': '規律',         'focus': '構造と達成',              'energy': '地に足のついた'},
        ],
        'moodDescriptors': [
            '静かに力強い', '落ち着かないけれど目的はある', '開かれて受容的',
            'やわらかくて素直', '地に足がつき揺るぎない', '軽やかで遊び心がある',
            '内省的で思慮深い', '活気があって人を惹きつける', '頭が冴えて決断できる',
            '守り深く情熱的', '希望を持って前を向いている', '忍耐強く安定している',
            '感情に正直', '少しずつ立ち直りつつある', '創造的でインスピレーションに満ちた',
        ],
        'actionSteps': [
            '5分だけ、今日感謝していることを日記に書いてみましょう。',
            'ずっと気になっていた誰かに、軽く連絡してみましょう。',
            '今日の意図をひとつ決めて、紙に書き留めましょう。',
            '10分の静かな瞑想か、内省の時間を取りましょう。',
            '少し怖いと感じることを、ひとつだけやってみましょう。',
            '今抱えている感情をひとつ、裁かずに名前をつけてみましょう。',
            '誰かの素敵なところを、具体的なエピソードと一緒に伝えましょう。',
            '先延ばしにしてきた決断を、ひとつだけ下してみましょう。',
            '10分、体を動かしてみましょう——散歩、ストレッチ、ダンス、なんでも。',
            '寝る前に、今日学んだことを一文だけ書きましょう。',
            '今日の不満をひとつ、素直な「お願い」に置き換えてみましょう。',
            '大切な人を一人選んで、10分、心から向き合う時間を作りましょう。',
        ],
    },
    'ko': {
        'planets': {
            'sun':     {'theme': '활력과 자기 표현', 'positive': '오늘, 본연의 당신이 자연스럽게 빛나고 있어요.', 'focus': '정체성 · 창의성 · 리더십'},
            'moon':    {'theme': '감정과 직감',       'positive': '감정의 지혜가 조용히 길을 비춰줘요.',          'focus': '감정 · 가정 · 돌봄'},
            'mercury': {'theme': '소통과 사고',       'positive': '명료한 말이 새 문을 열어줘요.',                'focus': '아이디어 · 배움 · 연결'},
            'venus':   {'theme': '사랑과 아름다움',    'positive': '조화와 아름다움이 부드럽게 감싸요.',           'focus': '관계 · 미감 · 소중한 가치'},
            'mars':    {'theme': '행동과 에너지',     'positive': '추진력과 결단이 오늘 단단하게 작동해요.',       'focus': '주도성 · 용기 · 야망'},
            'jupiter': {'theme': '확장과 행운',       'positive': '풍요와 기회가 조용히 흘러 들어와요.',           'focus': '성장 · 낙관 · 지혜'},
            'saturn':  {'theme': '구조와 규율',       'positive': '쌓아온 노력이 든든한 기반이 되어줘요.',         'focus': '책임 · 성취 · 숙련'},
            'uranus':  {'theme': '혁신과 변화',       'positive': '예상치 못한 돌파구가 오늘 열릴 수 있어요.',     'focus': '독창 · 자유 · 변혁'},
            'neptune': {'theme': '꿈과 영성',         'positive': '상상과 직감이 평소보다 맑아요.',               'focus': '창의 · 자비 · 초월'},
            'pluto':   {'theme': '변용과 힘',         'positive': '깊은 곳의 변화가 재탄생을 가져와요.',           'focus': '재탄생 · 깊이 · 숨겨진 진실'},
        },
        'dayThemes': [
            {'theme': '성찰',        'focus': '휴식과 마음 정돈',     'energy': '잔잔히 고요한'},
            {'theme': '새 출발',      'focus': '의도를 정하고 시작하기', 'energy': '움직여 나가는'},
            {'theme': '행동',        'focus': '용기와 결단',          'energy': '생동감 있는'},
            {'theme': '소통',        'focus': '아이디어와 연결',      'energy': '말이 술술 흐르는'},
            {'theme': '확장',        'focus': '성장과 풍요',          'energy': '열려가는'},
            {'theme': '사랑',        'focus': '관계와 기쁨',          'energy': '어울리고 조화로운'},
            {'theme': '규율',        'focus': '구조와 성취',          'energy': '땅을 단단히 밟는'},
        ],
        'moodDescriptors': [
            '조용히 단단한', '들뜨지만 방향은 또렷한', '활짝 열리고 받아들이는',
            '부드럽고 솔직한', '단단하고 흔들림 없는', '가볍고 장난기 있는',
            '차분히 사색적인', '활기 있고 사람을 끌어당기는', '머리가 맑고 결단력 있는',
            '다정히 지키려는', '희망을 품고 앞을 보는', '인내심 있고 안정된',
            '감정에 솔직한', '천천히 회복해 가는', '창의적이고 영감 가득한',
        ],
        'actionSteps': [
            '오늘 감사한 일을 5분만 적어봐요.',
            '마음에 걸리던 사람에게 가볍게 연락해봐요.',
            '오늘의 의도를 한 문장으로 적어두세요.',
            '10분간 조용한 명상 또는 성찰의 시간을 가져봐요.',
            '살짝 두려운 일 하나를 해봐요.',
            '지금 느끼는 감정 하나에, 판단 없이 이름을 붙여봐요.',
            '누군가의 좋은 점을, 구체적인 장면과 함께 말해봐요.',
            '미뤄온 결정을 하나만 내려봐요.',
            '10분만 몸을 움직여요——산책, 스트레칭, 춤, 무엇이든.',
            '자기 전에 오늘 배운 것을 한 문장으로 남겨봐요.',
            '오늘의 불평을 하나 골라, 필요의 요청으로 바꿔봐요.',
            '한 사람을 골라 10분, 진심으로 집중하는 시간을 가져봐요.',
        ],
    },
    'zh': {
        'planets': {
            'sun':     {'theme': '生命力与自我表达', 'positive': '今天,真实的你自然地闪耀着。',              'focus': '身份 · 创造力 · 领导力'},
            'moon':    {'theme': '情感与直觉',        'positive': '情感的智慧在静静地为你指路。',            'focus': '情感 · 家庭 · 照顾'},
            'mercury': {'theme': '沟通与思考',        'positive': '清晰的话语,会为你打开新的门。',          'focus': '想法 · 学习 · 连结'},
            'venus':   {'theme': '爱与美',            'positive': '和谐与美丽,温柔地将你包围。',            'focus': '关系 · 审美 · 在意的价值'},
            'mars':    {'theme': '行动与能量',        'positive': '推动力与决心,今天稳稳地在运作。',        'focus': '主动 · 勇气 · 抱负'},
            'jupiter': {'theme': '扩展与幸运',        'positive': '丰盛与机会,正悄悄地涌来。',              'focus': '成长 · 乐观 · 智慧'},
            'saturn':  {'theme': '结构与纪律',        'positive': '过去累积的努力,正在变成稳固的地基。',    'focus': '责任 · 成就 · 熟练'},
            'uranus':  {'theme': '创新与改变',        'positive': '意料之外的突破,今天可能打开。',          'focus': '独创 · 自由 · 变革'},
            'neptune': {'theme': '梦境与灵性',        'positive': '想象与直觉,比平时更清澈。',              'focus': '创造 · 慈悲 · 超越'},
            'pluto':   {'theme': '转化与力量',        'positive': '深处的变化,正带来一次新生。',            'focus': '新生 · 深度 · 被藏起的真相'},
        },
        'dayThemes': [
            {'theme': '内省',    'focus': '休息与内心整理',  'energy': '静思般的'},
            {'theme': '新开始',  'focus': '定下意图,再起步', 'energy': '起身向前的'},
            {'theme': '行动',    'focus': '勇气与决心',      'energy': '充满动感的'},
            {'theme': '沟通',    'focus': '想法与连结',      'energy': '言语顺畅的'},
            {'theme': '扩展',    'focus': '成长与丰盛',      'energy': '徐徐展开的'},
            {'theme': '爱',      'focus': '关系与喜悦',      'energy': '和谐一致的'},
            {'theme': '纪律',    'focus': '结构与成就',      'energy': '稳稳扎根的'},
        ],
        'moodDescriptors': [
            '安静而有力', '躁动但有方向', '敞开而接纳',
            '柔软而真实', '稳稳扎根、毫不动摇', '轻盈又带点俏皮',
            '沉思而有分量', '充沛,带着吸引力', '头脑清明、能做决定',
            '护着所爱、不轻易松手', '带着希望看向前方', '耐心而稳定',
            '对情绪坦白', '一点点在恢复', '有创造力,被灵感推着走',
        ],
        'actionSteps': [
            '花 5 分钟,把今天感谢的事写下来。',
            '向一位你一直想起的人,轻轻地发个消息。',
            '为今天设一个明确的意图,写成一句话。',
            '花 10 分钟安静地冥想,或只是坐着反思。',
            '做一件让你稍微有点怕的事。',
            '为此刻正携带的一种情绪,不带评判地命名。',
            '告诉某人你欣赏他哪一点,再举一个具体的例子。',
            '把一个一直拖着的决定,今天下了它。',
            '动一动身体十分钟——散步、拉伸、跳舞都行。',
            '睡前,用一句话写下今天教会你什么。',
            '把今天的一句抱怨,换成一句你真正需要什么的请求。',
            '挑一段关系,给它 10 分钟真心的注意。',
        ],
    },
}

def set_nested(d, path, value):
    parts = path.split('.')
    for p in parts[:-1]:
        if p not in d: return False
        d = d[p]
    if isinstance(d, dict): d[parts[-1]] = value; return True
    return False

total = 0
for lang, updates in PATCHES.items():
    p = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(p,'r',encoding='utf-8') as f: doc = json.load(f)
    di = doc.setdefault('dailyInsights', {})
    for k, v in updates.items():
        di[k] = v
        total += 1
    with open(p,'w',encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=2); f.write('\n')
    print(f'{lang}: planets + dayThemes + moodDescriptors + actionSteps polished')
print(f'\nTotal top-level keys replaced: {total}')
