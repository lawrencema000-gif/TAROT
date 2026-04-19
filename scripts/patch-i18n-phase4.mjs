import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

// Phase 4: Premium sheets (PaywallSheet, PremiumGate, SubscriptionSheet, WatchAdSheet).
// Extends the existing premium.* block with paywall, gate, subscription, watchAd sub-blocks.
// Idempotent: re-running overwrites these sub-blocks with the latest strings.

const additions = {
  en: {
    badge: 'Premium',
    paywall: {
      heading: 'Unlock the Full Deck',
      subheading: 'Deeper spreads, unlimited saves, compatibility insights & more',
      featureRequires: '{{feature}} requires Premium',
      whatYouUnlock: 'What You Unlock',
      loadingPrices: 'Loading prices...',
      unlocks: {
        adFree: { label: 'Ad-Free Experience', desc: 'No interruptions, pure focus' },
        allSpreads: { label: 'All Tarot Spreads', desc: 'Celtic Cross, 3-Card & more' },
        unlimitedSaves: { label: 'Unlimited Saves', desc: 'Keep every insight forever' },
        compatibility: { label: 'Full Compatibility', desc: 'Deep partner analysis' },
        deepInterpretations: { label: 'Deep Interpretations', desc: 'Personalized guidance' },
        guidedPrompts: { label: 'Guided Prompts', desc: 'AI-crafted reflections' },
        birthChart: { label: 'Birth Chart', desc: 'Your cosmic blueprint' },
      },
      plans: {
        monthly: 'Monthly',
        yearly: 'Yearly',
        lifetime: 'Lifetime',
      },
      periods: {
        month: '/month',
        year: '/year',
        oneTime: 'one-time',
      },
      badges: {
        bestValue: 'Best Value',
        foreverAccess: 'Forever Access',
      },
      cta: {
        notAvailable: 'Premium Not Available',
        getLifetime: 'Get Lifetime Access',
        subscribeNow: 'Subscribe Now',
      },
      restorePurchase: 'Restore Purchase',
      errors: {
        loadFailed: 'Unable to load pricing. Please check your connection.',
        notAvailableTitle: 'Premium Not Available',
        notAvailableDesc: 'RevenueCat offerings need to be configured. Purchases are disabled until setup is complete.',
      },
      disclaimers: {
        lifetime: 'One-time purchase. No recurring charges. Lifetime access to all premium features.',
        subscription: 'Cancel anytime. Payment will be charged to your account. Subscription automatically renews unless canceled at least 24 hours before the end of the current period.',
      },
      toasts: {
        productsUnavailable: 'Products not available. Please try again later.',
        welcome: 'Welcome to Premium!',
        purchaseFailed: 'Purchase failed',
        purchasesRestored: 'Purchases restored!',
        noPurchases: 'No purchases found',
        restoreFailed: 'Restore failed',
      },
    },
    gate: {
      watchAdToTry: 'Watch Ad to Try',
      unlockPremium: 'Unlock Premium',
    },
    subscription: {
      heading: 'Premium Active',
      subheading: 'You have full access to all premium features',
      planTitle: 'Premium Plan',
      memberFallback: 'Member',
      status: 'Status',
      statusActive: 'Active',
      billing: 'Billing',
      billingGooglePlay: 'Google Play',
      yourBenefits: 'Your Premium Benefits',
      manageOnGooglePlay: 'Manage on Google Play',
      syncStatus: 'Sync Subscription Status',
      disclaimer: 'To cancel or modify your subscription, use the Google Play Store app or website. Changes may take a few minutes to reflect in the app.',
      features: {
        adFree: 'Ad-Free Experience',
        allSpreads: 'All Tarot Spreads',
        unlimitedSaves: 'Unlimited Saves',
        compatibility: 'Full Compatibility',
        deepInterpretations: 'Deep Interpretations',
        guidedPrompts: 'Guided Prompts',
        birthChart: 'Birth Chart',
      },
      toasts: {
        verified: 'Subscription verified!',
        active: 'Subscription is active',
        verifyFailed: 'Could not verify subscription',
      },
    },
    watchAd: {
      defaultTitle: 'Try {{feature}}',
      defaultSubtitle: 'Watch a short ad to unlock this premium feature for one use',
      contexts: {
        extraReading: {
          title: 'Get an Extra Reading',
          subtitle: 'Watch a short ad to unlock one more tarot reading today',
        },
        deepInterpretations: {
          title: 'Unlock Extended Interpretation',
          subtitle: 'Watch a short ad for a deeper look into your cards',
        },
      },
      unlocksRemaining: '{{remaining}} of {{total}} free unlocks remaining today',
      watchAdToUnlock: 'Watch Ad to Unlock',
      usedAllUnlocks: "You've used all free unlocks for today",
      comeBackTomorrow: 'Come back tomorrow or upgrade to Premium',
      getUnlimited: 'Get Unlimited Access',
      notNow: 'Not now',
      footerDisclaimer: 'Premium members get unlimited access to all features with no ads',
      toasts: {
        unlocked: 'Feature unlocked! Enjoy your free trial.',
        notAvailable: 'Ad not available. Please try again.',
        error: 'Something went wrong. Please try again.',
      },
    },
  },
  ja: {
    badge: 'プレミアム',
    paywall: {
      heading: '全てのカードを解き放つ',
      subheading: '深いスプレッド、無制限の保存、相性分析など',
      featureRequires: '{{feature}}にはプレミアムが必要です',
      whatYouUnlock: '解放される機能',
      loadingPrices: '価格を読み込み中...',
      unlocks: {
        adFree: { label: '広告なし体験', desc: '中断のない純粋な集中' },
        allSpreads: { label: '全タロットスプレッド', desc: 'ケルト十字、3枚引きなど' },
        unlimitedSaves: { label: '無制限の保存', desc: 'すべての洞察を永遠に保存' },
        compatibility: { label: 'フル相性診断', desc: '深いパートナー分析' },
        deepInterpretations: { label: '深い解釈', desc: 'あなただけのガイダンス' },
        guidedPrompts: { label: 'ガイド付きプロンプト', desc: 'AIが紡ぐ内省の言葉' },
        birthChart: { label: 'バースチャート', desc: 'あなたの宇宙の設計図' },
      },
      plans: {
        monthly: '月額',
        yearly: '年額',
        lifetime: '買い切り',
      },
      periods: {
        month: '/月',
        year: '/年',
        oneTime: '一括',
      },
      badges: {
        bestValue: 'ベストバリュー',
        foreverAccess: '永久アクセス',
      },
      cta: {
        notAvailable: 'プレミアムは現在ご利用いただけません',
        getLifetime: '買い切りで入手する',
        subscribeNow: '今すぐ登録',
      },
      restorePurchase: '購入を復元',
      errors: {
        loadFailed: '価格を読み込めません。接続をご確認ください。',
        notAvailableTitle: 'プレミアムは現在ご利用いただけません',
        notAvailableDesc: 'RevenueCatの設定が必要です。セットアップ完了まで購入は無効です。',
      },
      disclaimers: {
        lifetime: '一度限りのお支払い。継続課金はありません。すべてのプレミアム機能に永久アクセスできます。',
        subscription: 'いつでもキャンセル可能。お支払いはアカウントに請求されます。期間終了の24時間以上前にキャンセルしない限り、サブスクリプションは自動更新されます。',
      },
      toasts: {
        productsUnavailable: '商品を読み込めませんでした。時間をおいて再度お試しください。',
        welcome: 'プレミアムへようこそ!',
        purchaseFailed: '購入に失敗しました',
        purchasesRestored: '購入を復元しました!',
        noPurchases: '購入履歴が見つかりませんでした',
        restoreFailed: '復元に失敗しました',
      },
    },
    gate: {
      watchAdToTry: '広告を見て試す',
      unlockPremium: 'プレミアムを解除',
    },
    subscription: {
      heading: 'プレミアム有効',
      subheading: 'すべてのプレミアム機能をフルにご利用いただけます',
      planTitle: 'プレミアムプラン',
      memberFallback: 'メンバー',
      status: 'ステータス',
      statusActive: '有効',
      billing: 'お支払い方法',
      billingGooglePlay: 'Google Play',
      yourBenefits: 'プレミアム特典',
      manageOnGooglePlay: 'Google Playで管理',
      syncStatus: 'サブスクリプション状態を同期',
      disclaimer: 'サブスクリプションの解約・変更は、Google Playストアアプリまたはウェブサイトから行ってください。変更の反映には数分かかる場合があります。',
      features: {
        adFree: '広告なし体験',
        allSpreads: '全タロットスプレッド',
        unlimitedSaves: '無制限の保存',
        compatibility: 'フル相性診断',
        deepInterpretations: '深い解釈',
        guidedPrompts: 'ガイド付きプロンプト',
        birthChart: 'バースチャート',
      },
      toasts: {
        verified: 'サブスクリプションを確認しました!',
        active: 'サブスクリプションは有効です',
        verifyFailed: 'サブスクリプションを確認できませんでした',
      },
    },
    watchAd: {
      defaultTitle: '{{feature}}を試す',
      defaultSubtitle: '短い広告を見ると、このプレミアム機能を1回だけ解放できます',
      contexts: {
        extraReading: {
          title: 'もう1回リーディングを取得',
          subtitle: '短い広告を見ると、今日もう1回タロットリーディングを解放できます',
        },
        deepInterpretations: {
          title: '拡張解釈を解放',
          subtitle: '短い広告を見ると、カードをより深く読み解けます',
        },
      },
      unlocksRemaining: '本日の無料解放: 残り{{remaining}}/{{total}}回',
      watchAdToUnlock: '広告を見て解放',
      usedAllUnlocks: '本日の無料解放はすべて使用済みです',
      comeBackTomorrow: '明日また来るか、プレミアムにアップグレード',
      getUnlimited: '無制限アクセスを取得',
      notNow: '後で',
      footerDisclaimer: 'プレミアム会員は広告なしで全機能を無制限にご利用いただけます',
      toasts: {
        unlocked: '機能を解放しました!無料トライアルをお楽しみください。',
        notAvailable: '広告を表示できませんでした。もう一度お試しください。',
        error: 'エラーが発生しました。もう一度お試しください。',
      },
    },
  },
  ko: {
    badge: '프리미엄',
    paywall: {
      heading: '전체 덱을 잠금 해제',
      subheading: '더 깊은 스프레드, 무제한 저장, 궁합 인사이트까지',
      featureRequires: '{{feature}}은(는) 프리미엄이 필요합니다',
      whatYouUnlock: '잠금 해제되는 기능',
      loadingPrices: '가격을 불러오는 중...',
      unlocks: {
        adFree: { label: '광고 없는 경험', desc: '방해 없이 온전한 몰입' },
        allSpreads: { label: '모든 타로 스프레드', desc: '켈틱 크로스, 3카드 외 다수' },
        unlimitedSaves: { label: '무제한 저장', desc: '모든 통찰을 영원히 보관' },
        compatibility: { label: '전체 궁합 분석', desc: '깊이 있는 상대 분석' },
        deepInterpretations: { label: '심층 해석', desc: '나만의 맞춤 안내' },
        guidedPrompts: { label: '가이드 프롬프트', desc: 'AI가 엮은 성찰' },
        birthChart: { label: '출생 차트', desc: '당신의 우주적 설계도' },
      },
      plans: {
        monthly: '월간',
        yearly: '연간',
        lifetime: '평생',
      },
      periods: {
        month: '/월',
        year: '/년',
        oneTime: '일회성',
      },
      badges: {
        bestValue: '최고의 가치',
        foreverAccess: '평생 이용',
      },
      cta: {
        notAvailable: '프리미엄을 사용할 수 없습니다',
        getLifetime: '평생 이용권 구매',
        subscribeNow: '지금 구독하기',
      },
      restorePurchase: '구매 복원',
      errors: {
        loadFailed: '가격을 불러올 수 없습니다. 연결 상태를 확인해 주세요.',
        notAvailableTitle: '프리미엄을 사용할 수 없습니다',
        notAvailableDesc: 'RevenueCat 오퍼링이 설정되어야 합니다. 설정이 완료될 때까지 구매가 비활성화됩니다.',
      },
      disclaimers: {
        lifetime: '일회성 결제. 반복 청구 없음. 모든 프리미엄 기능을 평생 이용할 수 있습니다.',
        subscription: '언제든지 해지할 수 있습니다. 결제는 계정으로 청구됩니다. 현재 기간 종료 24시간 전까지 해지하지 않으면 구독이 자동 갱신됩니다.',
      },
      toasts: {
        productsUnavailable: '상품을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.',
        welcome: '프리미엄에 오신 것을 환영합니다!',
        purchaseFailed: '구매에 실패했습니다',
        purchasesRestored: '구매가 복원되었습니다!',
        noPurchases: '구매 내역을 찾을 수 없습니다',
        restoreFailed: '복원에 실패했습니다',
      },
    },
    gate: {
      watchAdToTry: '광고 보고 체험하기',
      unlockPremium: '프리미엄 잠금 해제',
    },
    subscription: {
      heading: '프리미엄 활성화됨',
      subheading: '모든 프리미엄 기능에 완전히 접근할 수 있습니다',
      planTitle: '프리미엄 플랜',
      memberFallback: '회원',
      status: '상태',
      statusActive: '활성',
      billing: '결제 수단',
      billingGooglePlay: 'Google Play',
      yourBenefits: '프리미엄 혜택',
      manageOnGooglePlay: 'Google Play에서 관리',
      syncStatus: '구독 상태 동기화',
      disclaimer: '구독을 해지하거나 변경하려면 Google Play 스토어 앱 또는 웹사이트를 이용하세요. 변경 사항이 앱에 반영되기까지 몇 분 정도 걸릴 수 있습니다.',
      features: {
        adFree: '광고 없는 경험',
        allSpreads: '모든 타로 스프레드',
        unlimitedSaves: '무제한 저장',
        compatibility: '전체 궁합 분석',
        deepInterpretations: '심층 해석',
        guidedPrompts: '가이드 프롬프트',
        birthChart: '출생 차트',
      },
      toasts: {
        verified: '구독이 확인되었습니다!',
        active: '구독이 활성 상태입니다',
        verifyFailed: '구독을 확인할 수 없습니다',
      },
    },
    watchAd: {
      defaultTitle: '{{feature}} 체험하기',
      defaultSubtitle: '짧은 광고를 시청하면 이 프리미엄 기능을 1회 사용할 수 있습니다',
      contexts: {
        extraReading: {
          title: '리딩 1회 더 받기',
          subtitle: '짧은 광고를 시청하면 오늘 타로 리딩을 1회 더 받을 수 있습니다',
        },
        deepInterpretations: {
          title: '확장 해석 잠금 해제',
          subtitle: '짧은 광고를 시청하면 카드를 더 깊이 들여다볼 수 있습니다',
        },
      },
      unlocksRemaining: '오늘 남은 무료 해제: {{remaining}}/{{total}}회',
      watchAdToUnlock: '광고 보고 잠금 해제',
      usedAllUnlocks: '오늘 무료 해제 횟수를 모두 사용했습니다',
      comeBackTomorrow: '내일 다시 오거나 프리미엄으로 업그레이드하세요',
      getUnlimited: '무제한 이용권 받기',
      notNow: '나중에',
      footerDisclaimer: '프리미엄 회원은 광고 없이 모든 기능을 무제한으로 이용할 수 있습니다',
      toasts: {
        unlocked: '기능이 잠금 해제되었습니다! 무료 체험을 즐겨보세요.',
        notAvailable: '광고를 표시할 수 없습니다. 다시 시도해 주세요.',
        error: '문제가 발생했습니다. 다시 시도해 주세요.',
      },
    },
  },
  zh: {
    badge: '高级版',
    paywall: {
      heading: '解锁完整牌组',
      subheading: '更深度的牌阵、无限保存、合盘洞察等等',
      featureRequires: '{{feature}}需要高级版',
      whatYouUnlock: '你将解锁',
      loadingPrices: '正在加载价格...',
      unlocks: {
        adFree: { label: '无广告体验', desc: '纯粹专注,毫无打扰' },
        allSpreads: { label: '全部塔罗牌阵', desc: '凯尔特十字、三张牌阵等' },
        unlimitedSaves: { label: '无限保存', desc: '永久保留每一份洞察' },
        compatibility: { label: '完整合盘', desc: '深入分析伴侣关系' },
        deepInterpretations: { label: '深度解读', desc: '量身定制的指引' },
        guidedPrompts: { label: '引导式提示', desc: 'AI 精心打造的内省' },
        birthChart: { label: '本命盘', desc: '你的宇宙蓝图' },
      },
      plans: {
        monthly: '月度',
        yearly: '年度',
        lifetime: '终身',
      },
      periods: {
        month: '/月',
        year: '/年',
        oneTime: '一次性',
      },
      badges: {
        bestValue: '最超值',
        foreverAccess: '永久使用',
      },
      cta: {
        notAvailable: '高级版暂不可用',
        getLifetime: '获取终身权限',
        subscribeNow: '立即订阅',
      },
      restorePurchase: '恢复购买',
      errors: {
        loadFailed: '无法加载价格,请检查网络连接。',
        notAvailableTitle: '高级版暂不可用',
        notAvailableDesc: 'RevenueCat 产品尚未配置,购买将暂时停用,直到配置完成。',
      },
      disclaimers: {
        lifetime: '一次性付款,无自动续费。永久使用所有高级功能。',
        subscription: '可随时取消。费用将从你的账户扣除。除非在当前周期结束前至少24小时取消,否则订阅将自动续订。',
      },
      toasts: {
        productsUnavailable: '产品暂不可用,请稍后再试。',
        welcome: '欢迎加入高级版!',
        purchaseFailed: '购买失败',
        purchasesRestored: '已恢复购买!',
        noPurchases: '未找到购买记录',
        restoreFailed: '恢复失败',
      },
    },
    gate: {
      watchAdToTry: '观看广告试用',
      unlockPremium: '解锁高级版',
    },
    subscription: {
      heading: '高级版已激活',
      subheading: '你拥有所有高级功能的完整权限',
      planTitle: '高级版方案',
      memberFallback: '会员',
      status: '状态',
      statusActive: '已激活',
      billing: '付款方式',
      billingGooglePlay: 'Google Play',
      yourBenefits: '你的高级权益',
      manageOnGooglePlay: '在 Google Play 管理',
      syncStatus: '同步订阅状态',
      disclaimer: '如需取消或修改订阅,请使用 Google Play 商店应用或网页。变更可能需要几分钟才会在应用中生效。',
      features: {
        adFree: '无广告体验',
        allSpreads: '全部塔罗牌阵',
        unlimitedSaves: '无限保存',
        compatibility: '完整合盘',
        deepInterpretations: '深度解读',
        guidedPrompts: '引导式提示',
        birthChart: '本命盘',
      },
      toasts: {
        verified: '订阅已验证!',
        active: '订阅处于激活状态',
        verifyFailed: '无法验证订阅',
      },
    },
    watchAd: {
      defaultTitle: '试用{{feature}}',
      defaultSubtitle: '观看一则短广告即可解锁此高级功能一次',
      contexts: {
        extraReading: {
          title: '获取额外一次解读',
          subtitle: '观看一则短广告,今日再解锁一次塔罗解读',
        },
        deepInterpretations: {
          title: '解锁扩展解读',
          subtitle: '观看一则短广告,获得更深入的牌面解读',
        },
      },
      unlocksRemaining: '今日剩余免费解锁次数:{{remaining}}/{{total}}',
      watchAdToUnlock: '观看广告解锁',
      usedAllUnlocks: '今日免费解锁次数已用完',
      comeBackTomorrow: '明天再来或升级到高级版',
      getUnlimited: '获取无限访问',
      notNow: '暂不',
      footerDisclaimer: '高级会员可无广告无限制使用全部功能',
      toasts: {
        unlocked: '功能已解锁!享受你的免费试用。',
        notAvailable: '广告暂不可用,请稍后再试。',
        error: '出错了,请稍后再试。',
      },
    },
  },
};

for (const [lang, block] of Object.entries(additions)) {
  const file = path.join(localesDir, lang, 'app.json');
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.premium = { ...(j.premium || {}), ...block };
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`Patched ${lang}/app.json — premium block extended (paywall, gate, subscription, watchAd)`);
}
