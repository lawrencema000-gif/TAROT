#!/usr/bin/env python3
"""
Add the 57 keys missing from ja/ko/zh app.json with hand-crafted
translations. Categories: askOracle (10), bazi (19), dailyMission (4),
home.loveTree (2), moonstoneTopUp (13), moonstones (1),
premium.trialReminder (8). Total 57.
"""
import json
from collections import OrderedDict
from pathlib import Path

BASE = Path(r"C:\Users\lmao\TAROT\src\i18n\locales")

# (path, zh, ja, ko)
TRANSLATIONS = [
    # ── askOracle (10) ───────────────────────────────────────────────
    ("askOracle.cardLabel", "抽到的牌", "引いたカード", "뽑힌 카드"),
    ("askOracle.contextLabel", "你的问题", "あなたの質問", "당신의 질문"),
    ("askOracle.cta", "请神谕为我读这个", "オラクルに尋ねる", "오라클에게 묻기"),
    ("askOracle.drawing", "抽牌中…", "引いています…", "뽑는 중…"),
    ("askOracle.errorGeneric", "无法连接神谕,请重试。", "オラクルに接続できませんでした。もう一度お試しください。", "오라클에 연결할 수 없습니다. 다시 시도해주세요."),
    ("askOracle.question", "请为我解读 — {{context}}。它在我的生活中指向什么?", "私のために読んでください — {{context}}。今、私の人生で何を指し示していますか?", "이것을 저를 위해 읽어주세요 — {{context}}. 지금 제 삶에서 무엇을 가리키고 있나요?"),
    ("askOracle.redraw", "重新解读", "もう一度引く", "다시 읽기"),
    ("askOracle.share", "分享", "共有", "공유"),
    ("askOracle.sheetTitle", "神谕在解读", "オラクルの読み解き", "오라클의 해석"),
    ("askOracle.subtitle", "基于你的命盘与记忆的个性化解读", "あなたのチャートと記憶に基づくパーソナライズされたリーディング", "당신의 차트와 기억을 바탕으로 한 맞춤 리딩"),

    # ── bazi (19) ────────────────────────────────────────────────────
    ("bazi.chartTypeLabel", "命盘类型", "チャートの種類", "차트 유형"),
    ("bazi.hiddenInfluencesLabel", "藏干影响", "蔵干の影響", "지장간 영향"),
    ("bazi.hiddenInfluencesSub", "每个地支携带 1–3 个隐藏天干,默默塑造该柱的能量。", "各地支は1〜3個の追加の天干を運び、柱を静かに形作ります。", "각 지지는 1-3개의 추가 천간을 품어 기둥을 조용히 형성합니다."),
    ("bazi.innerForcesLabel", "内在力量", "内なる力", "내적인 힘"),
    ("bazi.innerForcesSub", "每柱相对于你的内在元素映射到经典的十神原型。", "各柱はあなたの内なる元素に対する古典的な十神の原型に対応します。", "각 기둥은 당신의 내적 원소를 기준으로 한 고전적 십신 원형에 매핑됩니다."),
    ("bazi.luckyColorTodayLabel", "今日幸运色", "今日のラッキーカラー", "오늘의 행운 색상"),
    ("bazi.luckyNumbersLabel", "幸运数字", "ラッキーナンバー", "행운의 숫자"),
    ("bazi.nayinLabel", "你年柱的纳音", "年柱の納音(魂の音)", "연주의 납음"),
    ("bazi.premiumTeaserBody", "解锁你的内在力量(经典十神)、藏干影响、纳音、辅助元素及其幸运色、方位、数字,以及今日幸运色组件。", "あなたの内なる力(古典十神)、蔵干の影響、納音、サポート元素とそのラッキーカラー・方角・数字、今日のラッキーカラーウィジェットをアンロック。", "당신의 내적인 힘(고전 십신), 지장간 영향, 납음, 보조 원소와 그 행운 색상·방향·숫자, 오늘의 행운 색상 위젯을 잠금 해제."),
    ("bazi.premiumTeaserCta", "查看高级版", "プレミアムを見る", "프리미엄 보기"),
    ("bazi.premiumTeaserTitle", "用高级版深入了解", "プレミアムでさらに深く", "프리미엄으로 더 깊이"),
    ("bazi.strength.balanced.desc", "你的命盘自成平衡——元素之间相互呼应,处于较合理的均衡。", "あなたのチャートは自立しています — 元素同士が穏やかなバランスで出会っています。", "당신의 차트는 스스로 균형을 잡고 있습니다 — 원소들이 합리적인 균형으로 만납니다."),
    ("bazi.strength.balanced.name", "平衡", "バランス", "균형"),
    ("bazi.strength.receptive.desc", "你的日主元素偏弱。你容易接收和吸收;成长边在于主张和自我滋养。", "あなたの日主元素は控えめです。受け止め吸収しやすく、成長の縁は主張と自己源泉化にあります。", "당신의 일주 원소는 약합니다. 받아들이고 흡수하기 쉽고, 성장의 가장자리는 주장과 자기 자원화에 있습니다."),
    ("bazi.strength.receptive.name", "接收型", "受容型", "수용형"),
    ("bazi.strength.strong.desc", "你的日主元素偏旺。你自然主张;成长边在于流动与释放。", "あなたの日主元素は豊かです。自然に主張でき、成長の縁は流れと手放しにあります。", "당신의 일주 원소는 강합니다. 자연스럽게 주장하며, 성장의 가장자리는 흐름과 놓아줌에 있습니다."),
    ("bazi.strength.strong.name", "主导型", "ドミナント", "지배적"),
    ("bazi.supportingLabel", "你的辅助元素", "あなたのサポート元素", "당신의 보조 원소"),
    ("bazi.supportingSub", "你的命盘倾向于这个元素以求平衡——穿它的颜色、面向它的方位、记住它的数字。", "あなたのチャートがバランスのために傾く元素 — その色を着て、その方角を向き、その数字を身近に。", "당신의 차트가 균형을 위해 기우는 원소 — 그 색을 입고, 그 방향을 향하고, 그 숫자를 가까이."),

    # ── dailyMission (4) ─────────────────────────────────────────────
    ("dailyMission.doneSub", "新任务将于午夜到来。", "新しいミッションは深夜0時に届きます。", "새로운 미션은 자정에 도착합니다."),
    ("dailyMission.doneTitle", "完成。做得好。", "完了。お見事です。", "완료. 잘하셨어요."),
    ("dailyMission.label", "今日任务", "今日のミッション", "오늘의 미션"),
    ("dailyMission.markDone", "标记完成", "完了にする", "완료로 표시"),

    # ── home.loveTree (2) ────────────────────────────────────────────
    ("home.loveTreeSub", "90 秒,12 道题 → 你的依恋风格化为一棵活树。", "90秒、12問 → あなたの愛着スタイルが生きた木として現れます。", "90초, 12문항 → 당신의 애착 스타일이 살아있는 나무로 나타납니다."),
    ("home.loveTreeTitle", "爱之树", "愛の木", "사랑의 나무"),

    # ── moonstoneTopUp (13) ──────────────────────────────────────────
    ("moonstoneTopUp.generic", "购买失败", "購入に失敗しました", "구매 실패"),
    ("moonstoneTopUp.packLabel.devotee", "信徒包", "デヴォーティー", "디보티"),
    ("moonstoneTopUp.packLabel.generous", "豪华包", "ジェネラス", "제너러스"),
    ("moonstoneTopUp.packLabel.regular", "常规包", "レギュラー", "레귤러"),
    ("moonstoneTopUp.packLabel.starter", "入门包", "スターター", "스타터"),
    ("moonstoneTopUp.packNotFound", "该套餐在商店中不可用。", "このパックはストアで利用できません。", "이 팩은 스토어에서 사용할 수 없습니다."),
    ("moonstoneTopUp.playStorePurchase", "通过 Google Play 收费,在你的 Google 账号中管理购买。", "Google Play で請求されます。Google アカウントで購入を管理してください。", "Google Play에서 청구됩니다. Google 계정에서 구매를 관리하세요."),
    ("moonstoneTopUp.popular", "热门", "人気", "인기"),
    ("moonstoneTopUp.securePayment", "由 Stripe 提供的安全结账。一次性购买——可随时取消。", "Stripe による安全な決済。一回限りの購入 — いつでもキャンセル可能。", "Stripe로 안전하게 결제. 일회성 구매 — 언제든 취소 가능."),
    ("moonstoneTopUp.stripeFailed", "无法打开结账", "決済を開けませんでした", "결제를 열 수 없습니다"),
    ("moonstoneTopUp.subtitle", "解锁解读、给直播主播打赏、预约顾问咨询。", "リーディングをアンロック、ライブホストにチップ、アドバイザーセッションの予約。", "리딩 잠금 해제, 라이브 호스트 팁 보내기, 어드바이저 세션 예약."),
    ("moonstoneTopUp.success", "{{n}} 月光石正在路上 — 几秒钟就到。", "{{n}} のムーンストーンが届きます — 数秒でアカウントに反映されます。", "{{n}}개의 문스톤이 도착합니다 — 몇 초 안에 계정에 반영됩니다."),
    ("moonstoneTopUp.title", "充值月光石", "ムーンストーンをチャージ", "문스톤 충전"),

    # ── moonstones (1) ───────────────────────────────────────────────
    ("moonstones.topUp", "充值", "チャージ", "충전"),

    # ── premium.trialReminder (8) ────────────────────────────────────
    ("premium.trialReminder.badge", "3 天免费", "3日間無料", "3일 무료"),
    ("premium.trialReminder.benefits.adFree", "完全无广告", "広告完全なし", "광고 완전 제거"),
    ("premium.trialReminder.benefits.allFeatures", "解锁全部高级功能", "プレミアム機能をすべてアンロック", "모든 프리미엄 기능 잠금 해제"),
    ("premium.trialReminder.benefits.cancelAnytime", "可随时取消,无需付费", "いつでもキャンセル可、課金なし", "언제든 취소 가능, 요금 없음"),
    ("premium.trialReminder.cta", "开始免费试用", "無料トライアルを始める", "무료 체험 시작"),
    ("premium.trialReminder.dismiss", "稍后再说", "あとで", "나중에"),
    ("premium.trialReminder.subtitle", "免费解锁全部 3 天,之后 $19.99/年。可随时取消。", "3日間すべてアンロック、その後 $19.99/年。いつでもキャンセル可。", "3일 동안 모두 잠금 해제, 이후 $19.99/년. 언제든 취소 가능."),
    ("premium.trialReminder.title", "免费试用高级版 3 天", "プレミアムを3日間無料で試す", "프리미엄을 3일 무료로 체험"),
]


def set_path(d, path, value):
    """Set d[a][b][c] = value where path = 'a.b.c'. Creates intermediate
    dicts as needed, preserving OrderedDict insertion order."""
    keys = path.split(".")
    for k in keys[:-1]:
        if k not in d or not isinstance(d[k], dict):
            d[k] = OrderedDict()
        d = d[k]
    d[keys[-1]] = value


for locale, idx in [("zh", 1), ("ja", 2), ("ko", 3)]:
    path = BASE / locale / "app.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f, object_pairs_hook=OrderedDict)
    for entry in TRANSLATIONS:
        key, *vals = entry
        set_path(data, key, vals[idx - 1])
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"  {locale}: {len(TRANSLATIONS)} keys added/updated")
print(f"\nTotal: {len(TRANSLATIONS) * 3} translations applied")
