"""Add library guides (8 guides × ~5 sections + content) to all 4 locales.
Restructured to a cleaner array-of-sections shape for i18n consumption."""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

GUIDES = {
    'en': {
        'tarot-basics': {
            'title': 'Tarot Basics',
            'description': 'Learn the fundamentals of tarot reading',
            'sections': [
                {'title': 'Major vs Minor Arcana', 'content': "The Major Arcana consists of 22 cards representing life's major themes and spiritual lessons. The Minor Arcana has 56 cards divided into four suits, representing day-to-day experiences."},
                {'title': 'The Four Suits', 'content': 'Wands (Fire - Passion), Cups (Water - Emotions), Swords (Air - Thoughts), Pentacles (Earth - Material)'},
                {'title': 'Reading Spreads', 'content': 'Different card layouts like the Three-Card Spread (Past-Present-Future) and Celtic Cross provide various perspectives on questions.'},
                {'title': 'Reversed Cards', 'content': 'When cards appear upside down, they can indicate blocked energy, internalized energy, or the opposite meaning.'},
            ],
        },
        'mbti-guide': {
            'title': 'MBTI Explained',
            'description': 'Understanding the 16 personality types',
            'sections': [
                {'title': 'The Four Dichotomies', 'content': 'E/I (Energy direction), S/N (Information processing), T/F (Decision making), J/P (Lifestyle approach)'},
                {'title': 'Cognitive Functions', 'content': 'Each type uses eight cognitive functions in a specific order, determining how they perceive and judge the world.'},
                {'title': "Your Type's Strengths", 'content': 'Every type has unique gifts — INTJs excel at strategic thinking, ENFPs at inspiring others, ISTJs at reliability.'},
                {'title': 'Growth Areas', 'content': 'Understanding your inferior function helps identify areas for personal development and stress management.'},
            ],
        },
        'love-languages': {
            'title': 'Love Languages',
            'description': 'The 5 ways we give and receive love',
            'sections': [
                {'title': 'Words of Affirmation', 'content': 'Verbal compliments, encouragement, and expressions of appreciation make you feel most loved.'},
                {'title': 'Acts of Service', 'content': 'Actions speak louder than words — doing helpful things shows care and consideration.'},
                {'title': 'Receiving Gifts', 'content': 'Thoughtful presents, big or small, represent love and show you were thought of.'},
                {'title': 'Quality Time', 'content': 'Undivided attention and meaningful shared experiences are how you feel valued.'},
                {'title': 'Physical Touch', 'content': 'Appropriate physical connection — hugs, hand-holding, closeness — communicates love.'},
            ],
        },
        'zodiac-elements': {
            'title': 'Zodiac Elements',
            'description': 'Fire, Earth, Air, and Water signs',
            'sections': [
                {'title': 'Fire Signs', 'content': 'Aries, Leo, Sagittarius — Passionate, enthusiastic, bold, and inspirational. They lead with action.'},
                {'title': 'Earth Signs', 'content': 'Taurus, Virgo, Capricorn — Grounded, practical, reliable, and focused on tangible results.'},
                {'title': 'Air Signs', 'content': 'Gemini, Libra, Aquarius — Intellectual, communicative, social, and idea-oriented.'},
                {'title': 'Water Signs', 'content': 'Cancer, Scorpio, Pisces — Emotional, intuitive, empathetic, and deeply feeling.'},
                {'title': 'Element Compatibility', 'content': 'Fire and Air energize each other. Earth and Water nurture each other. Similar elements understand each other.'},
            ],
        },
        'moon-phases': {
            'title': 'Moon Phases & Rituals',
            'description': 'Harness lunar energy for manifestation',
            'sections': [
                {'title': 'New Moon', 'content': 'Time for new beginnings, setting intentions, and planting seeds for the future.'},
                {'title': 'Waxing Moon', 'content': 'Building energy phase — take action on your goals, make progress, attract what you want.'},
                {'title': 'Full Moon', 'content': 'Peak energy for manifestation, celebration, and releasing what no longer serves you.'},
                {'title': 'Waning Moon', 'content': 'Time for reflection, rest, letting go, and clearing space for new opportunities.'},
                {'title': 'Moon Rituals', 'content': 'Write intentions on new moons, charge crystals during full moons, and practice gratitude journaling.'},
            ],
        },
        'crystals-guide': {
            'title': 'Crystals & Stones',
            'description': 'Energy healing with gemstones',
            'sections': [
                {'title': 'Clear Quartz', 'content': 'The master healer — amplifies energy, clarifies thoughts, enhances spiritual awareness.'},
                {'title': 'Amethyst', 'content': 'Calming and protective — promotes peaceful sleep, intuition, and spiritual connection.'},
                {'title': 'Rose Quartz', 'content': 'The love stone — attracts love, promotes self-love, heals emotional wounds.'},
                {'title': 'Black Tourmaline', 'content': 'Protective shield — grounds energy, repels negativity, provides emotional stability.'},
                {'title': 'Citrine', 'content': 'Abundance and joy — attracts prosperity, enhances creativity, radiates positive energy.'},
            ],
        },
        'chakras': {
            'title': 'Chakra System',
            'description': 'Balance your energy centers',
            'sections': [
                {'title': 'Root Chakra', 'content': 'Red — Grounding, security, survival. Located at the base of spine. Balanced = stable and secure.'},
                {'title': 'Sacral Chakra', 'content': 'Orange — Creativity, sexuality, emotions. Below navel. Balanced = passionate and creative.'},
                {'title': 'Solar Plexus', 'content': 'Yellow — Personal power, confidence, will. Upper abdomen. Balanced = confident and purposeful.'},
                {'title': 'Heart Chakra', 'content': 'Green — Love, compassion, connection. Center of chest. Balanced = loving and accepting.'},
                {'title': 'Throat Chakra', 'content': 'Blue — Communication, truth, expression. Throat. Balanced = authentic and expressive.'},
                {'title': 'Third Eye', 'content': 'Indigo — Intuition, wisdom, insight. Between eyebrows. Balanced = intuitive and wise.'},
                {'title': 'Crown Chakra', 'content': 'Violet — Spiritual connection, enlightenment. Top of head. Balanced = spiritually connected.'},
            ],
        },
        'numerology': {
            'title': 'Numerology Basics',
            'description': 'The mystical significance of numbers',
            'sections': [
                {'title': 'Life Path Number', 'content': "Calculated from birthdate — reveals your life's purpose and the path you're meant to walk."},
                {'title': 'Expression Number', 'content': 'From your full name — shows your natural talents, abilities, and how you express yourself.'},
                {'title': 'Soul Urge', 'content': 'From vowels in your name — reveals your innermost desires, motivations, and what drives you.'},
                {'title': 'Personality Number', 'content': 'From consonants — how others perceive you, the mask you show to the world.'},
                {'title': 'Master Numbers', 'content': '11, 22, 33 carry powerful spiritual significance and heightened potential for growth.'},
            ],
        },
    },
    'ja': {
        'tarot-basics': {
            'title': 'タロットの基礎',
            'description': 'タロットリーディングの基本を学ぶ',
            'sections': [
                {'title': '大アルカナと小アルカナ', 'content': '大アルカナは人生の主要なテーマと霊的な教訓を表す22枚のカードで構成されます。小アルカナは4つのスーツに分かれた56枚で、日常の経験を表します。'},
                {'title': '4つのスーツ', 'content': 'ワンド(火 — 情熱)、カップ(水 — 感情)、ソード(風 — 思考)、ペンタクル(地 — 物質)'},
                {'title': 'スプレッドの読み方', 'content': '3枚スプレッド(過去・現在・未来)やケルト十字など、さまざまなレイアウトが質問への多角的な視点を提供します。'},
                {'title': '逆位置', 'content': 'カードが逆さまに出たとき、ブロックされたエネルギー、内在化したエネルギー、または反対の意味を示すことがあります。'},
            ],
        },
        'mbti-guide': {
            'title': 'MBTIの解説',
            'description': '16の性格タイプを理解する',
            'sections': [
                {'title': '4つの二分法', 'content': 'E/I(エネルギーの方向)、S/N(情報処理)、T/F(意思決定)、J/P(ライフスタイル)'},
                {'title': '認知機能', 'content': '各タイプは8つの認知機能を特定の順序で使い、世界をどう知覚し判断するかを決めます。'},
                {'title': 'あなたのタイプの強み', 'content': 'すべてのタイプには固有の才能があります — INTJは戦略的思考、ENFPは他者を鼓舞、ISTJは信頼性に優れています。'},
                {'title': '成長の領域', 'content': '劣等機能を理解することで、成長の方向とストレス管理の領域が見えてきます。'},
            ],
        },
        'love-languages': {
            'title': '愛の言語',
            'description': '愛を与え受け取る5つの方法',
            'sections': [
                {'title': '肯定の言葉', 'content': '言葉による称賛、励まし、感謝の表現が、最も愛されていると感じさせます。'},
                {'title': '奉仕の行為', 'content': '行動は言葉より雄弁 — 助けとなる行動が思いやりと配慮を示します。'},
                {'title': '贈り物', 'content': '大小にかかわらず思いやりのある贈り物が愛を表し、あなたが思われていることを示します。'},
                {'title': '質の高い時間', 'content': '完全な注意と意味ある共有体験によって、あなたは大切にされていると感じます。'},
                {'title': 'スキンシップ', 'content': '適切な身体的接触 — ハグ、手をつなぐこと、近さ — が愛を伝えます。'},
            ],
        },
        'zodiac-elements': {
            'title': '12星座の元素',
            'description': '火・地・風・水の星座',
            'sections': [
                {'title': '火の星座', 'content': '牡羊座・獅子座・射手座 — 情熱的で、熱狂的、大胆でインスピレーションを与える。行動でリードします。'},
                {'title': '地の星座', 'content': '牡牛座・乙女座・山羊座 — 地に足がつき、実用的で信頼でき、具体的な成果に集中します。'},
                {'title': '風の星座', 'content': '双子座・天秤座・水瓶座 — 知的で対話的、社交的でアイデア志向。'},
                {'title': '水の星座', 'content': '蟹座・蠍座・魚座 — 感情的、直感的、共感的で、深く感じる。'},
                {'title': '元素の相性', 'content': '火と風は互いに活気づけ、地と水は互いに育みます。同じ元素同士は理解し合います。'},
            ],
        },
        'moon-phases': {
            'title': '月の満ち欠けと儀式',
            'description': '月のエネルギーで願いを叶える',
            'sections': [
                {'title': '新月', 'content': '新しい始まりの時。意図を定め、未来の種を蒔きましょう。'},
                {'title': '上弦の月', 'content': 'エネルギーが高まる段階 — 目標に向かって行動し、前進し、欲しいものを引き寄せましょう。'},
                {'title': '満月', 'content': '願望実現、祝福、不要なものを手放すためのピークのエネルギー。'},
                {'title': '下弦の月', 'content': '内省、休息、手放し、新しい機会のための空間を作る時間。'},
                {'title': '月の儀式', 'content': '新月に意図を書き、満月にクリスタルを充電し、感謝のジャーナルを続けましょう。'},
            ],
        },
        'crystals-guide': {
            'title': 'クリスタルと石',
            'description': '宝石によるエネルギーヒーリング',
            'sections': [
                {'title': '水晶', 'content': 'マスターヒーラー — エネルギーを増幅し、思考を明晰にし、霊的な気づきを高めます。'},
                {'title': 'アメジスト', 'content': '穏やかで守護的 — 安らかな眠り、直感、霊的なつながりを促します。'},
                {'title': 'ローズクォーツ', 'content': '愛の石 — 愛を引き寄せ、自己愛を育み、感情の傷を癒します。'},
                {'title': 'ブラックトルマリン', 'content': '守護の盾 — エネルギーを地に根づかせ、ネガティブを跳ね返し、感情的な安定を与えます。'},
                {'title': 'シトリン', 'content': '豊かさと喜び — 繁栄を引き寄せ、創造性を高め、ポジティブなエネルギーを放ちます。'},
            ],
        },
        'chakras': {
            'title': 'チャクラシステム',
            'description': 'エネルギーセンターのバランスを整える',
            'sections': [
                {'title': 'ルートチャクラ', 'content': '赤 — 地に根づくこと、安全、生存。脊椎の底にあります。バランスが取れていれば安定と安心。'},
                {'title': 'セイクラルチャクラ', 'content': 'オレンジ — 創造性、性、感情。へその下。バランスが取れていれば情熱的で創造的。'},
                {'title': '太陽神経叢', 'content': '黄 — 個人の力、自信、意志。みぞおち。バランスが取れていれば自信と目的意識。'},
                {'title': 'ハートチャクラ', 'content': '緑 — 愛、慈悲、つながり。胸の中心。バランスが取れていれば愛と受容。'},
                {'title': 'スロートチャクラ', 'content': '青 — コミュニケーション、真実、表現。喉。バランスが取れていれば本物で表現豊か。'},
                {'title': '第三の目', 'content': '藍 — 直感、叡智、洞察。眉間。バランスが取れていれば直感的で賢明。'},
                {'title': 'クラウンチャクラ', 'content': '紫 — 霊的なつながり、啓発。頭頂。バランスが取れていれば霊的につながっている。'},
            ],
        },
        'numerology': {
            'title': '数秘術の基礎',
            'description': '数字の神秘的な意味',
            'sections': [
                {'title': 'ライフパスナンバー', 'content': '生年月日から算出 — あなたの人生の目的と歩むべき道を示します。'},
                {'title': 'エクスプレッションナンバー', 'content': 'フルネームから — 自然な才能、能力、自己表現の仕方を示します。'},
                {'title': 'ソウルアージナンバー', 'content': '名前の母音から — 内なる欲求、動機、駆動力を示します。'},
                {'title': 'パーソナリティナンバー', 'content': '子音から — 他者がどう見るか、世界に見せる仮面。'},
                {'title': 'マスターナンバー', 'content': '11、22、33は強力な霊的意味と高い成長の可能性を持ちます。'},
            ],
        },
    },
    'ko': {
        'tarot-basics': {
            'title': '타로 기초',
            'description': '타로 리딩의 기본 원리를 배우세요',
            'sections': [
                {'title': '메이저 아르카나 vs 마이너 아르카나', 'content': '메이저 아르카나는 인생의 주요 주제와 영적 교훈을 나타내는 22장의 카드로 구성됩니다. 마이너 아르카나는 4개의 슈트로 나뉜 56장으로 일상의 경험을 나타냅니다.'},
                {'title': '네 가지 슈트', 'content': '완드(불 — 열정), 컵(물 — 감정), 소드(공기 — 사고), 펜타클(땅 — 물질)'},
                {'title': '리딩 스프레드', 'content': '3장 스프레드(과거-현재-미래), 켈틱 크로스 등 다양한 배치가 질문에 다양한 관점을 제공합니다.'},
                {'title': '역방향 카드', 'content': '카드가 거꾸로 나오면 막힌 에너지, 내면화된 에너지, 또는 반대의 의미를 나타낼 수 있습니다.'},
            ],
        },
        'mbti-guide': {
            'title': 'MBTI 해설',
            'description': '16가지 성격 유형 이해하기',
            'sections': [
                {'title': '네 가지 이분법', 'content': 'E/I(에너지 방향), S/N(정보 처리), T/F(의사결정), J/P(생활 방식)'},
                {'title': '인지 기능', 'content': '각 유형은 8가지 인지 기능을 특정 순서로 사용하여 세계를 어떻게 인식하고 판단하는지 결정합니다.'},
                {'title': '당신 유형의 강점', 'content': '모든 유형은 고유한 재능을 가집니다 — INTJ는 전략적 사고, ENFP는 타인 고무, ISTJ는 신뢰성이 뛰어납니다.'},
                {'title': '성장 영역', 'content': '열등 기능을 이해하면 개인적 성장과 스트레스 관리의 방향이 보입니다.'},
            ],
        },
        'love-languages': {
            'title': '사랑의 언어',
            'description': '사랑을 주고받는 5가지 방식',
            'sections': [
                {'title': '인정하는 말', 'content': '언어적 칭찬, 격려, 감사의 표현이 당신이 가장 사랑받는다고 느끼게 합니다.'},
                {'title': '봉사하는 행동', 'content': '말보다 행동이 크다 — 도움이 되는 행동이 보살핌과 배려를 보여줍니다.'},
                {'title': '선물 받기', 'content': '크든 작든 사려 깊은 선물이 사랑을 나타내고 당신이 생각받고 있음을 보여줍니다.'},
                {'title': '함께하는 시간', 'content': '완전한 주의와 의미 있는 공유 경험으로 당신은 소중하게 느낍니다.'},
                {'title': '신체 접촉', 'content': '적절한 신체적 접촉 — 포옹, 손잡기, 가까움 — 이 사랑을 전달합니다.'},
            ],
        },
        'zodiac-elements': {
            'title': '황도 원소',
            'description': '불, 흙, 공기, 물 별자리',
            'sections': [
                {'title': '불 별자리', 'content': '양자리, 사자자리, 궁수자리 — 열정적, 열광적, 대담하며 영감을 줍니다. 행동으로 이끕니다.'},
                {'title': '흙 별자리', 'content': '황소자리, 처녀자리, 염소자리 — 안정적, 실용적, 신뢰할 수 있으며 구체적 결과에 집중합니다.'},
                {'title': '공기 별자리', 'content': '쌍둥이자리, 천칭자리, 물병자리 — 지적, 소통적, 사회적이며 아이디어 중심.'},
                {'title': '물 별자리', 'content': '게자리, 전갈자리, 물고기자리 — 감정적, 직관적, 공감적이며 깊이 느낍니다.'},
                {'title': '원소의 궁합', 'content': '불과 공기는 서로를 활기차게 하고, 흙과 물은 서로를 양육합니다. 같은 원소끼리는 서로를 이해합니다.'},
            ],
        },
        'moon-phases': {
            'title': '달의 위상과 의례',
            'description': '달 에너지를 활용한 현현',
            'sections': [
                {'title': '새달', 'content': '새 출발, 의도 설정, 미래의 씨앗 심기의 시간.'},
                {'title': '차오르는 달', 'content': '에너지 구축 단계 — 목표를 향해 행동하고, 전진하며, 원하는 것을 끌어당기세요.'},
                {'title': '보름달', 'content': '현현, 축하, 더 이상 도움 되지 않는 것을 놓아주기 위한 정점의 에너지.'},
                {'title': '기우는 달', 'content': '성찰, 휴식, 놓아주기, 새로운 기회를 위한 공간 비우기의 시간.'},
                {'title': '달 의례', 'content': '새달에 의도를 적고, 보름달에 크리스탈을 충전하고, 감사 저널링을 실천하세요.'},
            ],
        },
        'crystals-guide': {
            'title': '크리스탈과 보석',
            'description': '보석을 통한 에너지 치유',
            'sections': [
                {'title': '투명 수정', 'content': '마스터 힐러 — 에너지를 증폭하고, 사고를 명료히 하며, 영적 인식을 높입니다.'},
                {'title': '자수정', 'content': '차분하고 보호적 — 평화로운 수면, 직관, 영적 연결을 촉진합니다.'},
                {'title': '장미 수정', 'content': '사랑의 돌 — 사랑을 끌어당기고, 자기애를 기르며, 감정의 상처를 치유합니다.'},
                {'title': '블랙 투어멀린', 'content': '보호의 방패 — 에너지를 땅에 뿌리내리고, 부정성을 물리치며, 감정적 안정을 제공합니다.'},
                {'title': '시트린', 'content': '풍요와 기쁨 — 번영을 끌어당기고, 창의성을 높이며, 긍정적 에너지를 발산합니다.'},
            ],
        },
        'chakras': {
            'title': '차크라 시스템',
            'description': '에너지 센터의 균형을 맞추세요',
            'sections': [
                {'title': '루트 차크라', 'content': '빨강 — 뿌리내림, 안전, 생존. 척추 기저. 균형 = 안정과 안심.'},
                {'title': '천골 차크라', 'content': '주황 — 창의성, 성, 감정. 배꼽 아래. 균형 = 열정과 창의성.'},
                {'title': '태양 신경총', 'content': '노랑 — 개인 힘, 자신감, 의지. 복부 위쪽. 균형 = 자신감과 목적.'},
                {'title': '심장 차크라', 'content': '녹색 — 사랑, 연민, 연결. 가슴 중앙. 균형 = 사랑과 수용.'},
                {'title': '목 차크라', 'content': '파랑 — 소통, 진실, 표현. 목. 균형 = 진실되고 표현적.'},
                {'title': '제3의 눈', 'content': '남색 — 직관, 지혜, 통찰. 미간. 균형 = 직관적이고 지혜로운.'},
                {'title': '크라운 차크라', 'content': '보라 — 영적 연결, 깨달음. 정수리. 균형 = 영적으로 연결됨.'},
            ],
        },
        'numerology': {
            'title': '수비학 기초',
            'description': '숫자의 신비적 의미',
            'sections': [
                {'title': '생명 경로 수', 'content': '생년월일에서 계산 — 당신 인생의 목적과 걸어야 할 길을 드러냅니다.'},
                {'title': '표현 수', 'content': '전체 이름에서 — 자연스러운 재능, 능력, 자기 표현 방식을 보여줍니다.'},
                {'title': '영혼의 충동', 'content': '이름의 모음에서 — 내면의 욕망, 동기, 당신을 이끄는 힘을 드러냅니다.'},
                {'title': '인격 수', 'content': '자음에서 — 다른 사람이 당신을 어떻게 보는지, 세상에 보이는 가면.'},
                {'title': '마스터 수', 'content': '11, 22, 33은 강력한 영적 의미와 높은 성장 가능성을 지닙니다.'},
            ],
        },
    },
    'zh': {
        'tarot-basics': {
            'title': '塔罗基础',
            'description': '学习塔罗解读的基本原理',
            'sections': [
                {'title': '大阿卡纳 vs 小阿卡纳', 'content': '大阿卡纳由22张牌组成，代表人生的主要主题与灵性课题。小阿卡纳共56张，分为四个花色，代表日常经验。'},
                {'title': '四大花色', 'content': '权杖(火 — 热情)、圣杯(水 — 情感)、宝剑(风 — 思想)、钱币(土 — 物质)'},
                {'title': '解读牌阵', 'content': '三张牌阵(过去-现在-未来)、凯尔特十字等不同布局为问题提供多角度视角。'},
                {'title': '逆位牌', 'content': '当牌呈倒置时，可能表示能量受阻、内化能量或相反的含义。'},
            ],
        },
        'mbti-guide': {
            'title': 'MBTI 解说',
            'description': '理解16种性格类型',
            'sections': [
                {'title': '四大二分法', 'content': 'E/I(能量方向)、S/N(信息处理)、T/F(决策方式)、J/P(生活方式)'},
                {'title': '认知功能', 'content': '每种类型以特定顺序使用八种认知功能，决定他们如何感知和判断世界。'},
                {'title': '你类型的优势', 'content': '每种类型都有独特的天赋 — INTJ擅长策略思考，ENFP激励他人，ISTJ可靠。'},
                {'title': '成长领域', 'content': '理解你的劣等功能有助于识别个人发展与压力管理的方向。'},
            ],
        },
        'love-languages': {
            'title': '爱的语言',
            'description': '5种给予和接收爱的方式',
            'sections': [
                {'title': '肯定的话语', 'content': '言语的赞美、鼓励和感激表达让你最感到被爱。'},
                {'title': '服务的行动', 'content': '行动胜于言语 — 做有帮助的事情显示关爱与体贴。'},
                {'title': '收到礼物', 'content': '不论大小，贴心的礼物代表爱，并显示你被想着。'},
                {'title': '优质时间', 'content': '全然的关注和有意义的共享体验让你感到被珍视。'},
                {'title': '身体接触', 'content': '适当的身体连结 — 拥抱、牵手、靠近 — 传达爱。'},
            ],
        },
        'zodiac-elements': {
            'title': '黄道元素',
            'description': '火、土、风、水星座',
            'sections': [
                {'title': '火象星座', 'content': '白羊、狮子、射手 — 热情、充满活力、大胆且富启发性。他们以行动领导。'},
                {'title': '土象星座', 'content': '金牛、处女、摩羯 — 扎根、务实、可靠，专注于具体成果。'},
                {'title': '风象星座', 'content': '双子、天秤、水瓶 — 理智、善沟通、社交并以想法为导向。'},
                {'title': '水象星座', 'content': '巨蟹、天蝎、双鱼 — 情感丰富、直觉、同理并深刻感受。'},
                {'title': '元素相容性', 'content': '火与风互相激发，土与水互相滋养。相似元素互相理解。'},
            ],
        },
        'moon-phases': {
            'title': '月相与仪式',
            'description': '运用月之能量实现显化',
            'sections': [
                {'title': '新月', 'content': '新开始、设定意图、播下未来种子的时刻。'},
                {'title': '上弦月', 'content': '能量积累阶段 — 朝目标行动，取得进展，吸引你想要的。'},
                {'title': '满月', 'content': '显化、庆祝和释放不再服务你的事物的巅峰能量。'},
                {'title': '下弦月', 'content': '反思、休息、放下并为新机会清出空间的时刻。'},
                {'title': '月亮仪式', 'content': '新月时写下意图，满月时为水晶充能，持续感恩日记。'},
            ],
        },
        'crystals-guide': {
            'title': '水晶与宝石',
            'description': '以宝石进行能量疗愈',
            'sections': [
                {'title': '白水晶', 'content': '大师疗愈者 — 放大能量、澄清思绪、增强灵性觉察。'},
                {'title': '紫水晶', 'content': '安抚而保护 — 促进安稳的睡眠、直觉与灵性连结。'},
                {'title': '粉水晶', 'content': '爱之石 — 吸引爱情、培养自爱、疗愈情感创伤。'},
                {'title': '黑电气石', 'content': '防护之盾 — 将能量扎根、驱除负面能量、提供情感稳定。'},
                {'title': '黄水晶', 'content': '丰盛与喜悦 — 吸引繁荣、增强创造力、散发正向能量。'},
            ],
        },
        'chakras': {
            'title': '脉轮系统',
            'description': '平衡你的能量中心',
            'sections': [
                {'title': '海底轮', 'content': '红色 — 扎根、安全、生存。位于脊椎底部。平衡 = 稳定与安心。'},
                {'title': '脐轮', 'content': '橙色 — 创造力、性、情感。位于肚脐下方。平衡 = 热情与创造。'},
                {'title': '太阳神经丛', 'content': '黄色 — 个人力量、自信、意志。上腹部。平衡 = 自信与目标感。'},
                {'title': '心轮', 'content': '绿色 — 爱、慈悲、连结。胸部中央。平衡 = 爱与接纳。'},
                {'title': '喉轮', 'content': '蓝色 — 沟通、真理、表达。喉咙。平衡 = 真实且善表达。'},
                {'title': '眉心轮', 'content': '靛色 — 直觉、智慧、洞察。眉心之间。平衡 = 直觉与智慧。'},
                {'title': '顶轮', 'content': '紫色 — 灵性连结、觉醒。头顶。平衡 = 与灵性相连。'},
            ],
        },
        'numerology': {
            'title': '数字学基础',
            'description': '数字的神秘意义',
            'sections': [
                {'title': '生命灵数', 'content': '由出生日期计算 — 揭示你的人生目的与应走的道路。'},
                {'title': '表达数', 'content': '由你的全名 — 显示你的天赋、能力与自我表达方式。'},
                {'title': '灵魂渴望', 'content': '由名字中的元音 — 揭示你最深的欲望、动机与驱动力。'},
                {'title': '个性数', 'content': '由辅音 — 他人如何看待你，以及你向世界展示的面具。'},
                {'title': '大师数', 'content': '11、22、33 承载强大的灵性意义与更高的成长潜力。'},
            ],
        },
    },
}

for lang, guides in GUIDES.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    lib = d.setdefault('library', {})
    lib['guides'] = guides
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: library.guides added ({len(guides)} guides)')
