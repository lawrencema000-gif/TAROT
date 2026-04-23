# Cece vs. Arcana — Complete Missing-Features Inventory

**Deep scrape date:** 2026-04-23
**Sources:** cece.com + introduce pages + iOS App Store (CN) + Google Play (international v2) + apkpure + Rest of World + MWM listings
**Scope:** Every distinct functional feature Cece has that Arcana currently doesn't.

---

## How to read this table

- **Status:** ❌ missing, ⚠️ partial, ✅ have
- **Effort:** S = <1 day · M = 1-5 days · L = 1-4 weeks · XL = 1-3 months
- **Priority:** P0 critical / P1 high / P2 medium / P3 low / DROP don't bother
- **Ships behind flag:** whether we gate this behind a feature-flag roll-out

---

## 1. Divination & reading content

| Feature | Arcana status | Effort | Priority | Notes |
|---|---|---|---|---|
| Western natal chart (full graphic render) | ⚠️ (sign-only) | M | P1 | Render the actual chart wheel with planets + houses + aspects. 20 chart variants. |
| Chinese zodiac (year animal) | ✅ | — | — | Just shipped |
| I-Ching 64-hexagram divination | ❌ | M | P0 | Coin-toss UI + hexagram meanings + changing lines |
| Bazi (4-pillar, ziwei-douxin) | ❌ | L | P1 | Year/month/day/hour pillars + 5-element balance + day master + luck cycles |
| 28 Chinese lunar mansions | ❌ | S | P3 | Traditional Chinese sky-division astrology; complements Bazi |
| Human Design chart | ❌ | M | P0 | Generator/Projector/Manifestor/Reflector + strategy + authority + profile |
| Numerology Life Path | ✅ | — | — | Just shipped |
| Numerology — name/destiny/expression numbers | ❌ | S | P2 | Additional numerology layers beyond life path |
| Ayurvedic dosha (Vata/Pitta/Kapha) | ❌ | M | P1 | 30-Q quiz + constitution report + lifestyle recommendations |
| Feng Shui Bagua room-map | ❌ | L | P2 | Photo/diagram → Bagua overlay → advice per area |
| Dream interpreter (symbolic dictionary + AI) | ❌ | M | P1 | Describe dream → archetypal reading. AI-assisted. |
| Dice divination | ❌ | S | P3 | Simple 3-dice oracle system. Filler content. |
| Moon phase rituals (multi-tradition) | ⚠️ | S | P2 | Rituals from Taoist + Wiccan + Vedic traditions side-by-side |
| Daily Taoist / Zen / Dao De Jing quote | ❌ | S | P2 | Rotating wisdom quote on home screen |
| Crystal recommendations per sign/intent | ⚠️ | S | P3 | Already have crystal content; tie into readings |
| Chakra balance assessment | ⚠️ | S | P3 | Already have chakra library; convert to quiz |
| Runes (Elder Futhark) | ❌ | M | P3 | 24 runes + cast patterns |
| Palmistry reader (via camera + AI) | ❌ | XL | P3 | Upload palm photo → AI reading |

---

## 2. Personality quizzes (Cece claims "50+")

| Feature | Arcana status | Effort | Priority | Notes |
|---|---|---|---|---|
| MBTI (full 70-Q + quick 12-Q) | ✅ | — | — | Shipped |
| Big Five (OCEAN) | ✅ | — | — | Shipped |
| Enneagram | ✅ | — | — | Shipped |
| Attachment Style | ✅ | — | — | Shipped |
| Love Languages | ✅ | — | — | Shipped |
| Mood Check-In | ✅ | — | — | Shipped |
| Shadow Archetype | ✅ | — | — | Shipped |
| Element Affinity | ✅ | — | — | Shipped |
| Tarot Court Card Match | ✅ | — | — | Shipped |
| Dark Triad | ❌ | S | P2 | Narcissism + Machiavellianism + psychopathy. Popular "shadow self" quiz. |
| DISC behavioural assessment | ❌ | S | P2 | D/I/S/C profile, workplace-flavoured. |
| Jungian cognitive functions | ❌ | S | P2 | Goes deeper than MBTI letters. Function stack Ni-Te-Fi-Se etc. |
| 4 Love Styles (Perel) | ❌ | S | P2 | Not the 5 languages — the 4 ways you give/receive love. |
| Parenting style quiz | ❌ | S | P2 | Authoritative / permissive / neglectful / authoritarian. |
| Communication style quiz | ❌ | S | P2 | Passive / aggressive / passive-aggressive / assertive. |
| Conflict style quiz | ❌ | S | P2 | Thomas-Kilmann: competing / accommodating / avoiding / collaborating / compromising. |
| Decision-making style | ❌ | S | P2 | Rational / intuitive / dependent / avoidant / spontaneous. |
| Money personality | ❌ | S | P1 | Saver / spender / avoider / monk / status-seeker. Hits financial-wellness niche. |
| Grief style | ❌ | S | P3 | Instrumental / intuitive / blended. Sensitive content — care needed. |
| Boundaries quiz | ❌ | S | P1 | Big topic in wellness market. |
| Social anxiety self-assessment | ❌ | S | P2 | Liebowitz-lite, clearly-marked as non-diagnostic. |
| Burnout level (Maslach-informed) | ❌ | S | P1 | Workplace-wellness crossover. |
| Stress-recovery style | ❌ | S | P2 | How you bounce back. |
| Learning style (VARK) | ❌ | S | P2 | Visual / Auditory / Reading / Kinaesthetic. |
| Sleep chronotype (Lion/Bear/Wolf/Dolphin) | ❌ | S | P2 | Hot Breus model, lots of content opportunity. |
| Sexual personality (adult users only) | ❌ | M | P3 | Adult-gated. Erotic Blueprints. App Store risk. |
| Creative type quiz | ❌ | S | P2 | Maker / dreamer / performer / organiser. |
| Leadership style | ❌ | S | P2 | Transformational / servant / democratic / coaching. |
| Empath vs HSP (Highly Sensitive Person) | ❌ | S | P2 | Elaine Aron's HSP. |
| Anger style quiz | ❌ | S | P3 | How you process anger. |
| Self-worth assessment | ❌ | S | P3 | Rosenberg-lite, non-diagnostic. |
| Spiritual-type quiz | ❌ | S | P2 | Mystic / ritualist / seeker / servant / warrior. Mystical-brand native. |
| Wellness-type quiz | ❌ | S | P2 | Introvert / social / mind / body / spirit leaning. |
| Career archetype | ⚠️ | S | P1 | Currently only in MBTI output. Make standalone + paywalled deep report. |
| Relationship readiness | ❌ | S | P2 | Are you in a healthy place to date? |
| Productivity style | ❌ | S | P2 | Deep-work / sprint / rhythm / burst. |
| Motivation style (intrinsic / extrinsic / affiliation) | ❌ | S | P3 | |
| Failure response style | ❌ | S | P3 | How you respond when you fail. |
| Trauma response (fight/flight/freeze/fawn) | ❌ | S | P1 | Big content topic in wellness, needs care with language. |
| Inner critic style | ❌ | S | P2 | Perfectionist / pessimist / comparer / controller. |
| Self-compassion | ❌ | S | P2 | Neff-lite. |
| Anxiety profile (generalised/social/somatic/panic) | ❌ | S | P2 | Non-diagnostic screener, clearly labelled. |
| Depression screener (PHQ-2 style) | ❌ | S | P1 | Wellness-legitimate if done right. Must never replace professional help. |
| Partner compatibility (combine 2 MBTIs) | ❌ | M | P0 | Viral feature. Pair with share. |
| Partner compatibility via astro | ⚠️ | M | P1 | You have compatibility list on zodiac pages. Build dedicated pair-flow. |
| Daily "micro-quiz" (3 Qs per day) | ❌ | M | P1 | Small daily gamified habit. Cece has this. |

**Gap: 32 quizzes to reach Cece's "50+" claim.** Most are S-effort (1-2 days each), content-heavy not engineering-heavy.

---

## 3. AI layer

| Feature | Arcana status | Effort | Priority | Notes |
|---|---|---|---|---|
| AI-generated tarot interpretations | ✅ | — | — | Shipped |
| AI virtual companion (multi-turn, memory) | ❌ | L | P0 | Named persona, avatar, remembers chart + history. Anthropic/OpenAI via Vercel AI Gateway + pgvector memory. |
| AI persona options (Sage / Oracle / Mystic / Priestess) | ❌ | M | P1 | Built on top of the companion — multiple characters |
| AI Q&A "3-second" answer | ❌ | M | P0 | Type a question → instant AI reading. Cece's one-click question feature. |
| AI-powered dream interpretation | ❌ | M | P1 | Specialised prompt flow |
| AI journal coach | ❌ | M | P1 | Responds to journal entries reflectively |
| AI chart interpreter | ❌ | M | P1 | "Explain my Moon in Capricorn in 10th house" → chart-aware answer |
| AI tarot companion (conversational reading) | ❌ | M | P1 | Pulls a card, asks follow-ups, builds a narrative |
| AI advisor Copilot (for paid advisors — B2B feature) | ❌ | XL | P3 | Only if marketplace ships |
| AI sand-tray analysis | ❌ | L | P2 | Interprets user-placed objects in the sandbox |
| TTS (text-to-speech) for AI responses | ❌ | S | P2 | ElevenLabs or OpenAI voice. Nice-to-have. |
| Speech-to-text input | ❌ | S | P2 | Whisper. Mobile-native. |

---

## 4. Community + social

This is the single biggest missing category.

| Feature | Arcana status | Effort | Priority | Notes |
|---|---|---|---|---|
| Public community feed | ❌ | L | P0 | Post / like / comment / share. Topic channels. |
| Topic channels (Tarot / Astrology / Moon / Love / Shadow / Career) | ❌ | S | P0 | On top of feed — simple filter tag |
| Anonymous confessional ("Whispering Well") | ❌ | M | P0 | Post anonymously, receive anonymous replies |
| Interest-based user matching | ❌ | L | P1 | Find people with similar MBTI/chart |
| Private DMs (text) | ❌ | L | P1 | After you have community, DM is natural |
| User profile pages | ❌ | M | P1 | Public profile with their badges, posts, readings shared |
| Follow / unfollow | ❌ | M | P1 | |
| Followers / following feeds | ❌ | M | P1 | |
| Block / mute / report | ❌ | M | P0 | Required for community safety |
| Auto-moderation (Akismet + OpenAI mod API) | ❌ | M | P0 | Ships with community — never without |
| Moderation dashboard for admins | ❌ | M | P0 | Review reports, take action |
| Comment threading | ❌ | S | P1 | Replies to comments |
| Reaction emoji (beyond like) | ❌ | S | P2 | ❤️ 🔮 ✨ 👁️ 🌙 mystical palette |
| Share to feed from reading result | ❌ | S | P1 | "Share this tarot result as a post" |
| Community search | ❌ | M | P2 | |
| Friend system (vs follow) | ❌ | M | P2 | |
| Friend MBTI distribution viewer | ❌ | M | P2 | Requires friend system first |
| Dual-MBTI compatibility analysis | ❌ | M | P0 | Viral hook — pair your MBTI with a friend's |
| Compatibility-heat share images | ❌ | S | P1 | Shareable PNG showing you + friend scores |
| Whisper board (ephemeral 24h messages) | ❌ | S | P3 | Story-format content |
| Polls in posts | ❌ | S | P3 | Engagement booster |

---

## 5. Live + streaming

| Feature | Arcana status | Effort | Priority | Notes |
|---|---|---|---|---|
| Live audio rooms (Clubhouse-style) | ❌ | L | P1 | LiveKit managed. Hosts broadcast, listeners join. |
| Private 1-on-1 audio call | ❌ | L | P1 | Built on same LiveKit infra |
| Public/private mode in live sessions | ❌ | S | P2 | Cece lets advisors toggle — public room or private consult |
| Live tipping with virtual currency | ❌ | M | P1 | Viewers send Moonstones in-stream |
| Live reading replays (on-demand) | ❌ | M | P2 | Record → post-stream paywall to unlock replay |
| Scheduled group readings ("Full Moon Scorpio — live Thursday 8pm") | ❌ | S | P2 | Calendar + push reminders |
| Live workshops (ticketed) | ❌ | M | P3 | "Learn I-Ching in 60 min" — one-off paid events |
| Co-host / "连麦" feature | ❌ | S | P3 | Host brings a listener on-stage |
| Video calls (advisor video consult) | ❌ | L | P3 | Heavier than audio. Come later. |
| Short-video library (advisor-uploaded lessons) | ❌ | XL | P3 | YouTube-lite. Probably just embed YouTube. |

---

## 6. Advisor marketplace (the revenue engine)

| Feature | Arcana status | Effort | Priority | Notes |
|---|---|---|---|---|
| Advisor application form | ❌ | S | P0 | Name, bio, specialty, social links, rate request |
| Advisor verification (identity + skills test) | ❌ | M | P0 | Ethics exam + tarot knowledge quiz + ID check. Manual review first 10. |
| Advisor profile pages | ❌ | M | P0 | Bio, credentials, specialties, sample reading, ratings |
| Advisor search & filter (by specialty / language / price / rating) | ❌ | M | P1 | |
| Booking / calendar scheduling | ❌ | L | P0 | Advisor sets availability, user picks slot |
| Pre-paid Moonstone wallet | ❌ | M | P0 | Users pre-load coins before booking |
| Pay-per-minute chat (countdown timer, auto-stop when coins depleted) | ❌ | L | P0 | Real-time billing, hard part is the graceful stop |
| Pay-per-session fixed price | ❌ | M | P0 | $30/30 min, $50/60 min tiers |
| In-session text chat | ❌ | M | P0 | Supabase Realtime or LiveKit data channel |
| In-session voice | ❌ | L | P0 | LiveKit audio |
| Post-session written summary from advisor | ❌ | S | P1 | Advisor sends follow-up notes |
| User rates + reviews advisor after session | ❌ | M | P0 | Public ratings surface best advisors |
| Advisor dashboard (live queue, earnings, schedule) | ❌ | L | P0 | The advisor-side product |
| Advisor earnings + payout status | ❌ | M | P0 | Via Stripe Connect |
| Stripe Connect Express integration | ❌ | M | P0 | Auto-KYC, international payouts |
| Advisor tier pricing (bronze / silver / gold) | ❌ | S | P2 | Higher-rated advisors command higher rates |
| Emergency/crisis flag (mentions of self-harm) | ❌ | M | P0 | Auto-detect trigger words, surface Crisis Text Line, pause session gracefully |
| 30% platform commission on all transactions | — | M | P0 | Billing config |
| Refund flow for bad sessions | ❌ | M | P1 | Trust-building |
| Advisor training / onboarding content | ❌ | M | P2 | "How to give a great reading on Arcana" — internal docs + videos |
| Advisor Copilot AI (real-time notes) | ❌ | L | P3 | Cece's B2B hook. Later. |

---

## 7. Monetization & virtual economy

| Feature | Arcana status | Effort | Priority | Notes |
|---|---|---|---|---|
| Monthly subscription | ✅ | — | — | Shipped (RevenueCat) |
| Annual subscription | ⚠️ | S | P1 | Confirm exists; 20-30% discount vs monthly |
| First-month discount (intro offer) | ❌ | S | P1 | $2.99 → $7.99 classic conversion tactic |
| SVIP super-premium tier | ❌ | M | P1 | Unlocks advisor-call credits + AI persona customization + priority |
| Virtual currency (Moonstones) | ❌ | L | P0 | Ledger table + Stripe webhook + spending rules |
| Moonstone pack tiers ($4.99 / $9.99 / $24.99 / $49.99 / $99.99) | ❌ | S | P0 | Pricing ladder |
| Moonstone balance display | ❌ | S | P0 | In header + settings |
| Pay-per-report (à la carte) | ❌ | M | P1 | Career report $6.99, natal PDF $9.99, year ahead $12.99 |
| Gift economy (send coins to other users, advisors, live streamers) | ❌ | M | P2 | Platform takes cut |
| Sticker/emoji packs for purchase | ❌ | S | P3 | Micro revenue loop. Ships with community. |
| Profile customization (borders, avatars, backgrounds) for coins | ❌ | M | P2 | Self-expression spend |
| Limited-edition seasonal cosmetics | ❌ | M | P3 | FOMO mechanic |
| Referral program (give 10 / get 10 Moonstones) | ❌ | M | P1 | Growth lever |
| Affiliate revenue share (% of referred user revenue) | ❌ | L | P2 | For creators bringing traffic |
| Automatic subscription renewal | ✅ | — | — | RevenueCat handles |
| Subscription cancellation flow | ⚠️ | S | P0 | Must be easy — don't copy Cece's dark patterns |
| Pause subscription instead of cancel | ❌ | S | P2 | Win-back feature |

---

## 8. Gamification & retention

| Feature | Arcana status | Effort | Priority | Notes |
|---|---|---|---|---|
| XP + levels | ✅ | — | — | Shipped |
| Daily streak | ✅ | — | — | Shipped |
| Badges / achievements | ✅ | — | — | Shipped |
| Daily check-in reward | ❌ | S | P1 | Tap to claim — Moonstone or XP. Cece/Duolingo standard. |
| "Come back tomorrow" mini-reward ladder (7-day) | ❌ | S | P1 | Day 1: 5 coins, Day 7: 50 coins. Streak-protection mechanic. |
| Seasonal events / limited-time quests | ❌ | M | P2 | "Full Moon week — 3x XP on all readings" |
| Leaderboards (opt-in) | ❌ | M | P3 | Community feature. Privacy-sensitive. |
| Emotion diary with 30-day mood curve | ❌ | M | P0 | Extends Mood Check-In into a daily log + chart visualization |
| Daily "3-question micro-quiz" | ❌ | M | P1 | Small daily habit, builds toward a weekly insight |
| Personalized push notifications | ⚠️ | M | P1 | Behaviour-based timing windows |
| Re-engagement push ("you haven't drawn in 3 days") | ❌ | S | P1 | |
| Streak-protection grace day | ❌ | S | P2 | Prevents rage-uninstall when streak breaks |
| Progress rings (like Apple Fitness) | ❌ | M | P3 | Reading / journaling / meditation goals |
| Milestone celebration animations | ⚠️ | S | P2 | Level-up confetti — extend to more moments |

---

## 9. Onboarding & personalization

| Feature | Arcana status | Effort | Priority | Notes |
|---|---|---|---|---|
| Birth-data onboarding | ✅ | — | — | Shipped |
| Goals selection (love/career/confidence/healing) | ✅ | — | — | Shipped |
| Tone preference (gentle/direct/playful) | ✅ | — | — | Shipped |
| Language picker (EN/JA/KO/ZH) | ✅ | — | — | Shipped |
| "What brings you here?" quiz → personalized home | ❌ | S | P2 | Curates which quizzes surface first |
| Re-onboarding prompt after 6 months | ❌ | S | P3 | Life changes; re-run relevant quizzes |
| Theme customization (dark / mystic / forest / ocean) | ❌ | M | P3 | Self-expression lever |
| Avatar selection + custom | ⚠️ | M | P2 | You have avatar_seed; build a proper chooser |
| Cosmic profile card | ✅ | — | — | Shipped |

---

## 10. Content formats we don't have

| Feature | Arcana status | Effort | Priority | Notes |
|---|---|---|---|---|
| Audio meditations (built-in player) | ❌ | L | P1 | Short (5-15 min) guided meditations keyed to zodiac/mood |
| Podcast-format daily "reading for the day" | ❌ | L | P3 | 2-3 min daily audio horoscope |
| Video lessons (tarot 101, astro 101, I-Ching intro) | ❌ | XL | P3 | Embed YouTube to start |
| PDF downloadable reports | ⚠️ | S | P1 | You have the data; wrap into branded PDF |
| Journal template library | ⚠️ | S | P2 | You have journal; add themed templates (shadow work, gratitude, dream, full-moon) |
| Guided ritual flows (breath → card pull → journal) | ❌ | M | P2 | Multi-step mini-ceremony |
| Daily horoscope audio (TTS) | ❌ | M | P2 | Read your horoscope aloud via TTS |

---

## 11. 3D / immersive (Cece's signature)

| Feature | Arcana status | Effort | Priority | Notes |
|---|---|---|---|---|
| 3D psychological sandbox | ❌ | XL | P2 | Three.js in WebView, ~30 MB bundle. Lazy-loaded. Archetypal Western objects. |
| 3D tarot card deck render | ❌ | L | P3 | Rotate cards in 3D on shuffle — visual polish |
| 3D natal chart wheel | ❌ | L | P3 | Rotatable, zoomable chart |
| AR feature (camera + overlay) | ❌ | XL | P3 | "AR constellation identifier" — big lift |

---

## 12. Enterprise / B2B (Cece's second business)

| Feature | Arcana status | Effort | Priority | Notes |
|---|---|---|---|---|
| Separate practitioner app | ❌ | XL | DROP | Not until you have 1000+ advisors |
| White-label SaaS for wellness clinics | ❌ | XL | DROP | Premature |
| Corporate wellness partnership page | ❌ | M | P3 | Sell 100-seat bundles to companies. Future. |
| CSR partnership (NAMI / Crisis Text Line) | ❌ | S | P1 | Brand trust + App Store review safety. 1 day of outreach. |

---

## 13. Trust, safety, compliance

| Feature | Arcana status | Effort | Priority | Notes |
|---|---|---|---|---|
| Self-harm / crisis resource routing | ❌ | M | P0 | Ship with AI companion AND community |
| Clear "not a substitute for professional care" banners | ⚠️ | S | P0 | Required for App Store approval of anything mood/mental-health flavoured |
| Age gate for adult-flavoured content | ❌ | S | P1 | If you add sexual personality quiz |
| Data export (GDPR) | ⚠️ | M | P1 | Supabase makes this easy; expose it in Settings |
| Account deletion self-service | ⚠️ | S | P0 | Apple requires this |
| Advisor ethics agreement | ❌ | S | P0 | Ships with marketplace |
| Recording consent on live rooms | ❌ | S | P0 | Legal requirement |
| Content rating per region | ❌ | S | P1 | |

---

## 14. Infrastructure / backend patterns

| Feature | Arcana status | Effort | Priority | Notes |
|---|---|---|---|---|
| Redis hot cache for daily horoscope | ❌ | S | P1 | Upstash — front of the horoscope edge function |
| pgvector for AI memory + matching | ❌ | S | P0 | Ships with AI companion |
| pg_cron for scheduled daily computes | ⚠️ | S | P1 | Pre-warm tomorrow's horoscope at 3am |
| Inngest / Trigger.dev for long jobs | ❌ | M | P2 | Chart PDF rendering, nightly analytics |
| Vercel AI Gateway for LLM routing | ❌ | S | P0 | Ships with AI companion |
| LiveKit Cloud integration | ❌ | M | P1 | Ships with live rooms |
| Stripe Connect Express | ❌ | M | P0 | Ships with advisor marketplace |
| PostHog product analytics | ❌ | S | P1 | Better funnels than GA4 |
| Feature flag system | ⚠️ | S | P0 | You have `feature_flags` table — wire into all new features |
| Cloudflare Turnstile on posts/comments | ❌ | S | P1 | Anti-bot for community |

---

## Top-line summary — where the biggest gaps are

**Pure content gaps (no engineering):** 32 personality quizzes + I-Ching + Bazi + Human Design + Ayurveda + dream interpreter + rituals. All S-M effort. **Content budget: ~$5-15k** for the writing + translations. This is the fastest wedge.

**AI layer (P0 priorities):** AI companion with persona + pgvector memory + AI Q&A. ~3-4 weeks engineering. Unlocks daily-engagement mechanic.

**Community (P0 priorities):** Feed + anonymous confessional + moderation. ~3-4 weeks. The retention lever.

**Marketplace (P0 for revenue):** Advisor onboarding + pay-per-minute + Stripe Connect. ~8-12 weeks. The revenue lever.

**Everything else** is P1-P3 optimisation on top of the four foundations above.

---

## Features to SKIP

These were in my scrape but either don't translate to Western users or are net-negative:

- WeChat login + friends graph
- Alipay/WeChat Pay
- Weibo + Douyin sharing
- Chinese-market-only licensing/regulatory workarounds
- Separate practitioner B2B app (too early)
- 449 MB native shell (stay under 100 MB)
- Aggressive auto-renewal dark patterns (you lose trust advantage)
- Proprietary LLM training (use Anthropic + OpenAI — cheaper, better)
- Palm reading via camera (technical risk, cultural minefield)

---

## Sources

- [Cece corporate site](https://www.cece.com/)
- [Cece product intro](https://www.cece.com/introduce/)
- [Cece homepage](https://cece.com/)
- [iOS App Store (CN) listing](https://apps.apple.com/cn/app/%E6%B5%8B%E6%B5%8B-%E6%98%9F%E5%BA%A7%E5%BF%83%E7%90%86%E6%83%85%E6%84%9F%E9%97%AE%E7%AD%94%E7%A4%BE%E5%8C%BA/id756771906)
- [Google Play international](https://play.google.com/store/apps/details?id=com.lingocc.cc5)
- [MWM listing](https://mwm.ai/apps/ce-ce-nu-xing-qing-gan-qing-su-zhi-bo-she-qu/756771906)
- [Rest of World article](https://restofworld.org/2023/tencent-cece-spirituality-app/)
