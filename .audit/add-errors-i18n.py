"""Add errorBoundary.*, astrology.errors.*, savedSheet.*, errorUX.*
translations to all 4 locales."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA = {
    'en': {
        'errorBoundary': {
            'title': 'The Stars Have Shifted',
            'message': 'Something unexpected disrupted your cosmic journey. The universe works in mysterious ways, but we can try again.',
            'tryAgain': 'Try Again',
            'returnHome': 'Return Home',
            'viewDiagnostics': 'View Diagnostics',
            'hideDetails': 'Hide Details',
            'showDetails': 'Show Details',
            'errorDetails': 'Error Details',
            'copy': 'Copy',
            'copied': 'Copied',
            'tailFooter': 'If this continues, the cosmos may need a moment to realign.',
            'networkTitle': 'Connection Lost to the Stars',
            'networkMessage': "We couldn't reach the cosmic servers. Check your connection and try again when the path is clear.",
            'notFoundTitle': 'This Path Leads Nowhere',
            'notFoundMessage': 'The page you seek has vanished into the void. Perhaps the stars have a different destination in mind.',
        },
        'astrologyErrors': {
            'noChart': 'No chart found',
            'loadChart': 'Failed to load chart',
            'computeChart': 'Failed to compute chart',
            'dailyHoroscope': 'Failed to load daily horoscope',
            'weeklyForecast': 'Failed to load weekly forecast',
            'monthlyForecast': 'Failed to load monthly forecast',
            'transits': 'Failed to load transits',
        },
        'savedSheet': {
            'threeCardSpread': 'Three Card Spread',
            'morningReflection': 'Morning Reflection',
            'morningReflectionSub': 'Gratitude and intentions',
            'loveLanguageResult': 'Love Language Result',
            'wordsOfAffirmation': 'Words of Affirmation',
        },
    },
    'ja': {
        'errorBoundary': {
            'title': '星々が移り変わりました',
            'message': '予期せぬ出来事があなたの宇宙の旅を妨げました。宇宙は不思議な仕方で働きますが、もう一度試せます。',
            'tryAgain': 'もう一度試す',
            'returnHome': 'ホームに戻る',
            'viewDiagnostics': '診断を表示',
            'hideDetails': '詳細を隠す',
            'showDetails': '詳細を表示',
            'errorDetails': 'エラーの詳細',
            'copy': 'コピー',
            'copied': 'コピーしました',
            'tailFooter': 'これが続くようなら、宇宙が再調整する時間が必要かもしれません。',
            'networkTitle': '星々への接続が途絶えました',
            'networkMessage': '宇宙のサーバーに到達できませんでした。接続を確認し、道がクリアになったら再試行してください。',
            'notFoundTitle': 'この道は行き止まりです',
            'notFoundMessage': 'あなたが探しているページは消えてしまいました。星々は異なる目的地を心に描いているのかもしれません。',
        },
        'astrologyErrors': {
            'noChart': 'チャートが見つかりません',
            'loadChart': 'チャートの読み込みに失敗しました',
            'computeChart': 'チャートの計算に失敗しました',
            'dailyHoroscope': 'デイリー占いの読み込みに失敗しました',
            'weeklyForecast': '週間予報の読み込みに失敗しました',
            'monthlyForecast': '月間予報の読み込みに失敗しました',
            'transits': 'トランジットの読み込みに失敗しました',
        },
        'savedSheet': {
            'threeCardSpread': '3枚スプレッド',
            'morningReflection': '朝のリフレクション',
            'morningReflectionSub': '感謝と意図',
            'loveLanguageResult': '愛の言語の結果',
            'wordsOfAffirmation': '肯定の言葉',
        },
    },
    'ko': {
        'errorBoundary': {
            'title': '별들이 움직였습니다',
            'message': '예기치 않은 일이 당신의 우주 여행을 방해했습니다. 우주는 신비롭게 작동하지만, 다시 시도할 수 있습니다.',
            'tryAgain': '다시 시도',
            'returnHome': '홈으로',
            'viewDiagnostics': '진단 보기',
            'hideDetails': '세부 숨기기',
            'showDetails': '세부 보기',
            'errorDetails': '오류 세부 정보',
            'copy': '복사',
            'copied': '복사됨',
            'tailFooter': '계속 발생하면, 우주가 재조정할 시간이 필요할지도 모릅니다.',
            'networkTitle': '별들과의 연결이 끊어졌습니다',
            'networkMessage': '우주의 서버에 도달할 수 없었습니다. 연결을 확인하고 길이 맑아지면 다시 시도하세요.',
            'notFoundTitle': '이 길은 막다른 길입니다',
            'notFoundMessage': '당신이 찾는 페이지는 공허 속으로 사라졌습니다. 별들이 다른 목적지를 염두에 두고 있는지도 모릅니다.',
        },
        'astrologyErrors': {
            'noChart': '차트를 찾을 수 없습니다',
            'loadChart': '차트 불러오기 실패',
            'computeChart': '차트 계산 실패',
            'dailyHoroscope': '일일 운세 불러오기 실패',
            'weeklyForecast': '주간 예보 불러오기 실패',
            'monthlyForecast': '월간 예보 불러오기 실패',
            'transits': '트랜짓 불러오기 실패',
        },
        'savedSheet': {
            'threeCardSpread': '세 장 스프레드',
            'morningReflection': '아침 성찰',
            'morningReflectionSub': '감사와 의도',
            'loveLanguageResult': '사랑의 언어 결과',
            'wordsOfAffirmation': '인정하는 말',
        },
    },
    'zh': {
        'errorBoundary': {
            'title': '星辰已经移位',
            'message': '意外的事情打断了你的宇宙旅程。宇宙以神秘的方式运作，但我们可以再试一次。',
            'tryAgain': '再试一次',
            'returnHome': '返回首页',
            'viewDiagnostics': '查看诊断',
            'hideDetails': '隐藏详情',
            'showDetails': '显示详情',
            'errorDetails': '错误详情',
            'copy': '复制',
            'copied': '已复制',
            'tailFooter': '如果情况持续，宇宙可能需要时间重新对齐。',
            'networkTitle': '与星辰的连接已中断',
            'networkMessage': '我们无法到达宇宙服务器。请检查你的连接，道路畅通时再试。',
            'notFoundTitle': '此路不通',
            'notFoundMessage': '你寻找的页面已消失于虚空。也许星辰心中另有目的地。',
        },
        'astrologyErrors': {
            'noChart': '未找到星盘',
            'loadChart': '星盘加载失败',
            'computeChart': '星盘计算失败',
            'dailyHoroscope': '每日运势加载失败',
            'weeklyForecast': '每周预报加载失败',
            'monthlyForecast': '每月预报加载失败',
            'transits': '过境加载失败',
        },
        'savedSheet': {
            'threeCardSpread': '三张牌阵',
            'morningReflection': '晨间反思',
            'morningReflectionSub': '感恩与意图',
            'loveLanguageResult': '爱的语言结果',
            'wordsOfAffirmation': '肯定的话语',
        },
    },
}

for lang in ['en', 'ja', 'ko', 'zh']:
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    for group, strings in DATA[lang].items():
        d[group] = strings
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: errorBoundary, astrologyErrors, savedSheet added')
