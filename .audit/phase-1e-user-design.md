# Phase 1E — User-Level + Design Audit

**Scope:** 15 new pages. Check loading / empty / error states, design-system compliance, i18n coverage, accessibility, mobile-first layout.
**Verdict:** 🟢 Good. Minor polish needed.

---

## Page state coverage

| Page | Loading | Error | Empty state | Notes |
|---|---|---|---|---|
| RunesPage | ⚠️ instant render | N/A | N/A | Pure client-side cast; no network path needed |
| DicePage | ⚠️ 700ms timeout fake | N/A | N/A | Same pattern as Runes |
| QuickReadingPage | ✅ full | ✅ rate-limit + unavailable + generic | ✅ default state | Well-structured |
| TarotCompanionPage | ✅ while drawing | ✅ toast on AI failure | ✅ empty stub | |
| CompatInvitePage | ✅ | ✅ 4 distinct error cases | N/A | 5-case branch for invite states |
| YearAheadReportPage | ✅ checking, computing | ✅ natal-missing + generic | N/A | |
| NatalChartReportPage | ✅ | ✅ chart-missing + need birth data | N/A | Chart wheel renders inside |
| CareerReportPage | ✅ | ✅ insufficient balance + generic | ✅ needs-MBTI CTA | |
| AdvisorBookingPage | ✅ | ✅ insufficient + slot-taken + generic | ✅ no-availability | |
| AdvisorSessionPage | ✅ | ✅ toast on RPC failures | ✅ no-messages | |
| AdvisorDashboardPage | ✅ | ✅ | ✅ not-advisor CTA | |
| AdvisorVerifyPage | ✅ | ✅ | ✅ 4 status states | pending / approved / rejected / none |
| LiveRoomsPage | ✅ | ✅ | ✅ "no rooms yet" | |
| LiveRoomPage | ✅ | ✅ | N/A | state-aware UI for scheduled/live/completed |
| SandboxPage | ✅ threeReady flag | ✅ toast on interpret failure | N/A | |

Loading / error states are consistently present. Empty states are reasonable where data is plural.

---

## Findings

### F1 🟡 P1 — No `ErrorBoundary` wrapping each new route
Only the top-level App shell is wrapped in `ErrorBoundary`. A render-time crash in e.g. `SandboxPage` (Three.js failures are real — WebGL may be disabled on some devices) throws all the way up to the App shell and blows away the whole UI.

**Fix:** wrap each lazy route in its own inner boundary, or add `<Suspense>` + `<ErrorBoundary>` inside the Routes block.

### F2 🟡 P1 — `SandboxPage` doesn't gracefully degrade if WebGL is unavailable
Some Android WebView builds disable WebGL. The current code `new THREE.WebGLRenderer({ canvas, ... })` throws if WebGL can't be initialized; no fallback UI.

**Fix:** wrap the `new THREE.WebGLRenderer(...)` call in try/catch, set a `webglSupported` boolean, render a "3D preview is not available on this device" card instead.

### F3 🟢 OK — Design-system compliance
All 15 pages use `<Card>` and `<Button>` from `../components/ui`. A minority use raw `<button>` for specific ad-hoc styling (`RunesPage` once, `NatalChartReportPage` twice, `AdvisorSessionPage` twice, `AdvisorDashboardPage` twice, `LiveRoomPage` once, `SandboxPage` once) — all small in-page tab buttons or close buttons, consistent with existing app patterns. No regressions.

### F4 🟡 P1 — `AdvisorDashboardPage` uses raw `<input>` for cashout amount and time pickers, not the `<Input>` component
```tsx
<input type="number" value={cashoutAmount} onChange={...} className="..." />
```
Inconsistent with the existing form patterns (ProfilePage uses `<Input>` throughout). Visual styling is compatible but accessibility + focus handling diverges.

**Fix:** swap to `<Input>` component where possible. `<input type="time">` and `<input type="date">` don't have Input wrappers — keep raw.

### F5 🟢 OK — i18n usage
Every new page imports `useT` and uses `t(key, { defaultValue })` pattern. All user-visible strings are translatable. Stub translations already backfilled to JA/KO/ZH in the finishing pass.

### F6 🟡 P2 — Some pages lack explicit `aria-label` on icon-only buttons
Spotted: `AdvisorSessionPage`, `AdvisorDashboardPage`, and `SandboxPage` have exactly 1 `aria-label` each. `RunesPage`, `DicePage`, `QuickReadingPage`, `CompatInvitePage`, `CareerReportPage` have zero.

**Specific gaps:**
- Star rating buttons on `AdvisorSessionPage` have `aria-label={${n} star${n === 1 ? '' : 's'}}` ✅
- Close-card button on `CrisisBanner` has `aria-label` ✅
- Icon-only "Share" / "Copy" / tip buttons — most don't
- Emoji-only select buttons in `SandboxPage` — none

**Fix:** low-priority screen-reader polish. Doesn't block release but improves usability.

### F7 🟡 P2 — Mobile-first only (no desktop breakpoints)
Confirmed: no pages use `sm:`, `md:`, `lg:`, `xl:` Tailwind breakpoints. Existing pages (HomePage, ProfilePage, ReadingsPage) also don't. This is consistent with the app's mobile-first model.

On tablet/desktop the app renders inside a centered 512px column, which is the existing design. **No regression here; if the user wanted desktop layouts they'd be pre-existing missing work, not a Session A–G gap.**

### F8 🟡 P2 — Native deep-link mismatch (referenced from 1A F6)
Pages that generate shareable URLs hardcode `https://tarotlife.app/`:
- [ReferralSheet.tsx](../src/components/referral/ReferralSheet.tsx) — `https://tarotlife.app/invite/${code}` (wait, this is referral — the code is for a referral code, routes to ... nowhere — there's no `/invite/` route for referral codes on the web app)
- [InviteFriendSheet.tsx](../src/components/compat/InviteFriendSheet.tsx) — `https://tarotlife.app/invite/${code}` — OK this one matches the compat-invite route but wrong host for the Capacitor shell

Both will fail on native deep-link. Covered in 1A F6 fix.

### F9 🟡 P2 — `CareerReportPage` — `mbti` used as reference doesn't uniquely identify a user
In the unlock flow:
```tsx
const reference = mbti;  // e.g. 'INTJ'
await reportUnlocks.unlockWithMoonstones('career-archetype', mbti, ...)
```

This puts the MBTI type (only 16 possible values) as the `reference` on `report_unlocks`. Multiple users with the same MBTI share the same reference. The table's PK is `(user_id, report_key, reference)` — so within a single user's row space it's fine, but it's weird semantically.

**Fix (cosmetic):** use `<mbti>-<userId>` or just leave it. Doesn't break anything.

### F10 🟢 OK — Toast + loading-constellation usage
All new pages that need a global spinner use the app's `loading-constellation` class or the `<ListSkeleton>` component. Toasts use the existing `toast(msg, 'success'|'error'|'info')` helper. Consistent.

### F11 🟡 P2 — Some forms lack keyboard submit handling
- `AdvisorVerifyPage` — file uploads are via button clicks, form submit doesn't exist as a form (just a sequence of cards). OK, acceptable pattern.
- `CompatInvitePage` partner input — no Enter key handling. User has to tap button.
- `AdvisorBookingPage` topic textarea — Enter inserts newline (correct for textarea).

Minor UX polish. Not a blocker.

### F12 🟢 OK — Chart wheel accessibility
`ChartWheel.tsx` has `role="img"` + `aria-label="Natal chart wheel"` on the SVG. Individual planet groups are clickable and surface a panel below — a keyboard user can tab into them. Acceptable.

---

## Summary

| ID | Severity | Fix complexity |
|----|----------|----------------|
| F1 (no inner ErrorBoundary) | 🟡 P1 | XS — wrap the `<Suspense>` lazy block in App.tsx |
| F2 (Sandbox WebGL fallback) | 🟡 P1 | XS — try/catch around renderer init |
| F4 (raw inputs in AdvisorDashboard) | 🟡 P1 | XS |
| F6 (aria-label on icon buttons) | 🟡 P2 | S — pass through all icon buttons |
| F8 (native deep-link share host) | 🟡 P2 | bundled with 1A F6 |
| F11 (Enter-key form submit) | 🟡 P2 | XS |

**None of these are P0 release blockers.** The page behavior is solid, state coverage is complete, design-system usage is consistent. Phase 2E will address F1, F2, F4, F6.
