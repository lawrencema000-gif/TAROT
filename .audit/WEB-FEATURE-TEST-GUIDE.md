# All New Features — Web Testing Guide

**Preview URL:** https://audit-smoke--arcana-ritual-app.netlify.app
**Your admin account:** `lawrence.ma000@gmail.com` (marked admin on live DB)
**Every feature below is accessible to you right now.** Regular users see none.

---

## 🟢 Features that are LIVE-READY on web (test now)

### Divination surfaces

| Feature | Where to test | Flag needed |
|---|---|---|
| **Runes cast** | Readings → Runes tab | `runes` |
| **Dice oracle** | Readings → Dice tab | `dice` |
| **I-Ching hexagram** | Readings → I-Ching tab (existing) | `iching` |
| **Bazi 4-pillar** | Readings → Bazi tab | `bazi` |
| **Human Design** | Readings → Human Design tab | `human-design` |
| **Feng Shui Bagua** | Readings → Feng Shui tab | `feng-shui` |
| **Dream interpreter** | Readings → Dreams tab | `dream-interpreter` |
| **Mood diary** | Readings → Mood tab | `mood-diary` |
| **Partner compat** | Readings → Partner tab | `partner-compat` |

### AI features (need `GEMINI_API_KEY` — already set ✅)

| Feature | Route | Notes |
|---|---|---|
| **AI Companion (4 personas)** | `/companion` | pgvector memory after ~10 turns |
| **3-second reading** | `/ai/quick` or Home tile | Ask anything, get oracle reading |
| **Tarot companion** | `/ai/tarot` or Home tile | Auto-draws card, multi-turn chat |
| **Journal coach** | Inside Journal editor → "Ask the journal coach" | On-demand reflection on your entry |
| **AskOracle on Tarot card page** | `/tarot-meanings/<slug>` → scroll below description | Personalized per-card reading (pre-auth SEO page, button only shows when signed in) |
| **AskOracle on quiz results** | Any quiz → complete → card below affirmation | Oracle reads your result |
| **AskOracle on rune cast** | Runes → cast → below the 3 runes | Reads the spread as a whole |
| **AskOracle on hexagram** | I-Ching → reveal → below journal prompt | Reads for your situation |

### Compliance + data

| Feature | Where | Why test |
|---|---|---|
| **Account delete** | Settings → "Delete account" | Was 500-ing before Phase 2C fix |
| **Account export** | Settings → "Export my data" | Was 500-ing before Phase 2C fix |

### Quizzes (22 new dimensional quizzes)

Path: Quizzes tab → pick from list.

Anxiety Profile · Leadership Style · Productivity Style · Relationship Readiness · Wellness Type · Jungian Cognitive Functions · Love Styles (Greek) · Parenting Style · Learning Style (VARK) · Empath vs HSP · Self-Compassion · PHQ-2 Mood · Dark Triad · DISC · Money Personality · Boundaries · Burnout · Communication Style · Conflict Style · Sleep Chronotype · Creative Type · Spiritual Type

### Monetization — Moonstones + pay-per-reports

| Feature | Route | What to test |
|---|---|---|
| **Moonstone balance widget** | Home | Daily check-in claims moonstones |
| **Moonstone top-up (web Stripe)** | Home → + button next to balance | Requires `moonstone-topup` flag + Stripe products |
| **Career archetype report** | Profile → "Career Archetype Report" | Unlock 150 Moonstones OR "pay $6.99 with card" link (web only) |
| **Year-Ahead forecast** | Profile → "Year Ahead Forecast" | 300 Moonstones OR $12.99 |
| **Full natal chart report** | Profile → "Full Natal Chart" | 200 Moonstones OR $9.99, with browser print-to-PDF |

### Interactive chart

| Feature | Route | Notes |
|---|---|---|
| **Chart wheel (SVG)** | Natal chart report → top of page | Tap planets/houses/aspects |
| **Transits overlay** | Chart wheel → "Transits today" tab | Current planetary positions as outer ring |
| **Progressions** | Chart wheel → "Progressions" tab | Age-based progressed positions |
| **Solar return** | Chart wheel → "Solar return" tab | Current year's return chart |
| **Synastry** | Chart wheel → "Synastry" tab | Enter partner birth date → cross-aspects |

### Community + safety

| Feature | Route | Flag |
|---|---|---|
| **Community feed** | Community tab | `community` |
| **Whispering Well (anon)** | Community → Whispering Well mode | `whispering-well` |
| **Crisis banner** | Post with self-harm keyword | Auto-appears with 988 resources |
| **Moderation panel (admin)** | /admin → Moderation Queue | Reviews crisis + flagged events |

### Growth / referral

| Feature | Route | Flag |
|---|---|---|
| **Referral program** | Profile → "Invite friends" | `referral` |
| **Compat invites** | Profile → "Compatibility invite" | `compat-invite` |
| **Affiliate tier** | Admin dashboard (schema only; public UI in a follow-up) | `affiliate-program` |

### Advisor marketplace

| Feature | Route | Flag + env |
|---|---|---|
| **Advisor directory** | Advisors tab | Existing |
| **Book a session** | Advisor profile → Book | `advisor-booking` |
| **Session page** | `/advisors/session/:id` | Existing + `advisor-voice` for audio |
| **Advisor dashboard** | `/advisors/dashboard` | Must have an advisor_profiles row |
| **Advisor verify (self-serve)** | `/advisors/verify` | `advisor-verify` |
| **Voice (LiveKit)** | Inside active session | `advisor-voice` + LiveKit env — **NOT SET yet, will 503** |
| **Payouts (Stripe Connect)** | Advisor dashboard → Payouts card | `advisor-payouts` + native gated off |

### Live rooms

| Feature | Route | Flag + env |
|---|---|---|
| **Live rooms list** | `/live-rooms` | `live-rooms` |
| **Single live room** | `/live-rooms/:id` | `live-rooms` |
| **Voice (LiveKit)** | Inside live room | `live-rooms-voice` + LiveKit env — **NOT SET yet** |
| **Replay unlock** | Completed room → Replay card | `live-replays` |

### Three.js sandbox (preview)

| Feature | Route | Notes |
|---|---|---|
| **Archetypal sandbox** | `/sandbox` | 10 objects on a plinth, oracle reads the arrangement. Lazy-loads 667 KB three.js chunk on first open. |

### Home widgets

| Widget | Flag |
|---|---|
| **Moonstone balance** | `moonstones` |
| **Daily wisdom** | `daily-wisdom` |
| **Tonight's moon phase** | `moon-phases` |
| **Quick reading tile** | `ai-quick-reading` |
| **Tarot companion tile** | `ai-tarot-companion` |

---

## 🔴 Features that WON'T work yet on this preview

| Feature | Blocker |
|---|---|
| LiveKit voice (advisor sessions + live rooms) | `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_WS_URL` not set. Functions return 503 cleanly |
| Full moderation (OpenAI categories) | `OPENAI_API_KEY` not set. Community moderation falls back to crisis-regex-only (still catches suicide ideation) |
| Moonstone top-up on native | Play Console + RevenueCat need product config. Web Stripe path works once `moonstone-topup` flag is on |
| Stripe direct-pay for reports | Needs Stripe products configured in dashboard |

---

## 🧪 Priority quick-tests (10 min)

1. Sign in → Home → confirm **Moonstones widget, tonight's moon, 3-second reading tile, tarot companion tile** all render
2. Readings → **Runes** tab → cast → confirm "Ask the Oracle about this cast" card appears below the 3 runes
3. Readings → **Dice** tab → roll → readout
4. Home → **3-second reading** → ask "what should I focus on today?" → verify AI response with card draw
5. Home → **Tarot companion** → confirm card auto-drawn and AI starts chat
6. Profile → **Career Archetype Report** → unlock card appears (need MBTI set)
7. Profile → **Year Ahead Forecast** → unlock card (need birth data)
8. Profile → **Full Natal Chart** → unlock card, wheel renders after unlock, toggle Natal/Transits/Progressions/Solar Return/Synastry
9. Quizzes tab → take **Jungian Cognitive Functions** → confirm "Ask the Oracle about this result" card below affirmation
10. `/admin` → confirm Moderation + Advisor Verifications panels

Any issue → message back with the section number.
