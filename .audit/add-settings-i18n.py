"""Add settings.editProfile / themes / helpCenter / deleteAccount translations."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA = {
    'en': {
        'editProfile': {
            'title': 'Edit Profile',
            'displayName': 'Display Name',
            'displayNamePlaceholder': 'Your name',
            'birthDate': 'Birth Date',
            'birthTime': 'Birth Time (optional)',
        },
        'themes': {
            'dark':      {'name': 'Dark',      'desc': 'Easy on the eyes'},
            'midnight':  {'name': 'Midnight',  'desc': 'Deep cosmic blue'},
            'celestial': {'name': 'Celestial', 'desc': 'Starry night theme'},
        },
        'helpCenter': {'title': 'Help Center'},
        'deleteAccount': {
            'title': 'Delete Account',
            'dataWarning': 'All your data will be permanently deleted, including your profile, journal entries, tarot readings, and saved items.',
            'exportRecommendation': 'We recommend exporting your data before deleting your account.',
            'exportFirst': 'Export Data First',
            'exporting': 'Exporting...',
            'deleteMyAccount': 'Delete My Account',
            'deleting': 'Deleting...',
        },
    },
    'ja': {
        'editProfile': {
            'title': 'プロフィールを編集',
            'displayName': '表示名',
            'displayNamePlaceholder': 'あなたの名前',
            'birthDate': '生年月日',
            'birthTime': '出生時刻(任意)',
        },
        'themes': {
            'dark':      {'name': 'ダーク',    'desc': '目にやさしい'},
            'midnight':  {'name': 'ミッドナイト', 'desc': '深い宇宙の青'},
            'celestial': {'name': 'セレスティアル', 'desc': '星空のテーマ'},
        },
        'helpCenter': {'title': 'ヘルプセンター'},
        'deleteAccount': {
            'title': 'アカウントを削除',
            'dataWarning': 'プロフィール、ジャーナル、タロットリーディング、保存済みアイテムを含め、すべてのデータが永久に削除されます。',
            'exportRecommendation': 'アカウントを削除する前にデータをエクスポートすることをおすすめします。',
            'exportFirst': '最初にデータをエクスポート',
            'exporting': 'エクスポート中...',
            'deleteMyAccount': 'アカウントを削除',
            'deleting': '削除中...',
        },
    },
    'ko': {
        'editProfile': {
            'title': '프로필 편집',
            'displayName': '표시 이름',
            'displayNamePlaceholder': '당신의 이름',
            'birthDate': '생년월일',
            'birthTime': '태어난 시간(선택)',
        },
        'themes': {
            'dark':      {'name': '다크',     'desc': '눈에 편안한'},
            'midnight':  {'name': '미드나잇', 'desc': '깊은 우주의 파랑'},
            'celestial': {'name': '셀레스티얼', 'desc': '별이 빛나는 밤 테마'},
        },
        'helpCenter': {'title': '도움말 센터'},
        'deleteAccount': {
            'title': '계정 삭제',
            'dataWarning': '프로필, 저널 기록, 타로 리딩, 저장한 항목 등 모든 데이터가 영구적으로 삭제됩니다.',
            'exportRecommendation': '계정을 삭제하기 전에 데이터를 내보내는 것을 권장합니다.',
            'exportFirst': '먼저 데이터 내보내기',
            'exporting': '내보내는 중...',
            'deleteMyAccount': '내 계정 삭제',
            'deleting': '삭제 중...',
        },
    },
    'zh': {
        'editProfile': {
            'title': '编辑个人资料',
            'displayName': '显示名称',
            'displayNamePlaceholder': '你的名字',
            'birthDate': '出生日期',
            'birthTime': '出生时间(可选)',
        },
        'themes': {
            'dark':      {'name': '暗黑',   'desc': '对眼睛温和'},
            'midnight':  {'name': '午夜',   'desc': '深邃宇宙蓝'},
            'celestial': {'name': '天界',   'desc': '星空主题'},
        },
        'helpCenter': {'title': '帮助中心'},
        'deleteAccount': {
            'title': '删除账户',
            'dataWarning': '你的所有数据将被永久删除，包括个人资料、日记条目、塔罗解读和已保存项目。',
            'exportRecommendation': '我们建议在删除账户前导出你的数据。',
            'exportFirst': '先导出数据',
            'exporting': '导出中...',
            'deleteMyAccount': '删除我的账户',
            'deleting': '删除中...',
        },
    },
}

for lang, data in DATA.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    s = d.setdefault('settings', {})
    for k, v in data.items():
        s[k] = v
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: settings.* chrome added')
