#!/usr/bin/env python3
"""
Add the `ayurveda-dosha` entry to quizzes.definitions for ja/ko/zh
locales. The EN entry was added by hand earlier; this script writes
the three other locales with translated content.
"""
import json
from collections import OrderedDict

BASE = r"C:\Users\lmao\TAROT\src\i18n\locales"

ENTRIES = {
    "zh": {
        "title": "阿育吠陀体质",
        "description": "通过 30 道关于身体、心智与习惯的问题揭示你的主导体质 — 瓦塔(风/空)、皮塔(火/水)或卡法(土/水)。阿育吠陀是印度传统的身心整合医学;你的体质显示了你天性的默认表达方式,以及容易让你失去平衡的因素。",
        "timeEstimate": "5-7 分钟",
        "whatYouGet": [
            "你的主导体质(瓦塔、皮塔或卡法)",
            "如果是双重体质,你的次要体质",
            "真正适合你的饮食与生活方式建议",
            "你失衡的预警信号"
        ]
    },
    "ja": {
        "title": "アーユルヴェーダのドーシャ",
        "description": "身体、心、習慣に関する30の質問で、あなたの優勢なドーシャを明らかにします — ヴァータ(風/空)、ピッタ(火/水)、カパ(地/水)のいずれか。アーユルヴェーダはインドの伝統的な心身統合医学;ドーシャはあなたの本性が表れるデフォルトの方法と、バランスを崩す要因を示します。",
        "timeEstimate": "5〜7 分",
        "whatYouGet": [
            "あなたの主要ドーシャ(ヴァータ、ピッタ、カパ)",
            "二重タイプの場合の二次的ドーシャ",
            "あなたに本当に合う食事とライフスタイルのヒント",
            "バランスを崩しているときの警告サイン"
        ]
    },
    "ko": {
        "title": "아유르베다 도샤",
        "description": "몸, 마음, 습관에 대한 30개의 질문으로 당신의 주된 도샤를 밝혀냅니다 — 바타(공기/공간), 피타(불/물), 카파(흙/물). 아유르베다는 인도의 전통적인 심신 통합 의학; 도샤는 당신의 본성이 표현되는 기본 방식과 균형을 무너뜨리는 요인을 보여줍니다.",
        "timeEstimate": "5-7 분",
        "whatYouGet": [
            "당신의 주된 도샤 (바타, 피타, 카파)",
            "이중 타입인 경우 보조 도샤",
            "당신에게 실제로 맞는 식이 및 생활 습관 팁",
            "균형이 깨졌을 때의 경고 신호"
        ]
    }
}


def add_ayurveda(locale):
    path = f"{BASE}\\{locale}\\app.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f, object_pairs_hook=OrderedDict)
    defs = data["quizzes"]["definitions"]
    if "ayurveda-dosha" in defs:
        print(f"  {locale}: already present, skipping")
        return
    defs["ayurveda-dosha"] = OrderedDict(ENTRIES[locale])
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"  {locale}: added ayurveda-dosha")


for locale in ["zh", "ja", "ko"]:
    add_ayurveda(locale)
