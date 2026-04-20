"""Add library.* chrome strings (Loading, Load more, Continue exploring, etc)."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

CHROME = {
    'en': {
        'loading': 'Loading...',
        'loadMoreSpreads': 'Load more spreads',
        'loadMoreSaved': 'Load more saved items',
        'loadMoreReadings': 'Load more readings',
        'contentComingSoon': 'Content coming soon...',
        'continueExploring': 'Continue exploring the guides to deepen your spiritual practice',
    },
    'ja': {
        'loading': '読み込み中...',
        'loadMoreSpreads': 'さらにスプレッドを表示',
        'loadMoreSaved': 'さらに保存したアイテムを表示',
        'loadMoreReadings': 'さらにリーディングを表示',
        'contentComingSoon': 'コンテンツ準備中...',
        'continueExploring': 'ガイドを探求し続け、精神的な実践を深めましょう',
    },
    'ko': {
        'loading': '불러오는 중...',
        'loadMoreSpreads': '스프레드 더 보기',
        'loadMoreSaved': '저장된 항목 더 보기',
        'loadMoreReadings': '리딩 더 보기',
        'contentComingSoon': '콘텐츠 준비 중...',
        'continueExploring': '가이드를 계속 탐구하여 영적 실천을 깊게 하세요',
    },
    'zh': {
        'loading': '加载中...',
        'loadMoreSpreads': '加载更多牌阵',
        'loadMoreSaved': '加载更多已保存项目',
        'loadMoreReadings': '加载更多解读',
        'contentComingSoon': '内容即将推出...',
        'continueExploring': '继续探索指南，深化你的灵性实践',
    },
}

for lang, strings in CHROME.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    lib = d.setdefault('library', {})
    for k, v in strings.items():
        lib[k] = v
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: library chrome added')
