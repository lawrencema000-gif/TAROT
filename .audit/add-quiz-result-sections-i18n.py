"""Add quizzes.resultSections.* translations for MBTI result page."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA = {
    'en': {
        'strengths': 'Strengths',
        'blindSpots': 'Blind Spots',
        'underStress': 'Under Stress',
        'inRelationships': 'In Relationships',
        'atWork': 'At Work',
        'growthQuests': 'Growth Quests',
        'stressSignature': 'Stress Signature',
        'recoveryPath': 'Recovery Path',
        'realLifeExamples': 'Real Life Examples',
        'bigFiveProfile': 'Big Five Profile',
        'emotionalStability': 'Emotional Stability',
        'higherThanAverage': 'Higher than average',
        'lowerThanAverage': 'Lower than average',
        'averageRange': 'Average range',
    },
    'ja': {
        'strengths': '強み',
        'blindSpots': '盲点',
        'underStress': 'ストレス下で',
        'inRelationships': '人間関係では',
        'atWork': '仕事では',
        'growthQuests': '成長のクエスト',
        'stressSignature': 'ストレスのサイン',
        'recoveryPath': '回復への道',
        'realLifeExamples': '実例',
        'bigFiveProfile': 'ビッグファイブ プロフィール',
        'emotionalStability': '情緒安定性',
        'higherThanAverage': '平均より高い',
        'lowerThanAverage': '平均より低い',
        'averageRange': '平均の範囲',
    },
    'ko': {
        'strengths': '강점',
        'blindSpots': '사각지대',
        'underStress': '스트레스 상황에서',
        'inRelationships': '관계에서',
        'atWork': '업무에서',
        'growthQuests': '성장 퀘스트',
        'stressSignature': '스트레스 징후',
        'recoveryPath': '회복 경로',
        'realLifeExamples': '실생활 예시',
        'bigFiveProfile': '빅 파이브 프로필',
        'emotionalStability': '정서적 안정성',
        'higherThanAverage': '평균보다 높음',
        'lowerThanAverage': '평균보다 낮음',
        'averageRange': '평균 범위',
    },
    'zh': {
        'strengths': '优势',
        'blindSpots': '盲点',
        'underStress': '压力下',
        'inRelationships': '在关系中',
        'atWork': '在工作中',
        'growthQuests': '成长挑战',
        'stressSignature': '压力特征',
        'recoveryPath': '恢复路径',
        'realLifeExamples': '真实案例',
        'bigFiveProfile': '五大性格档案',
        'emotionalStability': '情绪稳定性',
        'higherThanAverage': '高于平均',
        'lowerThanAverage': '低于平均',
        'averageRange': '平均范围',
    },
}

for lang, data in DATA.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    q = d.setdefault('quizzes', {})
    q['resultSections'] = data
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: quizzes.resultSections added')
