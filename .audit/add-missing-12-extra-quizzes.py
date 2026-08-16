#!/usr/bin/env python3
"""
Add the 12 missing extra-quiz entries to en/ja/ko/zh app.json under
extraQuizzes.<key>. Each entry: title + description + timeEstimate +
whatYouGet (4-language).

These quizzes had EXTRA_QUIZ_METADATA in extraQuizzes.ts but no locale
file entries — falling back to English on every locale.
"""
import json
from collections import OrderedDict

BASE = r"C:\Users\lmao\TAROT\src\i18n\locales"

# (key, en title, en desc, time-min, en wYG[3], zh title, zh desc, zh wYG[3], ja title, ja desc, ja wYG[3], ko title, ko desc, ko wYG[3])
ENTRIES = [
    {
        "key": "jungian-functions",
        "min": "3",
        "en": ("Jungian Functions", "Your dominant Jungian cognitive function — Ni, Ne, Si, Se, Ti, Te, Fi, or Fe — and how it stacks with your MBTI letters into the way you process the world.",
               ["Your dominant Jungian cognitive function", "How it shapes your MBTI", "Shadow + integration"]),
        "zh": ("荣格认知功能", "你主导的荣格认知功能——Ni、Ne、Si、Se、Ti、Te、Fi 或 Fe——以及它如何与你的 MBTI 字母一起塑造你处理世界的方式。",
               ["你的主导荣格认知功能", "它如何塑造你的 MBTI", "阴影与整合"]),
        "ja": ("ユング認知機能", "あなたの主導的なユング認知機能 — Ni / Ne / Si / Se / Ti / Te / Fi / Fe — と、それがあなたのMBTI文字とどう積み重なって世界を処理する方法を形作るか。",
               ["あなたの主導的なユング認知機能", "それがあなたのMBTIをどう形作るか", "影と統合"]),
        "ko": ("융 인지 기능", "당신의 주도적인 융 인지 기능 — Ni, Ne, Si, Se, Ti, Te, Fi, Fe — 이 어떻게 당신의 MBTI 글자와 결합해 세상을 처리하는 방식을 형성하는지.",
               ["당신의 주도적인 융 인지 기능", "그것이 당신의 MBTI를 어떻게 형성하는지", "그림자와 통합"]),
    },
    {
        "key": "love-styles",
        "min": "3",
        "en": ("Love Styles", "Which of the four Greek love styles you lead with: Eros (passion), Philia (deep friendship), Storge (steady warmth), or Agape (unconditional). One isn't better — they ask different things of you.",
               ["Which of 4 Greek love styles you lead with", "Strengths + shadow", "Affirmation to carry"]),
        "zh": ("爱的风格", "四种希腊式爱中你主导的是哪一种:Eros(激情)、Philia(深厚友谊)、Storge(稳定的温暖)、Agape(无条件)。没有谁更好——它们对你的要求不同。",
               ["你主导的 4 种希腊爱之风格中是哪一种", "优点与阴影", "随身的肯定语"]),
        "ja": ("愛のスタイル", "あなたが主に表す4つのギリシャ的愛 — Eros(情熱)、Philia(深い友愛)、Storge(安定した温かさ)、Agape(無条件の愛) — のどれか。優劣はなく、それぞれが異なるものを求めます。",
               ["あなたが主に表す4つのギリシャ的な愛のスタイル", "強みと影", "持ち歩くアファメーション"]),
        "ko": ("사랑의 스타일", "당신이 주로 드러내는 4가지 그리스식 사랑 — Eros(열정), Philia(깊은 우정), Storge(안정적인 따뜻함), Agape(무조건적인 사랑) — 중 어느 것인지. 우열이 아닌, 각각이 다른 것을 요구합니다.",
               ["당신이 주로 드러내는 4가지 그리스식 사랑 스타일", "강점과 그림자", "가지고 다닐 긍정 확언"]),
    },
    {
        "key": "parenting-style",
        "min": "3",
        "en": ("Parenting Style", "Your default Baumrind parenting style — Authoritative, Authoritarian, Permissive, or Neglectful — under stress versus when you're at your best. What research says about each, and one affirmation to carry.",
               ["Your default style (authoritative / authoritarian / permissive / neglectful)", "What research says", "Affirmation"]),
        "zh": ("育儿风格", "你的默认 Baumrind 育儿风格——权威型、专制型、放纵型或忽视型——在压力下,以及在你状态最好时的差异。研究怎么说,以及一句可随身的肯定语。",
               ["你的默认育儿风格(权威/专制/放纵/忽视)", "研究怎么说", "肯定语"]),
        "ja": ("育児スタイル", "あなたのデフォルトのBaumrind育児スタイル — 権威的/権威主義的/許容的/放任的 — ストレス下とベストな状態でどう違うか。研究が示すことと、持ち歩く一つのアファメーション。",
               ["あなたのデフォルト育児スタイル(権威的/権威主義的/許容的/放任的)", "研究が示すこと", "アファメーション"]),
        "ko": ("양육 스타일", "스트레스 상황과 최상의 상태에서 당신의 기본 Baumrind 양육 스타일 — 권위적/권위주의적/허용적/방임적 — 이 어떻게 달라지는지. 연구 결과와 함께 가지고 다닐 긍정 확언 하나.",
               ["당신의 기본 양육 스타일 (권위적/권위주의적/허용적/방임적)", "연구가 말하는 것", "긍정 확언"]),
    },
    {
        "key": "learning-style",
        "min": "3",
        "en": ("Learning Style", "Your VARK preference — Visual, Auditory, Read/Write, or Kinesthetic. How you actually take in information, and how to design study + work to match the wiring.",
               ["Your VARK style", "How you best take in information", "Study + work tips"]),
        "zh": ("学习风格", "你的 VARK 偏好——视觉、听觉、阅读/写作、动觉。你实际上是如何吸收信息的,以及如何设计学习与工作以匹配你的线路。",
               ["你的 VARK 学习风格", "你最擅长的信息吸收方式", "学习与工作建议"]),
        "ja": ("学習スタイル", "あなたのVARK 嗜好 — 視覚/聴覚/読み書き/体感 — 。あなたが実際にどう情報を吸収するか、そしてその配線に合うように学習と仕事をどう設計するか。",
               ["あなたのVARK学習スタイル", "あなたが最も情報を吸収しやすい方法", "学習と仕事のコツ"]),
        "ko": ("학습 스타일", "당신의 VARK 선호도 — 시각/청각/읽기·쓰기/운동감각. 당신이 실제로 정보를 받아들이는 방식과, 그 회로에 맞게 학습과 일을 설계하는 방법.",
               ["당신의 VARK 학습 스타일", "당신이 가장 잘 정보를 받아들이는 방식", "학습과 업무 팁"]),
    },
    {
        "key": "empath-hsp",
        "min": "3",
        "en": ("Empath or HSP", "Empath, Highly Sensitive Person, both, or neither. What each means neurologically — they're related but not the same — and practical self-care for whichever wiring you have.",
               ["Empath, HSP, both, or neither", "What each means neurologically", "Practical self-care"]),
        "zh": ("共情者 / HSP", "共情者、高敏感人(HSP)、两者皆是,还是都不是。从神经层面分别意味着什么——它们相关但不相同——以及针对你的线路的实用自我照护。",
               ["共情者、HSP、两者皆是、还是都不是", "在神经层面分别意味着什么", "实用的自我照护"]),
        "ja": ("エンパス / HSP", "エンパス、HSP(高感受性者)、両方、またはどちらでもない。神経学的にそれぞれが意味するもの — 関連していますが同じではありません — と、あなたの配線に合わせた実用的なセルフケア。",
               ["エンパス、HSP、両方、またはどちらでもない", "それぞれが神経学的に意味するもの", "実用的なセルフケア"]),
        "ko": ("엠패스 / HSP", "엠패스, 매우 민감한 사람(HSP), 둘 다, 또는 둘 다 아님. 신경학적으로 각각이 의미하는 것 — 관련되어 있지만 동일하지 않음 — 과 당신의 회로에 맞는 실용적인 자기 돌봄.",
               ["엠패스, HSP, 둘 다, 또는 둘 다 아님", "각각이 신경학적으로 의미하는 것", "실용적인 자기 돌봄"]),
    },
    {
        "key": "self-compassion",
        "min": "3",
        "en": ("Self-Compassion", "Your dominant self-compassion stance — Self-Kind, Self-Judging, Mindful, or Over-Identified. Where you support yourself and where you don't, with one next-step affirmation.",
               ["Your dominant self-compassion stance", "Where you self-judge vs self-kind", "Next-step affirmation"]),
        "zh": ("自我慈悲", "你的主导自我慈悲态度——自我善待、自我评判、正念、过度认同。你在哪里支持自己、在哪里不支持自己,以及一句下一步的肯定语。",
               ["你的主导自我慈悲态度", "你在哪里自我评判 vs 自我善待", "下一步肯定语"]),
        "ja": ("自己への思いやり", "あなたの主たる自己への思いやりの姿勢 — 自己親切、自己批判、マインドフル、過剰同一視。自分を支える所と支えない所、そして次の一歩のアファメーション。",
               ["あなたの主たる自己への思いやりの姿勢", "自己批判と自己慈愛の境界", "次の一歩のためのアファメーション"]),
        "ko": ("자기연민", "당신의 주된 자기연민 태도 — 자기친절, 자기비판, 마음챙김, 과잉동일시. 당신이 자신을 지지하는 곳과 그렇지 않은 곳, 그리고 다음 단계를 위한 긍정 확언.",
               ["당신의 주된 자기연민 태도", "자기비판과 자기친절의 경계", "다음 단계를 위한 긍정 확언"]),
    },
    {
        "key": "mood-screener",
        "min": "3",
        "en": ("Mood Screener", "A two-week mood signal read using non-diagnostic PHQ-2-style questions. NOT a diagnosis — a self-reflection mirror, with crisis resources surfaced if your answers suggest you need support.",
               ["A 2-week mood signal read", "NON-diagnostic self-reflection", "Crisis resources if needed"]),
        "zh": ("心境信号检查", "通过非诊断式 PHQ-2 风格问题对近两周心境的信号读取。这不是诊断——是一面自我反思的镜子,若回答提示你需要支持,会显示求助资源。",
               ["近两周心情信号读数", "非诊断式自我反思", "若有需要,危机求助资源"]),
        "ja": ("気分シグナル・チェック", "非診断的なPHQ-2スタイルの質問による過去2週間の気分シグナル読み取り。診断ではなく、自己省察の鏡 — 答えがサポートが必要であることを示唆する場合、危機リソースを提示します。",
               ["過去2週間の気分シグナルの読み取り", "診断ではない自己内省", "必要に応じた危機リソース"]),
        "ko": ("기분 신호 점검", "비진단적 PHQ-2 스타일 질문을 통한 지난 2주간 기분 신호 읽기. 진단이 아니라 자기 성찰의 거울 — 답변이 도움이 필요함을 시사하면 위기 자원을 보여줍니다.",
               ["지난 2주간 기분 신호 읽기", "진단 아닌 자기 성찰", "필요시 위기 자원"]),
    },
    {
        "key": "anxiety-profile",
        "min": "3",
        "en": ("Anxiety Profile", "Where anxiety tends to show up in your body and life — somatic (body-first), generalised, social, or performance — and which tools tend to actually help that flavour.",
               ["Where anxiety shows up for you", "What tools tend to work", "Non-diagnostic self-reflection"]),
        "zh": ("焦虑画像", "焦虑通常在你的身体和生活中以何种形式出现——身体型(身体优先)、广泛型、社交型、或表现型——以及哪些工具通常对你这种类型有效。",
               ["焦虑在你身上的呈现位置", "通常对你有效的工具", "非诊断式自我反思"]),
        "ja": ("不安プロファイル", "不安があなたの身体と生活でどう現れるか — 身体型(身体優位)、全般型、社交型、パフォーマンス型 — そして、そのタイプに実際に効くツール。",
               ["あなたの不安の現れ方", "通常あなたに効くツール", "診断ではない自己内省"]),
        "ko": ("불안 프로파일", "불안이 당신의 몸과 삶에서 어떻게 나타나는지 — 신체형(몸 우선), 일반화, 사회적, 수행 — 그리고 그 유형에 실제로 도움이 되는 도구.",
               ["당신에게 불안이 나타나는 방식", "당신에게 보통 효과적인 도구", "진단 아닌 자기 성찰"]),
    },
    {
        "key": "leadership-style",
        "min": "3",
        "en": ("Leadership Style", "Your default leadership mode under pressure — Visionary, Servant, Commander, or Coach. Including who you should pair with, and where this style breaks under stress.",
               ["Your default leadership mode", "Who to pair with", "Where the style breaks"]),
        "zh": ("领导风格", "你压力下的默认领导模式——愿景型、服务型、指挥型或教练型。包括你应该搭档的对象,以及这种风格在压力下会从哪里破裂。",
               ["你的默认领导模式", "适合搭档的对象", "这种风格的失效之处"]),
        "ja": ("リーダーシップスタイル", "プレッシャー下のあなたのデフォルトリーダーシップモード — ビジョナリー、サーバント、コマンダー、コーチ。組むべき相手と、ストレス下でこのスタイルが破綻する場所を含む。",
               ["あなたのデフォルトのリーダーシップモード", "組むべき相手", "このスタイルが破綻する場所"]),
        "ko": ("리더십 스타일", "압박 상황에서 당신의 기본 리더십 모드 — 비저너리, 서번트, 커맨더, 코치. 함께해야 할 파트너와, 스트레스 하에서 이 스타일이 깨지는 지점 포함.",
               ["당신의 기본 리더십 모드", "함께해야 할 파트너", "이 스타일이 깨지는 지점"]),
    },
    {
        "key": "productivity-style",
        "min": "3",
        "en": ("Productivity Style", "Your work-rhythm profile — Deep Worker, Sprinter, Connector, or Organiser. Where your energy actually lands, the ideal environment for it, and what to stop forcing.",
               ["Your work-rhythm profile", "Ideal environment", "What to stop forcing"]),
        "zh": ("生产力风格", "你的工作节奏画像——深度工作者、冲刺者、连接者或组织者。你的精力实际落在哪里、最理想的环境是什么、以及需要停止勉强自己的事。",
               ["你的工作节奏画像", "理想的工作环境", "需要停止勉强自己的事"]),
        "ja": ("生産性スタイル", "あなたの仕事リズムプロファイル — ディープワーカー、スプリンター、コネクター、オーガナイザー。あなたのエネルギーが実際にどこに着地するか、それに最適な環境、そして無理して続けるのをやめるべきこと。",
               ["あなたの仕事リズムプロファイル", "理想的な環境", "無理して続けるのをやめるべきこと"]),
        "ko": ("생산성 스타일", "당신의 업무 리듬 프로파일 — 딥 워커, 스프린터, 커넥터, 오거나이저. 당신의 에너지가 실제로 어디에 안착하는지, 이상적인 환경, 그리고 억지로 밀어붙이기를 멈춰야 할 것.",
               ["당신의 업무 리듬 프로파일", "이상적인 환경", "억지로 밀어붙이기를 멈춰야 할 것"]),
    },
    {
        "key": "relationship-readiness",
        "min": "3",
        "en": ("Relationship Readiness", "Where you are in your readiness for partnership — ready, healing, avoiding, or rushing. Without judgment, with one thing to tend to first.",
               ["Where you are in readiness", "What to tend first", "Non-judgmental mirror"]),
        "zh": ("关系准备度", "你在伴侣关系准备度上的位置——已准备好、正在疗愈、回避中、或催促中。不带评判,告诉你最先需要照顾的一件事。",
               ["你目前所处的准备阶段", "最先需要呵护的部分", "不带评判的镜子"]),
        "ja": ("関係性レディネス", "パートナーシップへの準備度 — 準備完了、癒し中、回避中、または急いでいる。判断を含まず、最初に手を入れるべき一つのこと。",
               ["あなたの現在の準備段階", "最初にケアすべきこと", "判断を含まない鏡"]),
        "ko": ("관계 준비도", "파트너십에 대한 당신의 준비 단계 — 준비됨, 치유 중, 회피, 또는 서두름. 판단 없이, 가장 먼저 돌봐야 할 한 가지.",
               ["당신의 현재 준비 단계", "가장 먼저 돌봐야 할 것", "판단 없는 거울"]),
    },
    {
        "key": "wellness-type",
        "min": "3",
        "en": ("Wellness Type", "How you best restore — Athlete (move), Healer (deep self-care), Contemplative (stillness), or Balanced (mix). The tools that actually work for your nature, not the trends.",
               ["How you best restore", "Which tools work for you", "How to design your week"]),
        "zh": ("健康类型", "你最有效的恢复方式——运动型(动作)、疗愈型(深度自我照护)、沉思型(静止)或平衡型(混合)。真正适合你天性而非潮流的工具。",
               ["你最有效的恢复方式", "对你有用的工具", "如何设计你的一周"]),
        "ja": ("ウェルネスタイプ", "あなたの最も効果的な回復方法 — アスリート(動く)、ヒーラー(深いセルフケア)、コンテンプラティブ(静寂)、バランス(ミックス)。流行ではなく、あなたの本性に実際に合うツール。",
               ["あなたの最も効果的な回復方法", "あなたに合うツール", "一週間の設計の仕方"]),
        "ko": ("웰니스 타입", "당신의 가장 효과적인 회복 방식 — 애슬릿(움직임), 힐러(깊은 자기 돌봄), 컨템플라티브(고요함), 밸런스(혼합). 트렌드가 아닌 당신의 본성에 실제로 맞는 도구.",
               ["당신의 가장 효과적인 회복 방식", "당신에게 맞는 도구", "한 주를 설계하는 방법"]),
    },
]

TIME_LABELS = {
    "en": lambda n: f"{n} min",
    "zh": lambda n: f"{n} 分钟",
    "ja": lambda n: f"{n}分",
    "ko": lambda n: f"{n}분",
}


def update_locale(locale):
    path = f"{BASE}\\{locale}\\app.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f, object_pairs_hook=OrderedDict)
    extra = data.get("extraQuizzes")
    if extra is None:
        # Some locales might not have the namespace yet — create it.
        data["extraQuizzes"] = OrderedDict()
        extra = data["extraQuizzes"]
    added = 0
    updated = 0
    for entry in ENTRIES:
        key = entry["key"]
        title, desc, wyg = entry[locale]
        block = OrderedDict()
        block["title"] = title
        block["description"] = desc
        block["timeEstimate"] = TIME_LABELS[locale](entry["min"])
        block["whatYouGet"] = list(wyg)
        if key in extra:
            extra[key].update(block)
            updated += 1
        else:
            extra[key] = block
            added += 1
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"  {locale}: added {added}, updated {updated} (target {len(ENTRIES)})")
    return added + updated


total = 0
for locale in ["en", "zh", "ja", "ko"]:
    total += update_locale(locale)
print(f"\nTotal entries written: {total} (target {len(ENTRIES)*4})")
