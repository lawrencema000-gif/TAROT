# Cece.com Complete Feature Inventory — 2026-04-24

**Purpose:** Exhaustive, category-by-category inventory of every feature Cece (测测) ships across every locale and surface, with a priority/effort call for each. Builds on and supersedes `CECE-MISSING-FEATURES-FULL.md` (23 Apr) and `CECE-COMPETITIVE-ANALYSIS.md` (23 Apr).

**Scope:** cece.com web + xxwolo.com + iOS App Store CN (v10.37.0, 449 MB, 4.6★, 35k reviews) + Google Play international (`com.lingocc.cc5`, LIGHTFUL AI SINGAPORE) + Android CN (`com.xxwolo.cc5`) + Rest of World + 36kr + GeekPark deep-dive + Xinhuanet founder interview + SCMP + Zhihu + Apptopia.

**Legend:**
- **We ship?** Y / N / P (partial)
- **Cece ships?** Y / N / P / ? (unverified)
- **Priority:** P0 ship-in-next-2-sprints · P1 next quarter · P2 opportunistic · P3 low/skip · DROP don't build
- **Effort:** S <1d · M 1-5d · L 1-4w · XL 1-3mo
- **Confirmation:** ✓ confirmed by 2+ sources · ~ single source · ? unverified

---

## 1. Divination surfaces

Cece leads with astrology depth (20 chart variants, professional-grade) and adds light Chinese divination sprinklings. Notably does NOT do face/palm/fortune-sticks/fengshui — their brand is psychology+astrology, not folk divination.

| Feature | We ship? | Cece ships? | Priority | Effort | Notes / how Cece implements |
|---|---|---|---|---|---|
| Western tarot — daily card + spreads | Y | Y | — | — | Confirmed (~). Cece uses tarot as an AI-Q&A input modality, not as a standalone 78-card corpus. |
| Tarot reversals, yes/no, card meanings library | Y | P | — | — | Our depth exceeds Cece. |
| Tarot deck variants / skins | N | ? | P3 | M | Unverified — likely 1 default deck only. |
| Natal chart (full graphic wheel) | P (sign/moon/rising) | Y ✓ | P1 | M | Cece renders the full wheel with planets+houses+aspects. |
| Natal chart — 20+ variants (Astrolog32, Janus, Winstar, Zet style) | N | Y ✓ | P2 | L | Confirmed via multiple Chinese listings. Power-user feature. |
| Transit chart (行运盘) | N | Y ✓ | P1 | M | Daily planet-on-natal transits. |
| Solar return (日返盘) | N | Y ✓ | P1 | M | Annual birthday-chart — high-priced premium report staple. |
| Lunar return (月返盘) | N | Y ✓ | P2 | M | Monthly. |
| Secondary progressions (次限推运) | N | Y ✓ | P2 | M | Pro-astrology feature. |
| Tertiary progressions (三限盘) | N | Y ~ | P3 | M | Edge case. |
| Solar arc directions (太阳弧) | N | Y ✓ | P3 | M | Pro-astrology feature. |
| Firdaria (法达盘) | N | Y ~ | P3 | M | Traditional Persian timing technique. |
| Synastry / comparison chart (比较盘) | N | Y ✓ | P1 | M | 2-person relationship chart. |
| Composite / midpoint chart (组合盘) | N | Y ✓ | P1 | M | Single-chart-for-couple. |
| Composite progressions (组合推运) | N | Y ✓ | P3 | M | Pro compat timing. |
| Davison / time-space chart (时空中点盘) | N | Y ~ | P3 | M | Niche astrology. |
| Astrocartography (马克思盘 / Astro*Carto*Graphy) | N | Y ✓ | P1 | L | World-map of planetary lines — viral + gift-able. |
| Birth time rectification tool | N | Y ~ | P2 | L | Pro feature; walks user through event-matching. |
| 28 Lunar Mansions (二十八宿) | N | Y ~ | P3 | S | Confirmed in one Chinese listing. |
| I-Ching / 64 hexagrams | N | ? | P0 | M | Unclear if Cece ships this or just references it. Either way we should ship. |
| I-Ching coin-toss animation | N | ? | P0 | S | Shipping alongside hexagrams. |
| I-Ching changing lines interpretation | N | ? | P1 | S | |
| 六爻 (Six Lines divination) | N | N ~ | DROP | — | Not a Cece feature. Skip. |
| 梅花易数 (Plum Blossom) | N | N ~ | DROP | — | Too niche for our market. |
| Bazi 八字 / Four Pillars — basic | N | ~ (GP listing says "八字") | P1 | L | The GP international listing's title literally reads "星座,八字,AI问答". Implementation depth unclear. |
| Bazi — 大运 major luck cycles | N | ? | P2 | M | Unverified. |
| Bazi — 流年 annual luck | N | ? | P2 | M | Unverified. |
| Bazi — Ten Gods (十神) + Nayin (纳音) | N | ? | P3 | M | Unverified. |
| Ziwei Doushu (紫微斗数) — 12 palaces | N | N ~ | P3 | XL | No evidence Cece ships it; too heavyweight. |
| Human Design chart | N | Y ✓ | P0 | M | Rest of World confirms. Generator/Projector/Manifestor/Reflector + strategy + authority + profile. |
| Human Design decoder (gates, channels, centers) | N | ? | P1 | M | |
| Runes (Elder Futhark) | N | N ~ | P3 | M | Not a Cece feature. |
| Dice oracle (3-dice divination) | N | Y ✓ | P2 | S | Explicitly listed as a Cece tool alongside tarot. |
| 黄历 daily almanac (宜/忌) | N | N ~ | DROP | — | No evidence. Skip. |
| 择日 auspicious date picker | N | N ~ | DROP | — | No evidence. |
| Numerology — Life Path | Y | Y ~ | — | — | |
| Numerology — name/destiny/expression numbers | N | ? | P2 | S | Unverified but easy to add regardless. |
| 姓名学 Chinese name numerology | N | N ~ | P3 | M | Not a Cece feature. |
| Face reading 面相 (AI selfie) | N | N ✓ | DROP | XL | Cece explicitly does NOT do this (App Store risk, their brand). |
| Palm reading 手相 (AI photo) | N | N ✓ | DROP | XL | Same. |
| Dream interpreter (symbolic + AI) | N | ? | P1 | M | Not surfaced in Cece scrapes but a natural AI-Q&A target. |
| Feng shui Bagua / room map | N | N ~ | P3 | L | Not a Cece feature. |
| Crystal / gemstone guide | P | N ~ | P3 | S | We already have it; Cece doesn't. Our win. |
| Angel numbers | N | N ~ | P3 | S | Not a Cece feature; very popular in EN TikTok. |
| 抽签 fortune sticks (temple) | N | N ~ | DROP | — | Not a Cece feature. |
| 测字 character divination | N | N ~ | DROP | — | Not a Cece feature. |
| Bazi 生肖 compatibility (12-animals) | Y | Y ~ | — | — | We just shipped. |
| Moon phase calendar / phase-by-day | P | ? | P2 | S | Likely live as widget in Cece; we have it as content. |
| 3D psychological sandbox (virtual sand tray) | N | Y ✓ | P2 | XL | Cece's signature — 3D native in-app, Jungian projection. ~30MB asset budget if cloned lean. |
| Emotion pick cards (Pick卡) | N | Y ✓ | P1 | S | Swipe-a-card daily quick fun-test. Viral-ready. |
| "Love Tree" 爱情树 — attachment visualizer | N | Y ✓ | P1 | S | Gameified attachment-style flow. |
| Lucky Map 幸运地图 (lucky cities + peach-blossom cities) | N | Y ✓ | P0 | M | Uses astrocartography + birth data to rank cities for romance/career/luck. Highly shareable. |

---

## 2. AI features

Cece's Xinyuan LLM (心元大模型) is the **only** state-registered (Cyberspace Administration, 2024) emotional-support model in China. Four named AI agents so far.

| Feature | We ship? | Cece ships? | Priority | Effort | Notes |
|---|---|---|---|---|---|
| AI tarot interpretation | Y | Y ✓ | — | — | |
| AI persona #1 — 陪伴小星 (Companion Little Star) | N | Y ✓ | P0 | L | Proactive, remembers, morning-greets. |
| AI persona #2 — 知心姐姐 (Caring Sister) | N | Y ✓ | P0 | L | Warm tone. |
| AI persona #3 — 理性学长 (Rational Senior) | N | Y ✓ | P0 | L | Analytical tone. |
| AI persona #4 — 明朗 (Bright/Clear) | N | Y ✓ | P0 | L | Upbeat tone. |
| AI persona #5 — 测测AI (general) | N | Y ✓ | P0 | L | Utility assistant. |
| AI persona #6 — 灵犀AI / 小智AI | N | Y ✓ | P1 | L | 6 personas total per GeekPark. |
| AI 3-second smart Q&A | N | Y ✓ | P0 | M | "Ask a question, 3-sec AI reading." Cece's flagship daily hook. |
| AI memory (multi-session) via pgvector or equivalent | N | Y ✓ | P0 | M | Agent remembers past chats, chart, quizzes. |
| AI proactive push ("你睡不着吗？") | N | Y ✓ | P1 | M | Cron + behavior trigger → notification. |
| AI voice / TTS replies | N | ? | P2 | S | Unverified; 8000+ astrologers DO reply by voice. |
| AI speech-to-text input | N | ? | P2 | S | Unverified. |
| AI chart interpreter ("explain my Moon in Cap") | N | Y ~ | P1 | M | Chart-aware answers — high differentiator. |
| AI journal coach | N | ? | P1 | M | Unverified but natural on top of mood-diary. |
| AI dream interpreter | N | ? | P1 | M | Unverified. |
| AI sandplay symbol analysis | N | Y ✓ | P3 | L | Interprets objects placed in 3D sandbox. |
| AI Psychologist Copilot (B2B — aids human advisors) | N | Y ✓ | P3 | XL | Later. |
| Group AI sessions (multiple users + 1 AI) | N | ? | P3 | L | Unverified. |
| OCR — screenshot → reading | N | ? | P3 | M | Unverified. |
| Image upload (selfie → mood read) | N | ? | P3 | M | Unverified. |
| Proprietary state-registered LLM | N | Y ✓ | DROP | XL | Not applicable to us — we use Anthropic/OpenAI. |

---

## 3. Quizzes / tests

Cece advertises "50+ psychology tests" — MBTI alone has 11.7M participants. We have 9 today.

| Feature | We ship? | Cece ships? | Priority | Effort | Notes |
|---|---|---|---|---|---|
| MBTI (full + quick) | Y | Y ✓ | — | — | |
| Big Five / OCEAN | Y | Y ~ | — | — | |
| Enneagram | Y | Y ~ | — | — | |
| Attachment style | Y | Y ~ | — | — | Cece bundles as "Love Tree". |
| Love Languages | Y | Y ~ | — | — | |
| Mood Check-In | Y | Y ✓ | — | — | |
| Shadow archetype | Y | ? | — | — | |
| Element affinity | Y | ? | — | — | |
| Tarot Court match | Y | N ~ | — | — | Our win. |
| Dark Triad | N | Y ~ | P2 | S | |
| DISC | N | Y ~ | P2 | S | |
| Jungian cognitive functions | N | Y ~ | P2 | S | |
| 4 Love Styles (Perel) | N | ? | P2 | S | |
| Parenting style | N | ? | P3 | S | |
| Communication style | N | Y ~ | P2 | S | |
| Conflict style (Thomas-Kilmann) | N | Y ~ | P2 | S | |
| Decision-making style | N | ? | P3 | S | |
| Money personality | N | ? | P1 | S | Financial-wellness crossover. |
| Grief style | N | ? | P3 | S | |
| Boundaries | N | Y ~ | P1 | S | |
| Social anxiety | N | ? | P2 | S | |
| Burnout (Maslach-lite) | N | Y ~ | P1 | S | |
| Learning style (VARK) | N | ? | P2 | S | |
| Chronotype (Lion/Bear/Wolf/Dolphin) | N | ? | P2 | S | |
| Creative type | N | ? | P2 | S | |
| Leadership style | N | ? | P2 | S | |
| Empath / HSP | N | ? | P2 | S | |
| Inner critic | N | ? | P2 | S | |
| Self-compassion | N | ? | P2 | S | |
| Trauma response (fight/flight/freeze/fawn) | N | ? | P1 | S | |
| Career archetype report | P | Y ✓ | P0 | M | Cece's "Occupational Talent Report" — premium pay-per-report. |
| Spiritual-type quiz | N | ? | P2 | S | |
| Partner compatibility (dual-MBTI) | N | Y ✓ | P0 | M | THE viral mechanic — pair your MBTI with friend's. |
| Partner compatibility (astro synastry quiz flow) | P | Y ✓ | P1 | M | |
| "Friend MBTI distribution" visualizer | N | Y ✓ | P1 | M | "16 types in your friend circle" graph. |
| Daily 3-Q micro-quiz | N | Y ✓ | P1 | M | Tiny daily habit → weekly insight. |
| Depression screener (PHQ-2-ish) | N | ? | P1 | S | Must be non-diagnostic, labelled. |
| "What brings you here" onboarding quiz | N | Y ~ | P2 | S | |
| Pop-culture quizzes (Hogwarts house etc) | N | N ~ | P3 | S | Not Cece's brand but viral. |

---

## 4. Daily engagement hooks

| Feature | We ship? | Cece ships? | Priority | Effort | Notes |
|---|---|---|---|---|---|
| Daily horoscope (Western) | Y | Y ✓ | — | — | Cece computes at astronomical-observatory sync 00:00. |
| Daily Chinese horoscope | P | Y ~ | P2 | S | |
| Daily fortune — multi-dimension (love / career / health / luck / lucky color / lucky number) | P | Y ✓ | P1 | M | Cece ships 6-dim fortune card. |
| Daily energy mission (每日能量任务) | N | Y ✓ | P1 | S | Gamified "do 1 thing today" prompt. |
| Daily AI check-in push ("good morning") | N | Y ✓ | P0 | S | Scheduled persona message. |
| Evening AI check-in ("how was today?") | N | Y ✓ | P0 | S | |
| Daily mood log → 30-day curve (emotion diary) | N | Y ✓ | P0 | M | Premium feature per App Store IAP. |
| Daily pick card | N | Y ✓ | P1 | S | Single-card draw. |
| Daily check-in rewards (7-day ladder) | N | ? | P1 | S | Unverified — most CN apps do this. |
| Streak | Y | Y ~ | — | — | |
| Streak protection day | N | ? | P2 | S | |
| Re-engagement push (3-day silence) | N | Y ~ | P1 | S | |
| Seasonal events (Lunar New Year, 七夕, solstice) | N | ? | P2 | M | Unverified but virtually guaranteed. |
| Full moon / new moon events | N | ? | P2 | S | |
| Solar term (24 节气) content | N | ? | P3 | S | |
| iOS home-screen widget | N | ? | P2 | S | Unverified. iOS 13+ min → technically possible. |
| iOS lock-screen widget | N | ? | P2 | S | Unverified. |
| iOS Live Activity | N | ? | P3 | S | |
| Dynamic Island | N | ? | P3 | S | |
| Apple Watch complication | N | ? | P3 | M | |
| Siri shortcut | N | ? | P3 | S | |
| Push notification: morning fortune | N | Y ✓ | P1 | S | |
| Push notification: moon phase | N | ? | P2 | S | |
| Push notification: advisor live / creator going live | N | Y ~ | P2 | S | |
| Push notification: AI persona "thinking of you" | N | Y ✓ | P1 | S | |
| Birthday / anniversary reminders | N | ? | P2 | S | |

---

## 5. Social + community

The single biggest category — this is where Cece's retention lives.

| Feature | We ship? | Cece ships? | Priority | Effort | Notes |
|---|---|---|---|---|---|
| Public feed (post / like / comment / share) | N | Y ✓ | P0 | L | |
| Topic channels / interest tags | N | Y ✓ | P0 | S | Tarot / astro / moon / shadow / career. |
| Anonymous confessional (心理树洞 / "whispering well") | N | Y ✓ | P0 | M | "Even small voices are heard." Core engagement driver. |
| Interest-based user matching (similar MBTI / chart) | N | Y ✓ | P1 | L | |
| User profile pages (public) | N | Y ✓ | P1 | M | |
| Public post from reading ("share this result") | N | Y ~ | P1 | S | |
| Comments + threaded replies | N | Y ✓ | P1 | S | |
| Reactions (beyond like — mystical emoji set) | N | ? | P2 | S | |
| Follow / unfollow | N | Y ~ | P1 | M | |
| Friend system (mutual) | N | Y ~ | P2 | M | Cece uses WeChat graph. |
| Friend MBTI distribution chart | N | Y ✓ | P1 | M | |
| Direct messages 1:1 (text) | N | Y ✓ | P1 | L | |
| Group chats / topic rooms | N | Y ~ | P2 | L | |
| Live audio rooms (Clubhouse-style) | N | Y ✓ | P1 | L | 连麦 — co-host / bring-listener-onstage. |
| Live video / broadcast | N | Y ~ | P3 | L | Cece Live branches off via xxwolo.com/live. |
| Live audio gifting (tip with coins) | N | Y ✓ | P1 | M | |
| Live room co-host (连麦) | N | Y ✓ | P2 | S | |
| Scheduled group readings (full-moon live) | N | Y ~ | P2 | S | |
| Workshop tickets (paid event) | N | Y ~ | P3 | M | |
| Public/private room toggle | N | Y ✓ | P2 | S | |
| Reshare a reading as story / post | N | Y ~ | P1 | S | |
| Block / mute / report | N | Y ✓ | P0 | M | |
| Auto-moderation (text + image) | N | Y ~ | P0 | M | |
| Mod dashboard for admins | N | Y ✓ | P0 | M | |
| Community search | N | Y ~ | P2 | M | |
| Polls in posts | N | ? | P3 | S | |
| Ephemeral stories / 24h whispers | N | ? | P3 | S | |
| Leaderboards / rankings | N | ? | P3 | M | |
| Zodiac-based matchmaking event | N | Y ~ | P2 | M | Cece ran Qianfoshan matchmaking real-world event. |
| Real-world offline event listings | N | Y ~ | P3 | M | Same. |

---

## 6. Personalization / profile

| Feature | We ship? | Cece ships? | Priority | Effort | Notes |
|---|---|---|---|---|---|
| Birth-data onboarding | Y | Y ✓ | — | — | |
| Goals selection | Y | ? | — | — | |
| Tone preference | Y | Y ~ | — | — | AI persona = tone choice. |
| Language picker | Y (EN/JA/KO/ZH) | N (ZH only) | — | — | Our win. |
| Timezone handling | Y | Y ~ | — | — | |
| Multiple saved charts (family + friends) | N | Y ✓ | P1 | M | Cloud-sync chart archive. |
| Chart archive / history | N | Y ✓ | P1 | M | |
| Journal / notes | Y | Y ~ | — | — | |
| Favorites / bookmarks | P | Y ✓ | P1 | S | Personal center shows "collections". |
| Browsing history | N | Y ✓ | P2 | S | |
| Reading history archive | P | Y ✓ | P2 | S | |
| Custom avatars (chooser + upload) | P (seed only) | Y ✓ | P2 | M | |
| Avatar ornaments / frames | N | Y ✓ | P3 | M | Spend-coin cosmetic. |
| Card back / deck skins | N | ? | P3 | M | Unverified. |
| App themes (dark / mystic / forest / ocean) | N | ? | P3 | M | Unverified. |
| Display-name / handle | Y | Y ~ | — | — | |
| Seasonal profile stickers | N | ? | P3 | S | Unverified. |
| Cosmic profile card | Y | ~ | — | — | Our unique asset. |
| Profile — public badges | N | Y ✓ | P1 | S | |
| Profile — published content gallery | N | Y ✓ | P2 | M | |
| Profile — "received likes / collects" stats | N | Y ✓ | P2 | S | |

---

## 7. Gamification

| Feature | We ship? | Cece ships? | Priority | Effort | Notes |
|---|---|---|---|---|---|
| XP / levels | Y | Y ~ | — | — | |
| Seeker ranks / titles | Y | Y ~ | — | — | |
| Badges / achievements | Y | Y ~ | — | — | |
| Daily streak | Y | Y ~ | — | — | |
| Daily check-in reward (coins/XP) | N | Y ~ | P1 | S | 7-day ladder: 5→50 coins. |
| Streak-protection grace | N | ? | P2 | S | |
| Card collection (card-dex) | N | ? | P2 | M | |
| Hexagram collection | N | ? | P3 | M | Requires I-Ching first. |
| Palaces-seen (ziwei-dex) | N | N ~ | DROP | — | |
| Mood-history collection view | N | Y ✓ | P1 | M | |
| Daily quests | N | Y ✓ | P1 | S | "Daily energy mission". |
| Weekly quests | N | ? | P2 | S | |
| Seasonal quests | N | ? | P2 | M | |
| Limited-time event XP boost | N | ? | P3 | S | |
| Leaderboards (opt-in) | N | ? | P3 | M | |
| Friend leaderboards | N | ? | P3 | M | |
| Virtual pet / companion (persistent) | N | P (AI persona acts like one) | P3 | L | |
| Daily lottery / wheel spin | N | ? | P2 | S | Common CN gamification. |
| Mini-game (match-3, fortune flip) | N | ? | P3 | M | |
| Rewarded-video for currency | N | Y ✓ | P2 | S | Watch ad → +2 coins. |
| Milestone celebration animations | P | Y ~ | P2 | S | |
| Progress rings / goal circles | N | ? | P3 | S | |
| Profile-level showcase | N | Y ~ | P2 | S | |

---

## 8. Monetization surfaces

Cece's IAP ladder confirmed from App Store CN listing.

| Feature | We ship? | Cece ships? | Priority | Effort | Notes |
|---|---|---|---|---|---|
| Monthly subscription | Y | Y ✓ | — | — | Cece: ¥9.9 intro → ¥25/mo. |
| Quarterly subscription | N | Y ✓ | P2 | S | ¥58/3mo. |
| Annual subscription | P | Y ✓ | P1 | S | ¥178/yr. |
| Intro month discount | N | Y ✓ | P1 | S | Classic conversion lever. |
| SVIP super-premium tier | N | Y ✓ | P1 | M | ¥69/mo. Bundles advisor minutes + AI persona perks. |
| Lifetime purchase | N | ? | P3 | S | |
| Virtual currency (coins / Moonstones) | N | Y ✓ | P0 | L | |
| Coin pack tier 1 — ¥6 / 4 coins | N | Y ✓ | P0 | S | Low-entry try-before-sub. |
| Coin pack tier 2 — ¥25 / 17 coins | N | Y ✓ | P0 | S | |
| Coin pack tier 3 — ¥60 / 42 coins | N | Y ✓ | P0 | S | |
| Coin pack tier 4 — ¥98 / 68 coins | N | Y ✓ | P0 | S | |
| Coin pack tier 5 — ¥298 / 208 coins | N | Y ✓ | P0 | S | Whale pack. |
| "1 month premium" as one-off — ¥30 | N | Y ✓ | P2 | S | Alt entry. |
| Pay-per-report (career / year-ahead / natal) | N | Y ✓ | P1 | M | Occupational Talent Report is premium à la carte. |
| Gift coins to user | N | Y ✓ | P2 | M | |
| Gift reading to user | N | ? | P2 | M | |
| Advisor tipping (in 1:1 chat) | N | Y ✓ | P1 | M | |
| Live-room gifting | N | Y ✓ | P1 | M | Platform cuts ~30%. |
| Sticker/emoji pack for purchase | N | Y ✓ | P3 | S | |
| Profile cosmetic shop | N | Y ~ | P3 | M | |
| Referral bonus (give+get coins) | N | Y ✓ | P1 | M | |
| Affiliate share for creators | N | ? | P3 | L | |
| Family/friend subscription share | N | ? | P3 | M | |
| Ad-free upgrade | P | Y ✓ | P2 | S | |
| Rewarded ads (watch ad → coins) | N | Y ~ | P2 | S | |
| Auto-renew + cancel flow | Y | Y ✓ | — | — | Cece uses dark patterns — we won't. |
| Pause-instead-of-cancel | N | ? | P2 | S | |
| Refund flow for bad advisor session | N | Y ~ | P1 | M | |

---

## 9. Advisor / marketplace

Cece's revenue engine: 25,000+ contracted advisors + 8,000+ astrology experts answering by voice.

| Feature | We ship? | Cece ships? | Priority | Effort | Notes |
|---|---|---|---|---|---|
| Advisor application + ethics exam | N | Y ✓ | P0 | M | |
| Advisor verification (ID + skills) | N | Y ✓ | P0 | M | |
| Advisor profile pages | N | Y ✓ | P0 | M | |
| Advisor specialty taxonomy (tarot / bazi / ziwei / psych) | N | Y ✓ | P0 | S | |
| Advisor search + filter | N | Y ✓ | P1 | M | |
| Advisor ratings + reviews | N | Y ✓ | P0 | M | |
| Advisor tier/rank (bronze/silver/gold) | N | Y ✓ | P2 | S | |
| Booking / scheduled sessions | N | Y ✓ | P0 | L | |
| On-demand instant chat | N | Y ✓ | P0 | L | |
| Pay-per-minute chat w/ countdown | N | Y ✓ | P0 | L | Cece: ¥2/min baseline. |
| Pay-per-session fixed fee | N | Y ✓ | P0 | M | ¥60 per 30-min. |
| In-session text chat | N | Y ✓ | P0 | M | |
| In-session voice call | N | Y ✓ | P0 | L | |
| In-session video call | N | Y ~ | P3 | L | |
| Post-session written summary | N | ? | P1 | S | |
| Advisor dashboard — queue + earnings | N | Y ✓ | P0 | L | |
| Advisor calendar availability | N | Y ✓ | P0 | M | |
| Stripe Connect / payouts | N | Y ✓ | P0 | M | Cece uses Alipay + WeChat Pay CN. |
| Crisis / self-harm flag auto-trigger | N | Y ✓ | P0 | M | |
| 8000+ astrologer voice-reply Q&A | N | Y ✓ | P1 | L | User posts Q + chart → astrologers drop voice replies. |
| Ask-the-community voice Q&A | N | Y ✓ | P1 | M | |
| 30% platform commission | N | Y ✓ | P0 | S | Config. |
| Advisor AI Copilot (live notes) | N | Y ✓ | P3 | L | Later. |
| Advisor training content | N | ? | P2 | M | |
| Separate advisor app | N | Y ✓ | DROP | XL | 测测心理师 app. Premature for us. |

---

## 10. Content / education

| Feature | We ship? | Cece ships? | Priority | Effort | Notes |
|---|---|---|---|---|---|
| Article library | P | Y ✓ | P2 | M | Cece has in-app articles per expert. |
| Astrology education (houses, planets, aspects) | P | Y ✓ | P2 | M | |
| Tarot glossary | Y | Y ~ | — | — | |
| Bazi/Ziwei education | N | Y ~ | P3 | M | |
| Video lessons (advisor-uploaded) | N | Y ✓ | P3 | XL | |
| Audio courses / guided meditations | N | Y ✓ | P1 | L | 冥想 module explicitly listed. |
| Live workshops (ticketed) | N | Y ~ | P3 | M | |
| Podcast-format daily horoscope (audio) | N | ? | P3 | L | |
| TTS for written readings | N | ? | P2 | S | |
| Blog / news section | N | Y ✓ | P3 | M | Cece has news articles. |
| PDF export of report | P | Y ~ | P1 | S | |
| Journal template library | P | ? | P2 | S | |
| Guided ritual flows (breath → card → journal) | N | ? | P2 | M | |

---

## 11. Platform integrations

| Feature | We ship? | Cece ships? | Priority | Effort | Notes |
|---|---|---|---|---|---|
| iOS app | P (PWA+Capacitor) | Y ✓ | P1 | L | Cece ships native. |
| iOS on Vision Pro (visionOS 1.0+) | N | Y ✓ | P3 | L | Confirmed in App Store listing. |
| iOS on Mac (M1+) | N | Y ✓ | P3 | S | iOS-on-Mac compatibility enabled. |
| iPadOS-specific layouts | N | Y ✓ | P2 | M | |
| iOS home-screen widget | N | ? | P2 | S | |
| iOS lock-screen widget | N | ? | P2 | S | |
| iOS Live Activity | N | ? | P3 | S | |
| iOS Dynamic Island | N | ? | P3 | S | |
| Siri shortcuts / intents | N | ? | P3 | M | |
| iMessage app / sticker pack | N | ? | P3 | M | |
| Apple Watch | N | ? | P3 | M | |
| Android app | P (Capacitor) | Y ✓ | P1 | L | |
| Wear OS | N | ? | P3 | M | |
| Android widget | N | ? | P2 | S | |
| macOS app (standalone) | N | Y ✓ | P3 | S | M1+ compatibility. |
| Browser extension | N | N ~ | P3 | M | |
| Web PWA | Y | N | — | — | Our win. |
| Offline mode | P | Y ~ | P2 | M | 449MB bundle includes offline content. |
| Deep-link / universal links | P | Y ✓ | P1 | S | WeChat share primitives. |
| Share-to-social cards | P | Y ✓ | P1 | S | |
| QR code share | N | Y ~ | P2 | S | |
| WeChat login | N | Y ✓ | DROP | — | CN-only. |
| Google login | Y | N | — | — | Our win. |
| Apple login | Y | Y ~ | — | — | |
| Alipay / WeChat Pay | N | Y ✓ | DROP | — | |

---

## 12. Utility surfaces

| Feature | We ship? | Cece ships? | Priority | Effort | Notes |
|---|---|---|---|---|---|
| Lunar / solar calendar | N | Y ~ | P2 | S | |
| Moon phase day-by-day | P | ? | P2 | S | |
| Event reminders (birthdays → auto-chart) | N | Y ~ | P2 | S | |
| Birth time rectification | N | Y ~ | P2 | L | |
| Chart archive (save many charts) | N | Y ✓ | P1 | M | |
| Compatibility calculator (N people) | N | Y ~ | P1 | M | Pairs + group energy. |
| Share-to-Instagram story cards | N | ? | P1 | S | |
| Share-to-Twitter / X cards | N | ? | P1 | S | |
| Share-to-Pinterest cards | N | ? | P2 | S | |
| Share-to-WeChat / Moments | N | Y ✓ | DROP | S | CN only. |
| QR code to share reading | N | Y ~ | P2 | S | |
| PDF export | P | Y ~ | P1 | S | |
| Cloud sync chart files | N | Y ✓ | P1 | M | |
| Notification scheduling (timezone smart) | P | Y ✓ | P2 | S | |

---

## 13. "Fun" / viral features

This is what the user specifically asked to pull across. These are the high-shareability hooks.

| Feature | We ship? | Cece ships? | Priority | Effort | Notes |
|---|---|---|---|---|---|
| Lucky Map 幸运地图 (cities ranked for love/career) | N | Y ✓ | P0 | M | Shareable-as-hell. Astrocarto-graphy-lite. |
| Peach-Blossom City 桃花城市 ("your luck-in-love city") | N | Y ✓ | P0 | M | Sub-feature of Lucky Map. |
| Pick Cards (swipe-a-daily) | N | Y ✓ | P1 | S | |
| Love Tree 爱情树 (attachment gamified visualizer) | N | Y ✓ | P1 | S | |
| Dual-MBTI compatibility share | N | Y ✓ | P0 | M | THE viral hook. Pre-fill → friend takes → sees pair score. |
| "Friend circle personality distribution" | N | Y ✓ | P1 | M | Your friends' 16 types as a bar chart. |
| Meme generator from reading → shareable PNG | N | ? | P1 | M | Unverified in Cece — big TikTok-friendly idea. |
| Seasonal events (Qixi / Lunar NY / solstice) | N | Y ~ | P2 | M | |
| Festival-locked skins | N | ? | P3 | S | Unverified. |
| Collect-a-card (78 tarot dex) | N | ? | P2 | M | |
| Collect-a-hexagram (64 dex) | N | ? | P3 | M | Ship with I-Ching. |
| Zodiac matchmaking live event | N | Y ~ | P2 | L | Cece ran real-world matchmaking. |
| Soulmate calculator | N | Y ✓ | P1 | M | "Love compatibility index 97 / 100". |
| Past-life reading | N | ? | P2 | S | Unverified — content-only. |
| What-if simulator ("if you were a Scorpio") | N | ? | P3 | S | Content-only. |
| Virtual altar / shrine | N | N ~ | P3 | L | Not Cece. |
| AR constellation identifier | N | ? | P3 | XL | |
| AR "see your card in your room" | N | ? | P3 | XL | |
| 3D sandbox (user places objects → AI reads) | N | Y ✓ | P2 | XL | Cece signature. |
| Voice-record your own reading | N | ? | P3 | S | |
| Reading-of-the-day public feed | N | ? | P2 | S | |
| Auto-shareable "cosmic card" post-reading | P | Y ~ | P1 | S | |
| Mystery box / loot | N | ? | P2 | M | Open box w/ coins → random reward. |
| Tarot-card pet egg hatches into deck | N | N ~ | P3 | L | New idea — no precedent. |

---

## Platform-level signals (from scrape)

- **449 MB Android APK** → native 3D engine (likely Unity embed for sandbox) + offline asset cache + multiple codecs + 4+ SDK analytics layers. Not the model to copy.
- **iOS min: iOS 13+.** Supports iPadOS, macOS (M1+), visionOS — Cece embraces every Apple surface.
- **Release cadence: biweekly.** v10.37.0 current (22 Apr 2026).
- **i18n: Chinese only.** Our 4-language support is a genuine moat.
- **Astronomical observatory sync:** Their horoscope is recomputed at midnight off pro ephemeris data — not consumer APIs.
- **Xinyuan LLM** is state-registered; we use Anthropic/OpenAI via Vercel AI Gateway and don't need our own.

---

## What to SKIP (confirmed wastes of effort)

- WeChat login, Alipay/WeChat Pay, Weibo/Douyin sharing (CN-only).
- 449 MB bundle strategy (keep under 100 MB).
- Separate B2B advisor app (2026 premature).
- Proprietary LLM training (use hosted models).
- Face/palm AI reading (Cece doesn't; App Store risk).
- Fortune sticks / 测字 / 黄历 / 择日 (Cece doesn't; too CN-specific).
- Ziwei Doushu (XL effort, no evidence Cece even ships it).
- Dark-pattern auto-renewals (we win on trust).

---

## Sources

- https://www.cece.com/ (homepage — navigation & module tiles)
- https://www.cece.com/introduce/ (product line, LLM, scale)
- https://cece.com/product/1/ (psychologist app)
- https://www.xxwolo.com/p_engine/zhixinlu/ (feature index)
- https://www.xxwolo.com/p_engine/app/live.php (live branch)
- https://apps.apple.com/cn/app/id756771906 (IAP ladder, platforms, Vision Pro, v10.36.0 at scrape)
- https://mobile.baidu.com/appitemp/1453084 (v10.37.0 — 22 Apr 2026)
- https://play.google.com/store/apps/details?id=com.lingocc.cc5 (GP international — "星座,八字,AI问答")
- https://www.geekpark.net/news/348292 (deep user-guide — AI personas, Love Tree, Lucky Map, Pick Cards)
- https://www.xhby.net/content/s69df5ee6e4b00fb198d05b0f.html (founder interview — narrative therapy, 4 AI agents, roadmap 共感体 robots)
- https://pitchhub.36kr.com/project/1818821013983369 (founder bios, funding, revenue)
- https://restofworld.org/2023/tencent-cece-spirituality-app/ (Clubhouse rooms, ¥60/30min, ¥2/min listener pricing, Human Design)
- https://www.scmp.com/magazines/post-magazine/long-reads/article/3236118 (live-streaming psychics)
- https://ai-bot.cn/cecelive/ (Xinyuan LLM, 25,000 advisors)
- Prior audit: CECE-MISSING-FEATURES-FULL.md (23 Apr), CECE-COMPETITIVE-ANALYSIS.md (23 Apr)
