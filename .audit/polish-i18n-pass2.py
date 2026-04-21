"""Native-polish pass 2 — context vocabulary + element descriptors.

The short phrases in dailyInsights.{focusAreas,loveActions,workActivities,...}
get interpolated into templates — when they're literal English-shaped
they make the entire rendered sentence feel robotic, even if the
templates are polished.

Goals:
  - JA: normalize to noun-like forms (V→Vこと) so interpolation flows;
    replace heavy katakana (ネットワーキング) where native words exist.
  - KO: normalize to nominal forms (-기 / -하기 / noun), reduce stilted
    loanword strings.
  - ZH: replace English-shape gerund/infinitive patterns with idiomatic
    Chinese noun phrases.
"""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PATCHES = {
    'ja': {
        'focusAreas': ['自己成長', '人間関係', 'キャリアの前進', '自己理解', '創造的な表現', '感情の癒し', '精神的な成長', '豊かさとの関わり方', '健康と活力', '意味のあるつながり'],
        'loveActions': ['愛情を伝えること', '絆を深めること', '心を開くこと', '正直に語り合うこと', '小さなロマンティックな仕草', '質の高い時間を共に過ごすこと'],
        'workActivities': ['戦略的な計画', '協働作業', '創造的な問題解決', '人脈づくり', '学びと成長', 'リーダーシップを発揮する機会'],
        'selfCareActivities': ['落ち着く瞑想', '創造的な表現', '自然のなかを歩くこと', '日記を書くこと', 'しっかりとした休息', '意識的な運動'],
        'careerActions': ['自ら先頭に立つこと', '人との縁を育むこと', '持ち味を見せること', '戦略を立てること', '協力して進めるプロジェクト', '学びを重ねること'],
        'aspirations': ['より深いつながり', '穏やかな恋の時間', '本物の愛'],
        'approaches': ['偽りのない表現', '丁寧な積み重ね', 'よく練られた思考'],
        'healingActivities': ['内省', '手放し', '回復'],
        'nurturing': ['休息', '体を動かすこと', '創造の時間'],
        'healthFocuses': ['バランス', '活力', 'マインドフルな気づき'],
        'colors': ['深紅', '金色', '銀色', '青', 'エメラルド色', '琥珀色', 'ローズ色', 'アイボリー', 'サファイア色', 'コーラル色', '翡翠色', '黒曜石色', '真珠色', '銅色', 'ラベンダー色', 'ターコイズ色', 'ワインレッド', 'シャンパン色', 'オニキス色', 'マリーゴールド色'],
        # ─── element descriptors ────────────────────────────────────────
        'elements.fire.energy': '躍動と推進力',
        'elements.fire.advice': '情熱を、意味のある方向に注ぎましょう。',
        'elements.fire.challenge': '一歩立ち止まり、相手の目線を感じ取ってみましょう。',
        'elements.earth.energy': '落ち着きと実直さ',
        'elements.earth.advice': '目標に向けて、一つずつ積み重ねていきましょう。',
        'elements.earth.challenge': '変化を、成長の入口として迎えてみましょう。',
        'elements.air.energy': '知性と軽やかさ',
        'elements.air.advice': 'アイデアを声に出し、人と響かせてみましょう。',
        'elements.air.challenge': '考え、感じ、動く——そのバランスを整えましょう。',
        'elements.water.energy': '感受性と直感',
        'elements.water.advice': '内なる叡智と感情の知性を、信頼していきましょう。',
        'elements.water.challenge': 'やさしさは保ちつつ、自分を守る境界線も引きましょう。',
    },
    'ko': {
        'focusAreas': ['자기 성장', '관계', '커리어의 전진', '자기 이해', '창의적 표현', '감정 치유', '영적 성장', '풍요와의 관계', '건강과 활력', '의미 있는 연결'],
        'loveActions': ['애정 표현', '유대감을 키우는 시간', '마음 열기', '솔직한 대화', '소소한 로맨틱한 몸짓', '함께 보내는 알찬 시간'],
        'workActivities': ['전략적 계획', '협업', '창의적인 문제 해결', '인연 넓히기', '역량 다지기', '리더십을 발휘할 기회'],
        'selfCareActivities': ['차분한 명상', '창의적 표현', '자연 속 산책', '저널링', '깊은 휴식', '의식적인 움직임'],
        'careerActions': ['앞장서기', '인연 가꾸기', '나다운 강점 보여주기', '전략 세우기', '함께 하는 프로젝트', '실력 다지기'],
        'aspirations': ['더 깊은 연결', '잔잔한 설렘', '진짜 사랑'],
        'approaches': ['꾸밈없는 표현', '차분한 쌓기', '찬찬한 생각'],
        'healingActivities': ['성찰', '내려놓기', '회복'],
        'nurturing': ['휴식', '몸 움직이기', '창작 시간'],
        'healthFocuses': ['균형', '활력', '마음챙김'],
        'colors': ['진홍', '금빛', '은빛', '하늘빛', '에메랄드빛', '호박빛', '장미빛', '아이보리', '사파이어빛', '코랄', '비취빛', '흑요석빛', '진주빛', '구릿빛', '라벤더', '터쿼이즈', '버건디', '샴페인빛', '오닉스', '메리골드'],
        # ─── element descriptors ────────────────────────────────────────
        'elements.fire.energy': '역동과 추진력',
        'elements.fire.advice': '열정을 의미 있는 방향으로 쏟아보세요.',
        'elements.fire.challenge': '한 박자 늦추고, 상대의 시선을 느껴봐요.',
        'elements.earth.energy': '차분함과 실속',
        'elements.earth.advice': '목표를 향해 한 걸음씩 쌓아가요.',
        'elements.earth.challenge': '변화를 성장의 문으로 맞이해봐요.',
        'elements.air.energy': '지성과 경쾌함',
        'elements.air.advice': '아이디어를 꺼내고, 사람과 나눠보세요.',
        'elements.air.challenge': '생각, 감정, 행동—셋의 균형을 맞춰봐요.',
        'elements.water.energy': '감성과 직감',
        'elements.water.advice': '내면의 지혜와 감정의 감각을 믿어보세요.',
        'elements.water.challenge': '다정함은 지키되, 스스로를 위한 선도 그어줘요.',
    },
    'zh': {
        'focusAreas': ['个人成长', '人际关系', '事业进展', '自我认识', '创意表达', '情感疗愈', '心灵成长', '与丰盛的关系', '健康与活力', '有意义的连结'],
        'loveActions': ['表达情意', '加深羁绊', '敞开心扉', '坦诚的对话', '一点小小的浪漫', '好好地共度时光'],
        'workActivities': ['策略规划', '合作', '创意地解决问题', '拓展人脉', '磨炼技能', '发挥领导力的机会'],
        'selfCareActivities': ['安稳的冥想', '创意表达', '在自然中散步', '写日记', '踏实的休息', '有意识的活动身体'],
        'careerActions': ['主动带头', '经营人脉', '展现专业', '拟定策略', '合作中的项目', '累积实力'],
        'aspirations': ['更深的连结', '静好的心动', '真正的爱'],
        'approaches': ['真诚的表达', '踏实的累积', '沉稳的思考'],
        'healingActivities': ['反思', '放下', '恢复'],
        'nurturing': ['休息', '活动身体', '创造的时间'],
        'healthFocuses': ['平衡', '活力', '当下的觉察'],
        'colors': ['深红', '金色', '银色', '天蓝', '翠绿', '琥珀', '玫瑰色', '象牙白', '宝蓝', '珊瑚色', '翡翠色', '黑曜石色', '珍珠白', '铜色', '薰衣草紫', '松石绿', '酒红', '香槟色', '玛瑙黑', '金盏花色'],
        # ─── element descriptors ────────────────────────────────────────
        'elements.fire.energy': '动感与推进力',
        'elements.fire.advice': '把热情投入到真正重要的方向去。',
        'elements.fire.challenge': '放慢一拍,让对方的视角进来。',
        'elements.earth.energy': '沉稳与扎实',
        'elements.earth.advice': '朝目标一步一步地堆起来。',
        'elements.earth.challenge': '把变化当作成长的门口,而不是阻碍。',
        'elements.air.energy': '思辨与轻盈',
        'elements.air.advice': '把想法说出口,和人一起共振。',
        'elements.air.challenge': '思考、感受、行动——三者取得平衡。',
        'elements.water.energy': '感受与直觉',
        'elements.water.advice': '信任内在的智慧和情感的感知。',
        'elements.water.challenge': '保持柔软,也为自己画一条界线。',
    },
}

def set_nested(d, path, value):
    parts = path.split('.')
    for p in parts[:-1]:
        if p not in d: return False
        d = d[p]
    if isinstance(d, dict):
        d[parts[-1]] = value
        return True
    return False

total = 0
for lang, updates in PATCHES.items():
    p = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(p,'r',encoding='utf-8') as f: doc = json.load(f)
    di = doc.setdefault('dailyInsights', {})
    applied = 0
    for k, v in updates.items():
        if '.' in k:
            # element subkey
            if set_nested(di, k, v): applied += 1; total += 1
        else:
            di[k] = v
            applied += 1; total += 1
    with open(p,'w',encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=2); f.write('\n')
    print(f'{lang}: {applied} keys polished')
print(f'\nTotal: {total}')
