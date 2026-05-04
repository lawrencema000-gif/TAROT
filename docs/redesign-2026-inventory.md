# Arcana / TAROT — Redesign 2026 Surface Inventory

**Generated:** 2026-05-04
**Branch:** `feature/redesign-2026`
**Stack:** React 19 + Vite + TypeScript + Tailwind, Capacitor wrapper for native (iOS/Android)
**Scope:** Web-first visual redesign. Native app inherits 90% of the work since it shares the React tree; final QA pass on Capacitor only.

This doc is the source of truth for what surfaces need to be redesigned, their gating, and their complexity. It is a planning artifact — does not ship to users. Update it as scope shifts.

---

## Constraints (read before any code change)

- **No feature removals.** Restyle / relayout only. If something looks like it should go, flag and ask first.
- **No logic changes.** Don't touch auth flows, RC entitlements, edge functions, DB queries, feature flags, AI calls, i18n keys.
- **CTA stays gold** (#d4af37). Existing brand recognition for premium users.
- **Card art untouched.** All 78 tarot card faces + back designs stay exactly as-is.
- **Branch-first.** Each phase ships to a sub-branch off `feature/redesign-2026`, user tests via Netlify preview, then merge up. Final merge to `main` only after full sign-off.
- **CJK font fallback preserved.** Cormorant Garamond + Noto Serif JP/KR/SC chain stays intact for all 4 supported languages.

---

## 1. Bottom navigation tabs

`src/components/layout/BottomNav.tsx` — 5 visible tabs + More drawer.

| Tab | Label key | Icon | Route | Page | Notes |
|---|---|---|---|---|---|
| home | `nav.home` | Home | `/` | HomePage | Always visible; daily ritual entry |
| readings | `nav.readings` | Sparkles | `/readings` | ReadingsPage | 13+ feature hub |
| horoscope | `nav.horoscope` | Star | `/horoscope` | HoroscopePage | Free |
| quizzes | `nav.quizzes` | Brain | `/quizzes` | QuizzesPage | Free |
| more | `nav.more` | MoreHorizontal | — | (drawer) | Slides up grid of 8–12 items |

**More drawer items** (feature-flag conditional):
- achievements, journal, companion (flag), advisors (flag), community (flag), whispering-well (flag), blog (web-only), profile, admin (admin-only), shop (external link to yinyangguardian.com)

**Redesign complexity:** Low.

---

## 2. Top-level routes

### Auth & onboarding (pre-login)
| Route | Component | Description | Gating | Complexity |
|---|---|---|---|---|
| `/` (unauth) | LandingPage | Marketing hero, social proof, FAQ, CTAs | Public | Medium |
| `/auth` | AuthPage | Email/password + OAuth (Google, Apple) | Redirect if authed | Medium |
| `/signin` | AuthPage | SEO-friendly sign-in route | Public | Low |
| `/signup` | OnboardingPage | SEO-friendly sign-up route | Public | Medium |
| `/onboarding` | OnboardingPage | Multi-step (email, birth date/time/place, goals, love language) | First-launch native or after signup | **High** |
| `/oauth-onboarding` | OAuthOnboardingPage | Fill missing fields post-OAuth | Post-OAuth | Medium |
| `/reset-password` | ResetPasswordPage | New password form. Overrides all routes when PASSWORD_RECOVERY active. | Recovery session | Low |

### Primary app surfaces (main tabs)
| Route | Component | Description | Gating | Complexity |
|---|---|---|---|---|
| `/` | HomePage | Daily ritual: tarot draw, horoscope, prompt, streak | Free auth | Medium |
| `/readings` | ReadingsPage | 13+ tab hub | Free + paywalled tabs | **High** |
| `/horoscope` | HoroscopePage | Daily/weekly/monthly/yearly | Free | Medium |
| `/quizzes` | QuizzesPage | Personality/compatibility quizzes | Free | Medium |
| `/achievements` | AchievementsPage | Unlocks, ranks, XP | Free auth | Low |
| `/journal` | JournalPage | Entry CRUD + mood + templates | Free auth | Medium |
| `/profile` | ProfilePage | Profile editor + saved highlights + invite sheets | Free auth | Medium |

### Reading features (nested in /readings hub, lazy-loaded sub-pages)
These exist in `src/pages/` but are not directly routed — reached via tab in ReadingsPage.

| Page file | Tab | Gating |
|---|---|---|
| (TarotSection inside ReadingsPage) | Tarot | Free |
| (HoroscopeSection) | Horoscope | Free |
| (CompatibilitySection) | Compatibility | Free |
| IChingPage | I Ching | Free (flag) |
| HumanDesignPage | Human Design | **Premium** |
| BaziPage | Bazi | **Premium** |
| DreamInterpreterPage | Dream | **Premium** |
| MoodDiaryPage | Mood | Free (flag) |
| PartnerCompatPage | Partner | **Premium** |
| FengShuiPage | Feng Shui | Free (flag) |
| RunesPage | Runes | Free + premium depth |
| DicePage | Dice | Free |
| (LibrarySection) | Library | Free |

### Specialized features (own routes)
| Route | Component | Description | Gating | Complexity |
|---|---|---|---|---|
| `/ai/quick` | QuickReadingPage | Quick AI reading | Free + Moonstones | Low |
| `/ai/tarot` | TarotCompanionPage | Multi-turn AI chat about a card | Free chat + Moonstones for AI | Medium |
| `/companion` | AiCompanionPage | General AI companion chat | Free + Moonstones | Medium |
| `/pick-a-card` | PickACardPage | Quick 3-card pick | Free | Low |
| `/soulmate-score` | SoulmateScorePage | Compat % calculator | Free | Low |
| `/love-tree` | LoveTreePage | Crush/partner tracker over time | Free | Medium |
| `/mirror` | MirrorPage | Random affirmation oracle | Free | Low |
| `/spreads` | SpreadsPage | Spread catalog | Public | Low |
| `/spreads/:slug` | SpreadDetailPage | Spread detail + try | Public + premium custom | Medium |
| `/spreads/builder` | SpreadBuilderPage | Drag-drop custom spread | **Premium** | **High** |
| `/journey` | FoolsJourneyPage | 22-card narrative arc | Free | Medium |
| `/live-rooms` | LiveRoomsPage | Live room directory | Free browse | Low |
| `/live-rooms/:id` | LiveRoomPage | Realtime listener count, voice, tipping | Free entry + premium voice/replay | **High** |
| `/advisors` | AdvisorsPage | Directory + filters | Free browse | Medium |
| `/advisors/:slug/book` | AdvisorBookingPage | Time slot + pay | **Premium** | **High** |
| `/advisors/session/:id` | AdvisorSessionPage | Realtime chat session, voice, rating | **Premium** | **High** |
| `/advisors/dashboard` | AdvisorDashboardPage | Advisor-only earnings/calendar | Advisor role | **High** |
| `/advisors/verify` | AdvisorVerifyPage | Credential upload | Public | Medium |

### Reports
| Route | Component | Gating | Complexity |
|---|---|---|---|
| `/reports/career` | CareerReportPage | **Premium** + birth chart | Medium |
| `/reports/year-ahead` | YearAheadReportPage | **Premium** + flag | Medium |
| `/reports/natal-chart` | NatalChartReportPage | **Premium** + birth data | **High** |

### Community
| Route | Component | Gating | Complexity |
|---|---|---|---|
| `/community` | CommunityPage (mode="normal") | Free + flag | Medium |
| `/whispering-well` | CommunityPage (mode="whispering-well") | Free + flag | Medium |

### Admin & dev
| Route | Component | Gating | Complexity |
|---|---|---|---|
| `/admin` | AdminPage | `isAdmin` only | **High** |
| `/sandbox` | SandboxPage | Dev only | Medium |

### Public SEO surface (web-only, simpler chrome)
| Route | Component | Complexity |
|---|---|---|
| `/blog` | BlogPage | Low |
| `/blog/:slug` | BlogPostPage | Low |
| `/tarot-meanings` | TarotMeaningsPage | Low |
| `/tarot-meanings/:slug` | TarotCardMeaningPage | Low |
| `/spreads` | SpreadsPage | Low |
| `/spreads/:slug` | SpreadDetailPage | Medium |
| `/astrology` | AstrologyLearnPage | Medium |
| `/astrology/:slug` | AstrologyEntryPage | Low |
| `/numerology` | NumerologyLearnPage | Medium (calculators) |
| `/numerology/:slug` | NumerologyEntryPage | Low |
| `/glossary` | GlossaryPage | Low |
| `/glossary/:slug` | GlossaryEntryPage | Low |
| `/crystals` | CrystalsPage | Low |
| `/crystals/:slug` | CrystalEntryPage | Low |
| `/reading/:token` | SharedReadingPage | Medium |
| `/unsubscribe` | UnsubscribePage | Low |
| `/invite/:code` | CompatInvitePage | Medium |

---

## 3. Sheet / modal / overlay surfaces

All sheets share `src/components/ui/Sheet.tsx` wrapper (slide-up, dark backdrop, escape close, sets `body.sheet-open` to hide bottom nav).

| Sheet | Trigger | Content | Gating | Complexity |
|---|---|---|---|---|
| **SearchSheet** | Header search icon | Search input, recent searches, quick links | Free | Low |
| **SavedSheet** | Header star icon | Saved items + filter chips | Free | Low |
| **SettingsSheet** | Header settings icon | Multi-sub-sheet: Main, EditProfile, Appearance, Notifications, Language, Help, Terms, Privacy, DeleteConfirm (7+ panels) | Free auth | **High** |
| **PaywallSheet** | Premium feature click w/o sub | Plan selector, pricing, subscribe | Free view | Medium |
| **SubscriptionSheet** | "Manage Subscription" in Settings | Status, plan, renewal, upgrade/downgrade | Active sub | Medium |
| **WatchAdSheet** | "Watch ad for free reading" CTA | Ad player + reward | Free | Medium |
| **TrialReminderModal** | Auto on cold start (trial users) | "Trial ends in X days" + upgrade CTA | Trial only | Low |
| **LevelUpCelebration** | Auto on level up event | Confetti + new level + XP | Free | Low |
| **RateAppSheet** | Auto after engagement | 5-star prompt | Free | Low |
| **DiagnosticsSheet** | 5x version tap or error boundary | System diagnostics, logs | Dev only | Low |
| **EarnMoonstonesSheet** | Moonstones widget click | Earn methods (ad, daily, sub, IAP) | Free | Medium |
| **ReferralSheet** | "Invite friends" in Profile | Code + share | Free | Low |
| **InviteFriendSheet** | "Invite for compat" action | Friend input + send | Free | Low |
| **AchievementUnlockModal** | Auto on achievement unlock | Icon + animation | Free | Low |

PaywallSheet is the most context-sensitive — appears in 15+ contexts with different feature-specific copy. SettingsSheet is the largest single component.

---

## 4. UI primitives

`src/components/ui/`

### Button.tsx
Variants: `primary | secondary | ghost | outline | gold | destructive` × sizes `sm | md | lg`. Props: `loading | fullWidth | glow`.

### Input.tsx / TextArea.tsx
Props: `label | error | icon`. Focus ring gold, error red.

### Card.tsx
Variants: `default | glow | elevated | ornate`. `ornate` has parchment radial gradients + corner SVG flourishes.
Sub-components: CardHeader, CardTitle, CardContent.

### Chip.tsx
- `Chip` — generic with `variant` (default/gold/outline)
- `InsightChip` — category-coloured (love=coral, career=cosmic-blue, clarity=teal, confidence, growth, connection)
- `ChipGroup` — single/multi-select

### Skeleton.tsx
Generic + 10+ specific (CardSkeleton, TarotCardSkeleton, HoroscopeSkeleton, JournalEntrySkeleton, QuizCardSkeleton, ProfileSkeleton, ListSkeleton, HomePageSkeleton, ReadingsPageSkeleton, HoroscopePageSkeleton, RitualCardSkeleton).

### Sheet.tsx
Bottom sheet wrapper. `variant: default | glow`. Auto manages `body.sheet-open`.

### Toast.tsx
`useToast()` / `toast()`. Types: info | success | error | warning.

### Progress.tsx
Linear bar 0–100.

### Other
TarotCardFrame, MysticalStar, Ornament (FourCornerFlourishes SVG), RitualCardStack.

**Total:** ~14 component files. Retheming cascades to every screen — Phase 1 multiplier.

---

## 5. Layout / shell components

`src/components/layout/` and `src/components/home/`

| Component | Purpose | Complexity |
|---|---|---|
| Header.tsx | Title + 3 icon buttons (search/saved/settings) | Low |
| BottomNav.tsx | 5 tabs + More drawer + flag conditionals | Medium |
| CelestialBackground.tsx | Animated starfield (Framer Motion) | Medium |
| DailyWisdomCard.tsx | Daily quote card | Low |
| MoonPhaseCard.tsx | Moon phase + lunar day | Low |
| MoonstoneWidget.tsx | Premium currency display + earn CTA | Low |

App.tsx layout: `max-w-lg mx-auto` centered, `safe-top`/`safe-bottom` for notch/home-bar, fixed bottom nav, conditional background (Celestial / image / solid), per-route ErrorBoundary, Suspense + ListSkeleton.

---

## 6. Color & typography tokens

`tailwind.config.js`:

```
mystic.50 → 950   (primary dark palette, 950=#080812)
gold              (DEFAULT #d4af37, light #f4d668, dark #b8960f, glow rgba)
coral             (love/emotion accent)
teal              (clarity accent)
cosmic.blue       (#4a7eb8)
cosmic.rose       (#d4848c)

font.display: Cormorant Garamond + Noto Serif JP/KR/SC + Georgia
font.body:    Inter + Noto Sans JP/KR/SC + system-ui
```

`src/index.css` utilities:
- `.text-gradient-gold`, `.border-glow`, `.constellation-bg`, `.loading-constellation`
- `.safe-top`, `.safe-bottom`
- `.sheet-open` body class — hides bottom nav
- `.keyboard-open` body class — hides bottom nav when soft keyboard up

Box shadows: `glow`, `glow-md`, `glow-lg`, `glow-coral`, `glow-teal`, `inner-glow`, `card`, `card-hover`.

Animations: `shimmer`, `float`, `float-gentle`, `pulse-slow`, `spin-slow`, `fade-in`, `slide-up`, `scale-in`, `card-flip`, `tarot-reveal`, `confetti`, `bounce-in`, `glow-pulse`.

---

## 7. Special / anomalous screens (bespoke treatment)

Screens that depart from the standard "header + scrollable + bottom nav" template:

| Screen | Why it's special | Complexity |
|---|---|---|
| AdvisorSessionPage | Realtime chat + voice strip + session state machine | **High** |
| LiveRoomPage | Realtime listener count + tipping + voice | **High** |
| SpreadBuilderPage | Drag-drop canvas | **High** |
| LandingPage | Marketing hero, non-app chrome | Medium |
| OnboardingPage | Multi-step form + geo lookup + image upload | **High** |
| OAuthOnboardingPage | Condensed multi-step form | Medium |
| AdvisorDashboardPage | Calendar + analytics + role-specific | **High** |
| AdminPage | Multi-panel admin (users, flags, blog, moderation) | **High** |
| SandboxPage | Dev component showcase | Medium |

---

## 8. Feature flags driving conditional surfaces

Approximate list (live in `feature_flags` Supabase table):

iching, human-design, bazi, dream-interpreter, mood-diary, partner-compat, feng-shui, runes, dice, daily-wisdom, moonstones, moon-phases, ai-quick-reading, ai-tarot-companion, pick-a-card, soulmate-score, daily-mission, love-tree, community, whispering-well, ai-companion, advisors, referral, compat-invite, career-report, year-ahead-report, natal-chart-report, bazi-depth, advisor-voice, live-rooms-voice.

The redesign must work whether each flag is on or off — don't hardcode visibility.

---

## 9. Phased redesign plan

| Phase | Sub-branch | Scope | Days | Risk |
|---|---|---|---|---|
| 1 | `redesign-2026/phase-1-design-system` | Tokens, typography, ornaments, retheme all UI primitives | 2 | Low |
| 2 | `redesign-2026/phase-2-shell` | Header, BottomNav, Sheet wrapper, all 14 sheets | 2 | Low-medium |
| 3 | `redesign-2026/phase-3-main-surfaces` | Home, Readings hub frame, Horoscope, Quizzes, Profile, Journal, Achievements | 2 | Medium |
| 4 | `redesign-2026/phase-4-reading-features` | All 13 ReadingsPage sub-tabs + standalone reading features | 2-3 | Medium |
| 5 | `redesign-2026/phase-5-specialized` | AdvisorSession, LiveRoom, SpreadBuilder, Admin, AdvisorDashboard, Onboarding, Landing, Reports | 2-3 | Higher |
| 6 | `redesign-2026/phase-6-public-and-auth` | Blog, TarotMeanings, Spreads, Astrology, Numerology, Glossary, Crystals, AuthPage, ResetPassword, Unsubscribe, SharedReading | 1-2 | Low |

**Total: 11–14 working days** for full coverage, web-first.

Per-phase loop:
1. Sub-branch off `feature/redesign-2026`
2. Implement
3. Push → Netlify auto-deploys preview URL
4. User tests preview
5. User signs off → merge sub-branch into `feature/redesign-2026`
6. Move to next phase
7. After all 6 phases sign off → merge `feature/redesign-2026` into `main` → live deploy

Rollback: `git revert` on the merge commit reverses everything in one move.

---

## 10. Inventory totals

| Surface | Count |
|---|---|
| Page components in `src/pages/` | 63 |
| Sheets / modals | 14 |
| UI primitives | ~14 |
| Layout / shell components | 6 |
| Feature flags | ~30 |
| Public SEO routes (web-only) | 16 |
| Special / anomalous screens | 9 |

---

## Notes

- Mobile (Capacitor) inherits all redesign work since it wraps the same React tree. Final QA pass on Capacitor: keyboard behaviour, safe-area padding, status bar style, splash screen — already handled per existing platform code.
- i18n: 4 locales (en/ja/ko/zh-Hant). Any new strings get added to all 4 namespaces.
- A11y baseline: keep existing aria-labels, focus rings, semantic HTML.
- Performance: keep lazy-loading boundaries intact (Vite chunks per-page).
