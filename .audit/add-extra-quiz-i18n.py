#!/usr/bin/env python3
"""
Fill in `timeEstimate` and `whatYouGet` for all 22 extra-quiz definitions
in zh/ja/ko app.json. The locale files currently have only `title` and
`description` for these quizzes — when QuizzesPage renders the card,
the missing fields fall back to the English values from
EXTRA_QUIZ_METADATA in src/data/extraQuizzes.ts.

Translations are hand-crafted (not auto-translated). Tone matches the
existing curated translations: matter-of-fact, slightly literary.
"""
import json
from collections import OrderedDict

BASE = r"C:\Users\lmao\TAROT\src\i18n\locales"

# (key, zh whatYouGet, ja whatYouGet, ko whatYouGet, time-estimate-min)
ENTRIES = [
    ("dark-triad", "4",
     ["你最显著的阴影特质", "每种特质的健康面与阴影面", "整合用的肯定语"],
     ["あなたに目立つシャドウ特性", "それぞれの健全形と影の形", "統合のためのアファメーション"],
     ["당신의 가장 두드러진 그림자 특성", "각 특성의 건강한 형태와 그림자 형태", "통합을 위한 긍정 확언"]),
    ("disc", "5",
     ["你的职场 D/I/S/C 风格", "优点与盲点", "如何与其他风格协作"],
     ["あなたの職場での D/I/S/C プロファイル", "強みと盲点", "他のスタイルとの協働の仕方"],
     ["당신의 직장 D/I/S/C 프로파일", "강점과 사각지대", "다른 스타일과 협업하는 방법"]),
    ("money-personality", "4",
     ["你的金钱脚本", "什么时候有用、什么时候没用", "重塑用的肯定语"],
     ["あなたのマネースクリプト", "それが役立つ時、役立たない時", "リフレーム用のアファメーション"],
     ["당신의 금전 스크립트", "유용할 때와 그렇지 않을 때", "재구성을 위한 긍정 확언"]),
    ("boundaries", "4",
     ["你的界限在哪里坚固、渗透、随情境变化", "每种模式的优势", "一项可立即练习的具体做法"],
     ["あなたの境界線がしっかりしている所、緩い所、状況依存の所", "それぞれのパターンの強み", "今すぐ試せる具体的な実践"],
     ["당신의 경계가 단단한 곳, 느슨한 곳, 상황에 따라 변하는 곳", "각 패턴의 강점", "바로 시도할 수 있는 구체적인 실천"]),
    ("burnout", "3",
     ["耗竭 vs 冷漠 vs 效能感下降的画像", "哪个维度最需要你先关注", "下一步行动的肯定语"],
     ["疲弊 vs 冷笑 vs 効力感低下のプロファイル", "どの次元に最初に注目すべきか", "次の一歩のためのアファメーション"],
     ["소진 vs 냉소 vs 효능감 저하 프로파일", "어느 차원에 먼저 주목해야 하는지", "다음 단계를 위한 긍정 확언"]),
    ("communication", "3",
     ["压力下的默认风格", "你什么时候能切换到自信沟通", "面对难谈话时可练习的方法"],
     ["ストレス下でのあなたのデフォルトスタイル", "アサーティブに切り替えられる時", "難しい会話のための練習"],
     ["스트레스 상황에서의 기본 스타일", "단호한 모드로 전환할 수 있는 시점", "어려운 대화를 위한 실천법"]),
    ("conflict", "4",
     ["你的托马斯-基尔曼冲突模式", "每种模式何时为你所用", "需要练习的模式"],
     ["あなたのトーマス・キルマン葛藤モード", "それぞれのモードが活きる時", "練習すべきモード"],
     ["당신의 Thomas-Kilmann 갈등 모드", "각 모드가 당신에게 도움이 되는 시점", "연습이 필요한 모드"]),
    ("chronotype", "4",
     ["你的 Breus 时型——狮子/熊/狼/海豚", "你的天然高效时段", "真正适合你的睡眠与作息建议"],
     ["あなたのBreusクロノタイプ — ライオン/クマ/オオカミ/イルカ", "あなたの自然なピーク時間", "あなたに本当に合う睡眠とスケジュールのコツ"],
     ["당신의 Breus 크로노타입 — 사자/곰/늑대/돌고래", "당신의 자연스러운 절정 시간대", "당신에게 정말 맞는 수면과 일정 팁"]),
    ("creative-type", "4",
     ["你在创作过程中的角色", "你最匹配的合作伙伴", "你可能卡住的地方"],
     ["創作プロセスにおけるあなたの役割", "最も相性が良い協働相手", "詰まりやすい場所"],
     ["창작 과정에서 당신의 역할", "가장 잘 맞는 협업 파트너", "막힐 수 있는 지점"]),
    ("spiritual-type", "4",
     ["你的修行之路——神秘者/仪式者/求索者/侍者/勇者", "你这条路的优点与阴影", "下一步的肯定语"],
     ["あなたの実践の道 — 神秘家/儀式家/探求者/奉仕者/戦士", "あなたの道の強みと影", "次のステップのためのアファメーション"],
     ["당신의 수행의 길 — 신비가/의례가/탐구자/봉사자/전사", "당신 길의 강점과 그림자", "다음 단계를 위한 긍정 확언"]),
    ("jungian-functions", "3",
     ["你的主导荣格认知功能", "它如何塑造你的 MBTI", "阴影与整合"],
     ["あなたの主導的なユング認知機能", "それがあなたのMBTIをどう形作るか", "影と統合"],
     ["당신의 주도적인 융 인지 기능", "그것이 당신의 MBTI를 어떻게 형성하는지", "그림자와 통합"]),
    ("love-styles", "3",
     ["你主导的 4 种希腊爱之风格中是哪一种", "优点与阴影", "随身的肯定语"],
     ["あなたが主に表す4つのギリシャ的な愛のスタイル", "強みと影", "持ち歩くアファメーション"],
     ["당신이 주로 드러내는 4가지 그리스식 사랑 스타일", "강점과 그림자", "가지고 다닐 긍정 확언"]),
    ("parenting-style", "3",
     ["你的默认育儿风格(权威/专制/放纵/忽视)", "研究怎么说", "肯定语"],
     ["あなたのデフォルト育児スタイル(権威的/権威主義的/許容的/放任的)", "研究が示すこと", "アファメーション"],
     ["당신의 기본 양육 스타일 (권위적/권위주의적/허용적/방임적)", "연구가 말하는 것", "긍정 확언"]),
    ("learning-style", "3",
     ["你的 VARK 学习风格", "你最擅长的信息吸收方式", "学习与工作建议"],
     ["あなたのVARK学習スタイル", "あなたが最も情報を吸収しやすい方法", "学習と仕事のコツ"],
     ["당신의 VARK 학습 스타일", "당신이 가장 잘 정보를 받아들이는 방식", "학습과 업무 팁"]),
    ("empath-hsp", "3",
     ["共情者、HSP、两者皆是、还是都不是", "在神经层面分别意味着什么", "实用的自我照护"],
     ["エンパス、HSP、両方、またはどちらでもない", "それぞれが神経学的に意味するもの", "実用的なセルフケア"],
     ["엠패스, HSP, 둘 다, 또는 둘 다 아님", "각각이 신경학적으로 의미하는 것", "실용적인 자기 돌봄"]),
    ("self-compassion", "3",
     ["你的主导自我慈悲态度", "你在哪里自我评判 vs 自我善待", "下一步肯定语"],
     ["あなたの主たる自己への思いやりの姿勢", "自己批判と自己慈愛の境界", "次の一歩のためのアファメーション"],
     ["당신의 주된 자기연민 태도", "자기비판과 자기친절의 경계", "다음 단계를 위한 긍정 확언"]),
    ("mood-screener", "3",
     ["近两周心情信号读数", "非诊断式自我反思", "若有需要,危机求助资源"],
     ["過去2週間の気分シグナルの読み取り", "診断ではない自己内省", "必要に応じた危機リソース"],
     ["지난 2주간 기분 신호 읽기", "진단 아닌 자기 성찰", "필요시 위기 자원"]),
    ("anxiety-profile", "3",
     ["焦虑在你身上的呈现位置", "通常对你有效的工具", "非诊断式自我反思"],
     ["あなたの不安の現れ方", "通常あなたに効くツール", "診断ではない自己内省"],
     ["당신에게 불안이 나타나는 방식", "당신에게 보통 효과적인 도구", "진단 아닌 자기 성찰"]),
    ("leadership-style", "3",
     ["你的默认领导模式", "适合搭档的对象", "这种风格的失效之处"],
     ["あなたのデフォルトのリーダーシップモード", "組むべき相手", "このスタイルが破綻する場所"],
     ["당신의 기본 리더십 모드", "함께해야 할 파트너", "이 스타일이 깨지는 지점"]),
    ("productivity-style", "3",
     ["你的工作节奏画像", "理想的工作环境", "需要停止勉强自己的事"],
     ["あなたの仕事リズムプロファイル", "理想的な環境", "無理して続けるのをやめるべきこと"],
     ["당신의 업무 리듬 프로파일", "이상적인 환경", "억지로 밀어붙이기를 멈춰야 할 것"]),
    ("relationship-readiness", "3",
     ["你目前所处的准备阶段", "最先需要呵护的部分", "不带评判的镜子"],
     ["あなたの現在の準備段階", "最初にケアすべきこと", "判断を含まない鏡"],
     ["당신의 현재 준비 단계", "가장 먼저 돌봐야 할 것", "판단 없는 거울"]),
    ("wellness-type", "3",
     ["你最有效的恢复方式", "对你有用的工具", "如何设计你的一周"],
     ["あなたの最も効果的な回復方法", "あなたに合うツール", "一週間の設計の仕方"],
     ["당신의 가장 효과적인 회복 방식", "당신에게 맞는 도구", "한 주를 설계하는 방법"]),
]

# time-estimate localized: "{n} min" → "{n} 分钟" / "{n}分" / "{n}분"
TIME_LABELS = {
    "zh": lambda n: f"{n} 分钟",
    "ja": lambda n: f"{n}分",
    "ko": lambda n: f"{n}분",
}

# readings.tabs.dice / readings.tabs.runes (also flagged in audit)
READINGS_TAB_TRANSLATIONS = {
    "zh": {"dice": "骰子", "runes": "符文"},
    "ja": {"dice": "ダイス", "runes": "ルーン"},
    "ko": {"dice": "주사위", "runes": "룬"},
}


# EN whatYouGet (must match src/data/extraQuizzes.ts EXTRA_QUIZ_METADATA)
EN_WHAT_YOU_GET = {
    "dark-triad": ["Your dominant shadow trait", "Healthy and shadow forms of each", "Integration affirmation"],
    "disc": ["Your workplace D/I/S/C profile", "Strengths and blind spots", "How to collaborate with other styles"],
    "money-personality": ["Your money script", "When it serves you and when it doesn't", "Reframe affirmation"],
    "boundaries": ["Where your boundaries are firm, porous, or situational", "Strengths of each pattern", "One concrete practice to try"],
    "burnout": ["Exhaustion vs cynicism vs efficacy-loss profile", "Which dimension needs your attention first", "A next-step affirmation"],
    "communication": ["Your default style under stress", "When you flex to assertive", "A practice for the hard conversations"],
    "conflict": ["Your Thomas-Kilmann conflict mode", "When each mode serves you", "Which modes to practice"],
    "chronotype": ["Your Breus chronotype — Lion/Bear/Wolf/Dolphin", "Your natural peak hours", "Sleep + schedule tips that actually suit you"],
    "creative-type": ["Your role in the creative process", "Who you partner best with", "Where you might get stuck"],
    "spiritual-type": ["Your path of practice — Mystic / Ritualist / Seeker / Servant / Warrior", "Strengths and shadows of your path", "Affirmation for the next step"],
    "jungian-functions": ["Your dominant Jungian cognitive function", "How it shapes your MBTI", "Shadow + integration"],
    "love-styles": ["Which of 4 Greek love styles you lead with", "Strengths + shadow", "Affirmation to carry"],
    "parenting-style": ["Your default style (authoritative / authoritarian / permissive / neglectful)", "What research says", "Affirmation"],
    "learning-style": ["Your VARK style", "How you best take in information", "Study + work tips"],
    "empath-hsp": ["Empath, HSP, both, or neither", "What each means neurologically", "Practical self-care"],
    "self-compassion": ["Your dominant self-compassion stance", "Where you self-judge vs self-kind", "Next-step affirmation"],
    "mood-screener": ["A 2-week mood signal read", "NON-diagnostic self-reflection", "Crisis resources if needed"],
    "anxiety-profile": ["Where anxiety shows up for you", "What tools tend to work", "Non-diagnostic self-reflection"],
    "leadership-style": ["Your default leadership mode", "Who to pair with", "Where the style breaks"],
    "productivity-style": ["Your work-rhythm profile", "Ideal environment", "What to stop forcing"],
    "relationship-readiness": ["Where you are in readiness", "What to tend first", "Non-judgmental mirror"],
    "wellness-type": ["How you best restore", "Which tools work for you", "How to design your week"],
}

EN_TIME = {
    "dark-triad": "4 min", "disc": "5 min", "money-personality": "4 min",
    "boundaries": "4 min", "burnout": "3 min", "communication": "3 min",
    "conflict": "4 min", "chronotype": "4 min", "creative-type": "4 min",
    "spiritual-type": "4 min", "jungian-functions": "3 min", "love-styles": "3 min",
    "parenting-style": "3 min", "learning-style": "3 min", "empath-hsp": "3 min",
    "self-compassion": "3 min", "mood-screener": "3 min", "anxiety-profile": "3 min",
    "leadership-style": "3 min", "productivity-style": "3 min",
    "relationship-readiness": "3 min", "wellness-type": "3 min",
}


def update_locale(locale):
    """Write timeEstimate + whatYouGet under extraQuizzes.<key> for each
    extra quiz. EN gets the English source-of-truth values; non-EN gets
    translated values."""
    path = f"{BASE}\\{locale}\\app.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f, object_pairs_hook=OrderedDict)
    extra = data.get("extraQuizzes")
    if extra is None:
        print(f"  {locale}: WARNING — extraQuizzes namespace missing, skipping")
        return 0
    added = 0
    for entry in ENTRIES:
        key, mins, zh, ja, ko = entry
        if key not in extra:
            print(f"  {locale}: WARNING — extraQuizzes.{key} not present, skipping")
            continue
        block = extra[key]
        if locale == "en":
            block["timeEstimate"] = EN_TIME[key]
            block["whatYouGet"] = list(EN_WHAT_YOU_GET[key])
        else:
            block["timeEstimate"] = TIME_LABELS[locale](mins)
            which = {"zh": zh, "ja": ja, "ko": ko}[locale]
            block["whatYouGet"] = list(which)
        added += 1

    # readings.tabs.dice / readings.tabs.runes (skip EN — already correct)
    if locale != "en":
        tabs = data.get("readings", {}).get("tabs", {})
        for k, v in READINGS_TAB_TRANSLATIONS[locale].items():
            if k in tabs and tabs[k] in ("Dice", "Runes"):  # only overwrite untranslated English
                tabs[k] = v

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"  {locale}: extraQuizzes.<key>.{{timeEstimate,whatYouGet}} added on {added}/{len(ENTRIES)} quizzes")
    return added


total = 0
for locale in ["en", "zh", "ja", "ko"]:
    total += update_locale(locale)
print(f"\nTotal field-pairs added: {total} (target: {len(ENTRIES)} quizzes × 4 locales = {len(ENTRIES)*4})")
