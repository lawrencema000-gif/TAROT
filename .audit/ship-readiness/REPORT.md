# Ship-Readiness Audit — tarotlife.app

Run: 2026-04-21T16:26:13.850Z
Account: lawrence.ma000@gmail.com

## Verdicts

| Flow | Verdict |
|---|---|
| 01-signin — Sign in with email/password + session + home render | ✅ pass |
| 02a-home — Bottom-nav: Home | ✅ pass |
| 02b-readings — Bottom-nav: Readings | ✅ pass |
| 02c-horoscope — Bottom-nav: Horoscope | ✅ pass |
| 02d-quizzes — Bottom-nav: Quizzes | ✅ pass |
| 02e-more — Bottom-nav: More | ✅ pass |
| 03-tarot-money — Tarot: Money topic → 1-Card Daily → Draw → AI interpret | ❌ fail |
| 04-readings-horoscope — Readings → Horoscope sub-tab scroll/content | ✅ pass |
| 05-compatibility — Readings → Compatibility → partner sign | ⚠️ warn |
| 06-library — Readings → Library → open Tarot Basics | ❌ fail |
| 07a-horoscope-today — Horoscope → Today | ✅ pass |
| 07b-horoscope-chart — Horoscope → Chart | ✅ pass |
| 07c-horoscope-forecast — Horoscope → Forecast | ✅ pass |
| 07d-horoscope-explore — Horoscope → Explore | ✅ pass |
| 08-quizzes-mbti — Quizzes → MBTI → answer 3 questions | ⚠️ warn |
| 09-profile — More → Profile: XP / streak / rank | ✅ pass |
| 10-language-switch — Settings → Language → JA → EN | ⚠️ warn |
| 11-signout — Sign out from Settings → redirect to landing | ⚠️ warn |
| 12-signin-again — Sign back in — session resumes cleanly | ✅ pass |

## Global Totals
- Console errors: **2**
- Page errors (uncaught): **0**
- Network failures: **2**
- HTTP 4xx/5xx: **2**

## Per-Flow Detail

### ✅ 01-signin — Sign in with email/password + session + home render
- Verdict: **pass**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\01-signin`
- Notes:
  - sign-in button clicked: true
  - auth URL: https://tarotlife.app/?lang=en
  - email filled: true, password filled: true
  - submit result: true
  - URL after sign-in: https://tarotlife.app/?lang=en
  - bottom nav present: true
- Network failures:
  - `net::ERR_ABORTED HEAD https://ulzlthhkqjuohzjangcq.supabase.co/rest/v1/daily_rituals?select=id&user_id=eq.7bc78b43-0626-4dae-856b-baa1e22ff315`

### ✅ 02a-home — Bottom-nav: Home
- Verdict: **pass**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\02a-home`
- Notes:
  - tab "Home" clicked: true

### ✅ 02b-readings — Bottom-nav: Readings
- Verdict: **pass**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\02b-readings`
- Notes:
  - tab "Readings" clicked: true

### ✅ 02c-horoscope — Bottom-nav: Horoscope
- Verdict: **pass**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\02c-horoscope`
- Notes:
  - tab "Horoscope" clicked: true

### ✅ 02d-quizzes — Bottom-nav: Quizzes
- Verdict: **pass**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\02d-quizzes`
- Notes:
  - tab "Quizzes" clicked: true
- Console errors (1):
  - `Failed to load resource: the server responded with a status of 404 ()`
- HTTP 4xx/5xx:
  - `HTTP 404 POST https://tarotlife.app/locales/add/en/app`

### ✅ 02e-more — Bottom-nav: More
- Verdict: **pass**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\02e-more`
- Notes:
  - tab "More" clicked: true

### ❌ 03-tarot-money — Tarot: Money topic → 1-Card Daily → Draw → AI interpret
- Verdict: **fail**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\03-tarot-money`
- Notes:
  - Money topic clicked: false
  - 1-card daily clicked: false
  - Draw clicked: false
  - Revealed action tried: DOM click
  - AI interpret clicked: false
  - AI interpretation appears successful: true

### ✅ 04-readings-horoscope — Readings → Horoscope sub-tab scroll/content
- Verdict: **pass**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\04-readings-horoscope`

### ⚠️ 05-compatibility — Readings → Compatibility → partner sign
- Verdict: **warn**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\05-compatibility`
- Notes:
  - partner sign clicked: false

### ❌ 06-library — Readings → Library → open Tarot Basics
- Verdict: **fail**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\06-library`
- Notes:
  - Tarot Basics clicked: false

### ✅ 07a-horoscope-today — Horoscope → Today
- Verdict: **pass**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\07a-horoscope-today`
- Notes:
  - Today sub-tab click: true

### ✅ 07b-horoscope-chart — Horoscope → Chart
- Verdict: **pass**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\07b-horoscope-chart`
- Notes:
  - Chart sub-tab click: true

### ✅ 07c-horoscope-forecast — Horoscope → Forecast
- Verdict: **pass**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\07c-horoscope-forecast`
- Notes:
  - Forecast sub-tab click: true

### ✅ 07d-horoscope-explore — Horoscope → Explore
- Verdict: **pass**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\07d-horoscope-explore`
- Notes:
  - Explore sub-tab click: true

### ⚠️ 08-quizzes-mbti — Quizzes → MBTI → answer 3 questions
- Verdict: **warn**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\08-quizzes-mbti`
- Notes:
  - MBTI clicked: false
  - Q1 answered: false
  - Q2 answered: false
  - Q3 answered: false

### ✅ 09-profile — More → Profile: XP / streak / rank
- Verdict: **pass**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\09-profile`
- Notes:
  - XP present: true, Streak present: true, Rank/Level present: true
- Console errors (1):
  - `Failed to load resource: the server responded with a status of 404 ()`
- HTTP 4xx/5xx:
  - `HTTP 404 POST https://tarotlife.app/locales/add/en/app`

### ⚠️ 10-language-switch — Settings → Language → JA → EN
- Verdict: **warn**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\10-language-switch`
- Notes:
  - Settings opened: true
  - Japanese clicked: false
  - html[lang] after JA switch: en
  - Japanese chars present on home: false
  - Back to English: true
- Network failures:
  - `net::ERR_ABORTED HEAD https://ulzlthhkqjuohzjangcq.supabase.co/rest/v1/daily_rituals?select=id&user_id=eq.7bc78b43-0626-4dae-856b-baa1e22ff315`

### ⚠️ 11-signout — Sign out from Settings → redirect to landing
- Verdict: **warn**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\11-signout`
- Notes:
  - sign-out clicked: false
  - URL after sign-out: https://tarotlife.app/
  - On landing (no bottom nav): false, body has content: true

### ✅ 12-signin-again — Sign back in — session resumes cleanly
- Verdict: **pass**
- Artifacts: `C:\Users\lmao\TAROT\.audit\ship-readiness\12-signin-again`
- Notes:
  - bottom nav present after re-signin: true


## All Unique Console Errors
- `Failed to load resource: the server responded with a status of 404 ()`

## All Uncaught Page Errors

## All HTTP 4xx/5xx Responses
- `HTTP 404 POST https://tarotlife.app/locales/add/en/app`

## All Network Failures
- `net::ERR_ABORTED HEAD https://ulzlthhkqjuohzjangcq.supabase.co/rest/v1/daily_rituals?select=id&user_id=eq.7bc78b43-0626-4dae-856b-baa1e22ff315`