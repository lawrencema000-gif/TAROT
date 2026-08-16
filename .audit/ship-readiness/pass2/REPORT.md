# Ship-Readiness Audit PASS 2 — tarotlife.app

Run: 2026-04-21T16:30:06.680Z

## Verdicts

| Flow | Verdict |
|---|---|
| 00-signin | ✅ pass |
| 03-tarot-spread-ai | ❌ fail |
| 05-compat-retry | ✅ pass |
| 06-library-retry | ✅ pass |
| 08-quiz-retry | ⚠️ warn |
| 10-lang-retry | ⚠️ warn |
| 11-signout-retry | ⚠️ warn |

## Global
- Console errors: 2
- Page errors: 0
- Net failures: 1
- HTTP 4xx/5xx: 0

### ✅ 00-signin — Sign in
- **Net failed:**
  - `net::ERR_ABORTED https://ulzlthhkqjuohzjangcq.supabase.co/rest/v1/daily_rituals?select=id&user_id=eq.7bc78b43-0626-4dae-856b-baa1e22ff315`

### ❌ 03-tarot-spread-ai — Tarot → 1-Card Daily → reveal → AI interpretation (topic picker investigation)
- 1-Card Daily tile clicked: true
- Topic-picker screen — has "Money": true, Love: true, Career: true
- topic picked: true
- Draw clicked: false
- AI interpret clicked: false
- AI output length: 224, contains error words: false, looks successful: false

### ✅ 05-compat-retry — Compatibility — pick partner zodiac via glyph / detect form
- partner name filled: true
- partner zodiac picked: leo
- Calculate clicked: true
- result text includes compat score/match: true

### ✅ 06-library-retry — Library → Guides → open first guide
- Guides pill clicked: true
- Basics-like guide clicked: false
- guide body length: 567

### ⚠️ 08-quiz-retry — Quizzes → Personality Type Assessment → 3 Q
- Personality Type Assessment click: false
- Q1 body has question mark near top: false
- Q1 answered: false
- Q2 answered: false
- Q3 answered: false
- **Console errors:**
  - `Failed to load resource: the server responded with a status of 404 ()`

### ⚠️ 10-lang-retry — Profile → find Language switcher → JA → EN
- Profile page mentions language/settings: false
- gear/settings opener: true
- language row clicked: true
- Japanese option clicked: true
- html[lang]=ja, Japanese chars on home: true
- back to English: false
- **Console errors:**
  - `Failed to load resource: the server responded with a status of 404 ()`

### ⚠️ 11-signout-retry — Sign out
- profile body mentions sign out: false
- sign-out clicked: false
- url=https://tarotlife.app/profile, still authed: true

## All unique console errors
- `Failed to load resource: the server responded with a status of 404 ()`

## All unique pageerrors

## All unique HTTP 4xx/5xx

## All unique net failures
- `net::ERR_ABORTED https://ulzlthhkqjuohzjangcq.supabase.co/rest/v1/daily_rituals?select=id&user_id=eq.7bc78b43-0626-4dae-856b-baa1e22ff315`