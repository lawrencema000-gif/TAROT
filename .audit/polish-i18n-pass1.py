"""Native-polish pass 1 — high-visibility surfaces across ja/ko/zh.

Replaces clunky/literal translations with natural phrasing. Targets:
  - home.* (subtitle, streak, seeker, ritualReady)
  - horoscope.* (subtitle)
  - dailyInsights.* (templates rendered on every Horoscope tab view)

Each rewrite preserves {{placeholder}} tokens unchanged.
"""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PATCHES = {
    'ja': {
        # ─── home ──────────────────────────────────────────────────────
        'home.subtitle': '今日の宇宙があなたに届けるメッセージ',
        'home.streak': '{{n}}日連続達成。このまま続けていきましょう。',
        'home.savedToday': '今日保存したもの',
        'home.savedHighlights': '保存したハイライト',
        'home.xpProgress': '経験値の進捗',
        'home.dayStreakLabel': '日連続',
        'home.seeker': '探求者',
        'home.ritualReady.title': '今日のリチュアルが、あなたを待っています。',
        'home.ritualReady.sub': 'カードを一枚引き、心に浮かんだ一文を正直に書いてみましょう。',
        # ─── horoscope ─────────────────────────────────────────────────
        'horoscope.subtitle': '今日の宇宙からの予報',
        # ─── dailyInsights.general ────────────────────────────────────
        'dailyInsights.general.0': '宇宙のエネルギーが今日の{focus}を後押ししています。',
        'dailyInsights.general.1': '宇宙は{theme}へと導いてくれています。信頼してみましょう。',
        'dailyInsights.general.2': '{strength}が、今日の流れと自然に噛み合います。',
        'dailyInsights.general.3': '星々が{element}の性質を受け入れるよう、そっと促しています。',
        'dailyInsights.general.4': '今日の惑星の動きは、生まれ持った{talent}を際立たせます。',
        'dailyInsights.general.5': '守護星{planet}が今日の決意を静かに支えています。',
        'dailyInsights.general.6': '宇宙の叡智は、今日{area}に心を向けるよう示しています。',
        'dailyInsights.general.7': '水面下で何かが動いています。{element}の直感に従ってみましょう。',
        'dailyInsights.general.8': '今日は速さよりも深さを大切に。{talent}を自然に開いていきましょう。',
        'dailyInsights.general.9': '天の流れが、{quality}のエネルギーとともに{area}へと運んでいきます。',
        # ─── dailyInsights.love ───────────────────────────────────────
        'dailyInsights.love.0': '{loveStyle}な愛し方が、意味のあるつながりを引き寄せます。',
        'dailyInsights.love.1': '金星のエネルギーが、生まれ持った魅力を高めています。',
        'dailyInsights.love.2': '感情に誠実でいることが、今日の恋愛関係を深めていきます。',
        'dailyInsights.love.3': '{element}の性質が、人間関係に{quality}をもたらします。',
        'dailyInsights.love.4': '大切な人との心からの対話を、星々が応援しています。',
        'dailyInsights.love.5': '{sign}の磁力が高まっています——ただし表面の魅力ではなく、深さのために使いましょう。',
        'dailyInsights.love.6': '今日の恋愛は{loveAction}が吉。',
        'dailyInsights.love.7': '身近な誰かが、あなたが言えずにいた言葉を待っています。',
        'dailyInsights.love.8': 'あなたの{loveStyle}な愛情は、今ある人にとって必要なものです。',
        'dailyInsights.love.9': '今日のエネルギーは、愛の与え方・受け取り方にある古い傷を癒していきます。',
        # ─── dailyInsights.career ─────────────────────────────────────
        'dailyInsights.career.0': '{careerStrength}が、今日仕事のチャンスを運んできます。',
        'dailyInsights.career.1': 'キャリアにおける{workActivity}を、星々が後押ししています。',
        'dailyInsights.career.2': '仕事の判断では、{sign}らしい直感を信じましょう。',
        'dailyInsights.career.3': '生まれ持った{talent}が、今日新しい扉を開きます。',
        'dailyInsights.career.4': 'キャリアの前進は、{approach}という形で訪れます。',
        'dailyInsights.career.5': '宇宙は野心ある目標を後押ししています。',
        'dailyInsights.career.6': '静かな有能さが、今日しっかりと報われる日です。',
        'dailyInsights.career.7': '一見わかりにくいチャンスが近づいています——{sign}の直感がそれを見抜きます。',
        'dailyInsights.career.8': '今日は速さよりも戦略を。{careerStrength}を意図的に使っていきましょう。',
        'dailyInsights.career.9': '職場の誰かが、思っている以上にあなたを見ています。',
        # ─── dailyInsights.shadow ─────────────────────────────────────
        'dailyInsights.shadow.0': '{challenge}が今日、表に出てくるかもしれません。裁かずに気づきましょう。',
        'dailyInsights.shadow.1': '{sign}の影はこう問いかけます——真実をどこで避けているだろう?',
        'dailyInsights.shadow.2': '今日の緊張は{challenge}に関わること。気づくだけで、それは溶け始めます。',
        'dailyInsights.shadow.3': '{planet}が、未解決のまま残っていた何かを揺さぶります。逃げずに向き合いましょう。',
        'dailyInsights.shadow.4': '{element}の影が{challenge}へと引き寄せるかもしれません。代わりに{strength}を選んでみましょう。',
        'dailyInsights.shadow.5': '今日{challenge}に流されそうになったら、その奥にある本当の願いを問いましょう。',
        'dailyInsights.shadow.6': '繰り返してきたパターンを、宇宙が照らし出しています。',
        'dailyInsights.shadow.7': '影はあなたの敵ではなく、理解してほしいと願う{challenge}です。',
        'dailyInsights.shadow.8': '何かが{challenge}を刺激しても、成長はいつもと違う反応の中にあります。',
        'dailyInsights.shadow.9': '今日の問い——{strength}と{challenge}を、同時に抱えていられるでしょうか?',
        # ─── dailyInsights.caution ────────────────────────────────────
        'dailyInsights.caution.0': '一時的な気分で、永く残る決断をしないように。',
        'dailyInsights.caution.1': '{challenge}が自信のふりをして現れていないか、気をつけましょう。',
        'dailyInsights.caution.2': '今日のすべての戦いに、あなたのエネルギーを注ぐ必要はありません。賢く選びましょう。',
        'dailyInsights.caution.3': '今日は約束に注意。言葉は控えめに、行動は多めに。',
        'dailyInsights.caution.4': '{element}の性質が、少し強く出過ぎるかもしれません。抵抗を感じるところでは、力を抜きましょう。',
        'dailyInsights.caution.5': '今日は解決を急ぐ日ではありません。物事に呼吸の余地を残しましょう。',
        'dailyInsights.caution.6': '境界線を引き直す時間です——とくにエネルギーと時間の使い方に。',
        'dailyInsights.caution.7': '宇宙からの合図——急がなくていい。緊急に感じることが、本当に大切とは限りません。',
        'dailyInsights.caution.8': '心の平穏を守りましょう。返事を求められても、すべてに応える必要はありません。',
        'dailyInsights.caution.9': '{challenge}を、知らず知らず他人に映していないか、一度立ち止まりましょう。',
        # ─── dailyInsights.ritual ─────────────────────────────────────
        'dailyInsights.ritual.0': '60秒間目を閉じて、{element}があなたを包み込む様子を思い描きましょう。',
        'dailyInsights.ritual.1': '「{strength}」という言葉を手のひらか紙に書いて、今日の御守りに。',
        'dailyInsights.ritual.2': '片手を胸に当てて、静かに唱えましょう——「{sign}の直感を信じます」。',
        'dailyInsights.ritual.3': '30秒だけ外に出ましょう。風を感じて、{element}の感覚を取り戻します。',
        'dailyInsights.ritual.4': 'ゆっくり3回呼吸して、息を吐くたびに{challenge}の不安を一つずつ手放しましょう。',
        'dailyInsights.ritual.5': '温かいものを手に取り、1分間{planet}のエネルギーを迎え入れましょう。',
        'dailyInsights.ritual.6': '「{element}の自分は、今何を必要としている?」と問いかけ、最初に浮かんだ言葉に耳を傾けてください。',
        'dailyInsights.ritual.7': '今日の{dayTheme}が、自分にとって何を意味するかを一文だけ書いて、畳んで持ち歩きましょう。',
        'dailyInsights.ritual.8': '地に根付くものに触れ——木、石、あるいは自分の肌——{strength}を体に吸い込みましょう。',
        'dailyInsights.ritual.9': '今日のアファメーションを3回、小さな声で唱えましょう。胸の奥に響きが落ち着くまで。',
        # ─── reflection ────────────────────────────────────────────────
        'dailyInsights.reflection.0': '今日、{sign}らしさをもう少し大切にするとしたら、何ができるでしょう?',
        'dailyInsights.reflection.1': '{strength}を受け入れる姿は、今どんな形で現れるでしょう?',
        'dailyInsights.reflection.2': '{challenge}が、今どこで足を引っ張っているでしょう?',
        'dailyInsights.reflection.3': '{element}は、決断にどう影響していますか?',
        'dailyInsights.reflection.4': '{planet}は今日、どんなメッセージを送ってきていますか?',
        'dailyInsights.reflection.5': 'いちばん望ましい自分なら、今この瞬間、何を選ぶでしょう?',
        'dailyInsights.reflection.6': '{challenge}を、どうすれば力に変えられるでしょう?',
        'dailyInsights.reflection.7': '{area}について、直感は何と言っていますか?',
        'dailyInsights.reflection.8': '{element}の自分が自由に話せるなら、今日、何を求めるでしょう?',
        'dailyInsights.reflection.9': '{sign}の直感がすでに答えを知っているのに、避けていることはありませんか?',
        # ─── wellness ──────────────────────────────────────────────────
        'dailyInsights.wellness.0': '{element}らしさを、{selfCareActivity}で大切にしましょう。',
        'dailyInsights.wellness.1': '今日のあなたのエネルギーは、{wellnessAction}から力をもらいます。',
        'dailyInsights.wellness.2': '{sign}の頑張り癖に、丁寧な休息でバランスを。',
        'dailyInsights.wellness.3': '体が{wellnessAction}を求めています。悲鳴を上げる前に聴いてあげましょう。',
        'dailyInsights.wellness.4': '{element}は今日{nurturing}を必要としています——贅沢ではなく、心の燃料です。',
        'dailyInsights.wellness.5': 'セルフケアの時間が、今日は宇宙のリズムと調和します。',
        'dailyInsights.wellness.6': '{selfCareActivity}を短く実践するだけでも、一日のエネルギーは大きく変わります。',
        'dailyInsights.wellness.7': '{sign}は押しすぎがち。今日は、反対側に少し重心を戻してあげましょう。',
        'dailyInsights.wellness.8': '宇宙からの優しい合図——体が休みを求めているとき、その休息は立派な生産性です。',
        'dailyInsights.wellness.9': '体と心のつながりは、気づきによって深まります。',
    },
    'ko': {
        # ─── home ──────────────────────────────────────────────────────
        'home.subtitle': '오늘 우주가 전하는 메시지',
        'home.streak': '{{n}}일 연속이에요. 이대로 계속 가요.',
        'home.savedToday': '오늘 저장한 것',
        'home.savedHighlights': '저장한 하이라이트',
        'home.xpProgress': 'XP 진행도',
        'home.seeker': '탐구자',
        'home.removedFromSaved': '저장에서 지웠어요',
        'home.savedToHighlights': '하이라이트에 저장했어요',
        'home.ritualReady.title': '오늘의 의식이 기다리고 있어요.',
        'home.ritualReady.sub': '카드 한 장을 뽑고, 떠오르는 한 문장을 솔직하게 적어보세요.',
        # ─── horoscope ─────────────────────────────────────────────────
        'horoscope.subtitle': '오늘 우주가 전하는 예보',
        # ─── dailyInsights.general ────────────────────────────────────
        'dailyInsights.general.0': '우주의 에너지가 오늘 {focus}를 응원하고 있어요.',
        'dailyInsights.general.1': '우주가 {theme}로 이끌고 있어요. 믿어보세요.',
        'dailyInsights.general.2': '{strength}이 오늘의 흐름과 자연스럽게 맞닿아요.',
        'dailyInsights.general.3': '별들이 {element} 본성을 받아들이라고 가만히 권하고 있어요.',
        'dailyInsights.general.4': '오늘의 행성 흐름이 타고난 {talent}을 돋보이게 해요.',
        'dailyInsights.general.5': '수호성 {planet}이 오늘의 결심을 조용히 받쳐줘요.',
        'dailyInsights.general.6': '우주의 지혜가 오늘은 {area}에 마음을 두라고 말하고 있어요.',
        'dailyInsights.general.7': '표면 아래에서 무언가 움직이고 있어요. {element} 직감을 따라가 보세요.',
        'dailyInsights.general.8': '오늘은 속도보다 깊이예요. {talent}을 자연스럽게 펼쳐보세요.',
        'dailyInsights.general.9': '천상의 흐름이 {quality} 에너지와 함께 {area}로 데려다줘요.',
        # ─── dailyInsights.love ───────────────────────────────────────
        'dailyInsights.love.0': '{loveStyle}한 사랑의 방식이 의미 있는 인연을 끌어당겨요.',
        'dailyInsights.love.1': '금성의 에너지가 타고난 매력을 더 선명하게 해줘요.',
        'dailyInsights.love.2': '감정에 솔직한 하루가 연인 관계를 깊게 만들어요.',
        'dailyInsights.love.3': '{element} 본성이 관계에 {quality}을 더해줘요.',
        'dailyInsights.love.4': '별들이 사랑하는 사람과의 진심 어린 대화를 응원하고 있어요.',
        'dailyInsights.love.5': '{sign}의 끌림이 강해졌어요. 다만 겉모습보다 깊이를 위해 써보세요.',
        'dailyInsights.love.6': '오늘은 연애에서 {loveAction}이 좋아요.',
        'dailyInsights.love.7': '가까운 누군가가, 참아왔던 한 마디를 기다리고 있어요.',
        'dailyInsights.love.8': '{loveStyle}한 당신의 사랑이, 지금 누군가에게 필요해요.',
        'dailyInsights.love.9': '오늘의 에너지는 사랑을 주고받는 방식 속 오래된 상처를 어루만져요.',
        # ─── dailyInsights.career ─────────────────────────────────────
        'dailyInsights.career.0': '{careerStrength}이 오늘 직업적 기회를 가져다줘요.',
        'dailyInsights.career.1': '별들이 커리어에서 {workActivity}를 응원하고 있어요.',
        'dailyInsights.career.2': '업무 판단에서는 {sign}다운 직감을 믿어보세요.',
        'dailyInsights.career.3': '타고난 {talent}이 오늘 새로운 문을 열어줘요.',
        'dailyInsights.career.4': '커리어의 진전은 {approach}라는 형태로 찾아와요.',
        'dailyInsights.career.5': '우주가 야심찬 목표를 응원하고 있어요.',
        'dailyInsights.career.6': '조용한 실력이 제대로 인정받는 하루예요.',
        'dailyInsights.career.7': '한눈에 보이지 않는 기회가 다가와요——{sign} 직감이 알아챌 거예요.',
        'dailyInsights.career.8': '오늘은 속도보다 전략이에요. {careerStrength}을 의도적으로 써보세요.',
        'dailyInsights.career.9': '직장의 누군가가, 생각보다 더 유심히 지켜보고 있어요.',
        # ─── dailyInsights.shadow ─────────────────────────────────────
        'dailyInsights.shadow.0': '{challenge}이 오늘 표면 위로 올라올 수 있어요. 판단 없이 알아차려보세요.',
        'dailyInsights.shadow.1': '{sign}의 그림자가 물어요——어디서 진실을 피하고 있나요?',
        'dailyInsights.shadow.2': '오늘의 긴장점은 {challenge}. 알아차리는 것만으로도 녹기 시작해요.',
        'dailyInsights.shadow.3': '{planet}이 해결되지 않은 무언가를 흔들어요. 도망치지 말고 함께 머물러요.',
        'dailyInsights.shadow.4': '{element} 그림자가 {challenge}로 당길 수 있어요. 대신 {strength}을 선택해봐요.',
        'dailyInsights.shadow.5': '오늘 {challenge}에 기울어질 때, 그 밑에 숨은 진짜 욕구를 물어보세요.',
        'dailyInsights.shadow.6': '반복해온 패턴을, 우주가 비추고 있어요.',
        'dailyInsights.shadow.7': '그림자는 적이 아니라, 이해받고 싶어하는 {challenge}예요.',
        'dailyInsights.shadow.8': '오늘 {challenge}을 건드리는 일이 있어도, 성장은 평소와 다른 반응에 있어요.',
        'dailyInsights.shadow.9': '오늘의 질문——{strength}과 {challenge}을, 동시에 품을 수 있을까요?',
        # ─── dailyInsights.caution ────────────────────────────────────
        'dailyInsights.caution.0': '일시적인 기분으로, 오래갈 결정을 내리지 마세요.',
        'dailyInsights.caution.1': '{challenge}이 자신감으로 가장하고 있지 않은지 살펴봐요.',
        'dailyInsights.caution.2': '오늘의 모든 싸움에 에너지를 쏟을 필요는 없어요. 현명하게 골라요.',
        'dailyInsights.caution.3': '오늘은 약속을 조심. 말은 적게, 행동은 확실하게.',
        'dailyInsights.caution.4': '{element} 본성이 조금 세게 밀어붙일 수 있어요. 저항이 느껴지는 곳에서는 힘을 빼요.',
        'dailyInsights.caution.5': '오늘은 해결을 몰아붙일 날이 아니에요. 일이 숨 쉴 틈을 남겨둬요.',
        'dailyInsights.caution.6': '경계선을 다시 긋는 시간——특히 에너지와 시간 주변에서요.',
        'dailyInsights.caution.7': '우주가 조언해요——서두르지 마세요. 급해 보이는 일이 꼭 중요하지는 않아요.',
        'dailyInsights.caution.8': '평온을 지켜요. 반응을 요구한다고 해서, 모두에게 답할 필요는 없어요.',
        'dailyInsights.caution.9': '{challenge}을 남에게 투사하고 있지 않은지, 반응하기 전에 한 번 짚어봐요.',
        # ─── dailyInsights.ritual ─────────────────────────────────────
        'dailyInsights.ritual.0': '60초간 눈을 감고, {element}이 감싸는 모습을 떠올려요.',
        'dailyInsights.ritual.1': '"{strength}"을 손바닥이나 종이에 적어요. 오늘의 부적이 돼줄 거예요.',
        'dailyInsights.ritual.2': '한 손을 가슴에 얹고 조용히 말해요——"{sign}의 직감을 믿어."',
        'dailyInsights.ritual.3': '30초만 밖으로 나가요. 공기를 느끼면서 {element} 본성을 리셋해요.',
        'dailyInsights.ritual.4': '느린 호흡 세 번. 숨을 내쉴 때마다 {challenge}에 대한 걱정 하나를 놓아줘요.',
        'dailyInsights.ritual.5': '따뜻한 것을 손에 쥐고, 1분간 {planet}의 에너지를 들여보내요.',
        'dailyInsights.ritual.6': '"{element}의 나는 지금 뭐가 필요해?" 물어보고, 가장 먼저 떠오른 말에 귀를 기울여요.',
        'dailyInsights.ritual.7': '오늘 {dayTheme}이 나에게 어떤 의미인지 한 문장 적어, 접어서 곁에 둬요.',
        'dailyInsights.ritual.8': '땅에 닿는 것에 손을 대요——나무, 돌, 내 피부——{strength}을 들이마셔요.',
        'dailyInsights.ritual.9': '오늘의 다짐을 세 번 속삭여요. 가슴에 울림이 자리 잡을 때까지.',
        # ─── wellness ──────────────────────────────────────────────────
        'dailyInsights.wellness.0': '{element} 본성을 {selfCareActivity}로 돌봐주세요.',
        'dailyInsights.wellness.1': '오늘의 에너지는 {wellnessAction}에서 힘을 얻어요.',
        'dailyInsights.wellness.2': '{sign}의 밀어붙이는 기질을, 의식적인 휴식으로 달래줘요.',
        'dailyInsights.wellness.3': '몸이 {wellnessAction}을 원하고 있어요. 비명이 되기 전에 들어주세요.',
        'dailyInsights.wellness.4': '{element}이 오늘 {nurturing}을 필요로 해요. 사치가 아니라 진짜 연료예요.',
        'dailyInsights.wellness.5': '셀프케어의 시간이, 오늘은 우주의 리듬과 맞아 떨어져요.',
        'dailyInsights.wellness.6': '{selfCareActivity}을 짧게 해보는 것만으로도, 하루 에너지가 달라질 수 있어요.',
        'dailyInsights.wellness.7': '{sign}은 무리하기 쉬워요. 오늘은 반대쪽으로 살짝 무게중심을 옮겨봐요.',
        'dailyInsights.wellness.8': '몸이 쉬자고 할 때, 그 휴식은 훌륭한 생산성이에요.',
        'dailyInsights.wellness.9': '몸과 마음의 연결은, 알아차림으로 더 단단해져요.',
    },
    'zh': {
        # ─── home ──────────────────────────────────────────────────────
        'home.subtitle': '今日宇宙捎来的讯息',
        'home.streak': '已连续 {{n}} 天,继续保持。',
        'home.dayStreakLabel': '天连续',  # Fix: 连胜 → 连续
        'home.savedToday': '今日已保存',
        'home.savedHighlights': '已保存的亮点',
        'home.xpProgress': '经验进度',
        'home.seeker': '探寻者',
        'home.ritualReady.title': '今日的仪式正在等你。',
        'home.ritualReady.sub': '抽一张牌,再把心里浮现的一句话,诚实地写下来。',
        # ─── horoscope ─────────────────────────────────────────────────
        'horoscope.subtitle': '今日宇宙的预报',
        # ─── dailyInsights.general ────────────────────────────────────
        'dailyInsights.general.0': '宇宙的能量今天正在助推你的{focus}。',
        'dailyInsights.general.1': '宇宙正引导你走向{theme},信任这份指引吧。',
        'dailyInsights.general.2': '你的{strength}在今天的气场里自然发挥。',
        'dailyInsights.general.3': '星辰轻声邀请你,接纳自己{element}的本性。',
        'dailyInsights.general.4': '今日的行星律动,让你与生俱来的{talent}更加醒目。',
        'dailyInsights.general.5': '守护星{planet}在今天默默撑着你的决心。',
        'dailyInsights.general.6': '宇宙的智慧提示——今天把心放在{area}上。',
        'dailyInsights.general.7': '水面下有东西在涌动,让{element}的直觉带路吧。',
        'dailyInsights.general.8': '今天更重深度而非速度——让{talent}自然地舒展开来。',
        'dailyInsights.general.9': '天流载着{quality}的能量,把你推向{area}。',
        # ─── dailyInsights.love ───────────────────────────────────────
        'dailyInsights.love.0': '你{loveStyle}的爱的姿态,吸引有意义的缘分。',
        'dailyInsights.love.1': '金星的能量让你的魅力更鲜明。',
        'dailyInsights.love.2': '对情绪诚实的一天,让恋情更深。',
        'dailyInsights.love.3': '你的{element}本性,为关系带来{quality}。',
        'dailyInsights.love.4': '星辰支持你与所爱之人真心对话。',
        'dailyInsights.love.5': '{sign}的吸引力在放大——但请为深度而用,而非表象。',
        'dailyInsights.love.6': '今天恋爱以{loveAction}为宜。',
        'dailyInsights.love.7': '身边有人,正等着你说出一直没说的话。',
        'dailyInsights.love.8': '你{loveStyle}的爱,正是此刻某人所需要的。',
        'dailyInsights.love.9': '今天的能量,抚平你在给予与接受中留下的旧伤。',
        # ─── dailyInsights.career ─────────────────────────────────────
        'dailyInsights.career.0': '{careerStrength}今天把职业机会带到你面前。',
        'dailyInsights.career.1': '星辰为你在事业路上的{workActivity}撑腰。',
        'dailyInsights.career.2': '在商业决策里,相信{sign}的直觉。',
        'dailyInsights.career.3': '与生俱来的{talent}今天为你开门。',
        'dailyInsights.career.4': '事业的前进,以{approach}的方式到来。',
        'dailyInsights.career.5': '宇宙支持你的雄心与目标。',
        'dailyInsights.career.6': '这是一个静水深流的能耐被看见的日子。',
        'dailyInsights.career.7': '一个不那么显眼的机会正在靠近——{sign}的直觉会发现它。',
        'dailyInsights.career.8': '今天工作上策略优先,有意识地使用{careerStrength}。',
        'dailyInsights.career.9': '职场上,有人比你以为的更在意你。',
        # ─── dailyInsights.shadow ─────────────────────────────────────
        'dailyInsights.shadow.0': '{challenge}今天可能浮上来——不带评判地去觉察它。',
        'dailyInsights.shadow.1': '{sign}的阴影在问——你在哪里回避真相?',
        'dailyInsights.shadow.2': '今天的紧绷点是{challenge}——光是觉察就开始松动。',
        'dailyInsights.shadow.3': '{planet}搅动了未解的事,别逃开,与它并坐片刻。',
        'dailyInsights.shadow.4': '你的{element}阴影可能把你拉向{challenge}——改选{strength}。',
        'dailyInsights.shadow.5': '今天若被{challenge}牵着走,追问它底下真正想要的是什么。',
        'dailyInsights.shadow.6': '你反复绕行的模式,正被宇宙照亮。',
        'dailyInsights.shadow.7': '阴影不是敌人,它是渴望被理解的{challenge}。',
        'dailyInsights.shadow.8': '今天若被{challenge}触动,成长藏在与平常不同的回应里。',
        'dailyInsights.shadow.9': '今天的问——{strength}和{challenge},可以同时存在吗?',
        # ─── dailyInsights.caution ────────────────────────────────────
        'dailyInsights.caution.0': '不要用一时的心情,做长久的决定。',
        'dailyInsights.caution.1': '留意{challenge}有没有在伪装成自信。',
        'dailyInsights.caution.2': '今天不是每场战役都值得你的能量——明智地挑。',
        'dailyInsights.caution.3': '今天承诺要慎重——话说得少,事做得足。',
        'dailyInsights.caution.4': '{element}本性今天可能推得过头——感到抗拒就松一松。',
        'dailyInsights.caution.5': '今天不是强推解决的日子——给事情留下呼吸的空间。',
        'dailyInsights.caution.6': '界线需要加固——尤其是关于能量与时间的。',
        'dailyInsights.caution.7': '宇宙在说:不用急——看起来紧迫的,未必重要。',
        'dailyInsights.caution.8': '守住内在的安静——不是每一声要求,都必须被回应。',
        'dailyInsights.caution.9': '会不会把{challenge}投射到别人身上了?反应之前,先看一眼。',
        # ─── dailyInsights.ritual ─────────────────────────────────────
        'dailyInsights.ritual.0': '闭眼六十秒,想象{element}的能量把你轻轻包起来。',
        'dailyInsights.ritual.1': '把"{strength}"写在手心或纸上,作为今日的护符。',
        'dailyInsights.ritual.2': '一手按在心口,轻声说——"我相信{sign}的直觉。"',
        'dailyInsights.ritual.3': '到户外三十秒。感受风,让{element}的本性重新归位。',
        'dailyInsights.ritual.4': '慢呼吸三次,每次呼气,放下一个关于{challenge}的念头。',
        'dailyInsights.ritual.5': '握住温暖的东西,让{planet}的能量进入你一分钟。',
        'dailyInsights.ritual.6': '问自己:"{element}的我,现在需要什么?"听第一个冒出来的词。',
        'dailyInsights.ritual.7': '写一句话:今天的{dayTheme}对我意味着什么。折起来带在身上。',
        'dailyInsights.ritual.8': '触碰一件踏实的东西——木、石,或者自己的皮肤——把{strength}吸进身体。',
        'dailyInsights.ritual.9': '今日的肯定语,轻声重复三遍,直到胸口有回响。',
        # ─── wellness ──────────────────────────────────────────────────
        'dailyInsights.wellness.0': '用{selfCareActivity}来照顾你的{element}本性。',
        'dailyInsights.wellness.1': '今天的能量从{wellnessAction}中获益。',
        'dailyInsights.wellness.2': '{sign}的冲劲,需要有意识的休息来配平。',
        'dailyInsights.wellness.3': '身体在要{wellnessAction},别等它喊出声才听。',
        'dailyInsights.wellness.4': '你里面的{element}今天需要{nurturing}——那不是奢侈,是燃料。',
        'dailyInsights.wellness.5': '自我照顾今天与宇宙的节奏同步。',
        'dailyInsights.wellness.6': '一小段{selfCareActivity}就能换来一整天的能量。',
        'dailyInsights.wellness.7': '{sign}的撑劲,今天需要一个反向的平衡。',
        'dailyInsights.wellness.8': '当身体提出休息,那份休息就是高效。',
        'dailyInsights.wellness.9': '身与心的连结,因觉察而更深。',
    },
}

def set_nested(d, path, value):
    parts = path.split('.')
    # Detect numeric index for array positions
    for i, p in enumerate(parts[:-1]):
        if p.isdigit():
            # Shouldn't happen with our keys — arrays are leaf level
            return False
        if p not in d:
            return False
        d = d[p]
    last = parts[-1]
    if last.isdigit():
        idx = int(last)
        if isinstance(d, list) and idx < len(d):
            d[idx] = value
            return True
        return False
    else:
        if isinstance(d, dict):
            d[last] = value
            return True
        return False

total = 0
skipped_keys = {'ja': [], 'ko': [], 'zh': []}

for lang, updates in PATCHES.items():
    path = f'C:/Users/lmao/TAROT/src/i18n/locales/{lang}/app.json'
    with open(path, 'r', encoding='utf-8') as f:
        doc = json.load(f)
    applied = 0
    for key, value in updates.items():
        if set_nested(doc, key, value):
            applied += 1
            total += 1
        else:
            skipped_keys[lang].append(key)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{lang}: {applied}/{len(updates)} keys polished')
    if skipped_keys[lang]:
        print(f'  skipped: {skipped_keys[lang][:5]}')

print(f'\nTotal keys polished: {total}')
