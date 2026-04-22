# Briefing prompt for new Claude session — Arcana v2 build

**Context:** You (the user) are starting a fresh Claude session to build Arcana v2 (the full-fat Cece clone, Western-repositioned). This prompt gives that new Claude everything it needs to start working without re-planning.

## Before you open the new session

1. Open the new Claude session **outside** the `C:\Users\lmao\TAROT` directory. Cd to `C:\Users\lmao\` or somewhere neutral first — you do NOT want the new session treating the live TAROT repo as its working project. The v2 work will happen in a new folder.

2. Have your **six decisions** ready to answer. The new Claude will ask these before starting Phase 0:
   - Brand name (Oracle, Cinnabar, Veil, Tessera, Sybil, Inkwell, Arcana Pro, or your pick)
   - Domain you're willing to buy
   - Advisor marketplace: core bet or backburner?
   - iOS at launch, or Android-only first?
   - Sunset v1 when v2 ships, or keep v1 as the free edition?
   - Contractor budget commitment for months 1-3 ($5-10k recommended)

---

## Copy-paste this into the new Claude session

```
I'm building a second product parallel to my existing tarot/astrology app (Arcana, live at tarotlife.app, com.arcana.app). The new product is a test-run clone of the Cece app (测测) with everything ported and re-skinned for Western users while keeping Eastern depth systems (I-Ching, Bazi, Ayurveda, Feng Shui, sandplay) as the differentiation hook.

The full plan is at: C:\Users\lmao\TAROT\.audit\ARCANA-V2-FULL-PLAN.md
The competitive analysis of Cece is at: C:\Users\lmao\TAROT\.audit\CECE-COMPETITIVE-ANALYSIS.md

Please read both files first. The plan document is the source of truth — follow it.

## Critical constraint

Arcana v1 (tarotlife.app, com.arcana.app, Supabase project `ulzlthhkqjuohzjangcq`, GitHub repo `lawrencema000-gif/TAROT`, Netlify site `arcana-ritual-app`) is LIVE with real users. Do NOT touch ANY of those resources. v2 is a fully separate product with new repo, new bundle ID, new Supabase project, new domain, new keystore, new everything. Section 1 of the plan spells out the full isolation.

## My identity + available tools

- GitHub account: lawrencema000-gif
- GitHub CLI: /c/Program Files/GitHub CLI/gh.exe (authenticated)
- Supabase CLI: /c/Users/lmao/node_modules/supabase/bin/supabase.exe (authenticated, org ID tunyylunchiaxdnjidyl)
- Netlify CLI: netlify (authenticated as lawrence.ma000@gmail.com, team lawrencema000-gifs-projects)
- Vercel CLI: vercel (authenticated as lawrencema000-gif)
- gcloud: authenticated as lawrence.ma000@gmail.com
- Node 25, Windows 11, bash shell
- Full permission to create new resources autonomously (new GitHub repos, new Supabase projects, new Netlify sites, new Vercel projects)

## What to do first

1. Read both planning docs. Confirm you understand the scope.
2. Ask me the six open decisions from section 10 of ARCANA-V2-FULL-PLAN.md. Wait for all six answers.
3. Once I answer, propose a working directory path for v2 (e.g., `C:\Users\lmao\arcana-v2\`). Don't use Desktop.
4. Execute Phase 0 end-to-end:
   - Create new GitHub repo with starter scaffold (clone of current TAROT v1 as baseline)
   - Rename all package/domain references to new brand name
   - Create new Supabase project via CLI, apply migrations from v1 as baseline schema
   - Wire up new Netlify (or Vercel) site with GitHub auto-deploy
   - Create new Sentry project, stub DSN
   - Generate new Android keystore, configure Capacitor with new bundle ID
   - Register new OAuth Android client in Google Cloud
   - Create new Play Console app listing (Internal Testing track only)
   - Bump version numbers to 0.1.0 and reset versionCode to 1
   - Open PR (or push to main, solo dev) with the whole scaffold
5. Before starting Phase 1 (content), confirm Phase 0 is fully deployed and the empty v2 app opens in a browser at the new domain with a "Hello from Arcana v2" placeholder. Only then continue to Phase 1.

## Style + preferences from prior sessions

- Ship small, ship often. Commit + push after each distinct piece of work.
- Don't ask permission for low-risk autonomous actions (creating repos, setting env vars, running migrations). Do ask before: destructive ops (deleting repos, hard resets, force pushes), actions that touch paid services (buying a domain), anything that risks the live Arcana product.
- Keep me updated on what's happening, but terse. One sentence per update at key moments, end-of-turn summary in 1-2 sentences. No mid-response commentary.
- Use dedicated tools (Edit, Write, Glob, Grep, Bash). Don't use bash for things the specialized tools do better.
- Every feature needs full i18n support (EN / JA / KO / ZH) baked in from day one. Use the same localizeQuiz pattern from v1.
- Use semantic commits with Co-Authored-By Claude trailer. Example format:
  ```
  feat(phase-0): bootstrap arcana v2 infrastructure
  
  - New GitHub repo + Capacitor scaffold
  - Supabase project with baseline schema
  - Netlify site wired for auto-deploy
  - etc.
  
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```
- Match React + Vite + Capacitor + Supabase + TypeScript strict style from v1. I'm comfortable with TS. Don't over-explain language features.
- When you finish a phase, write a checkpoint doc into `/.audit/` in the new repo explaining what was built + what the next phase will do.
- For contractor-dependent phases (content writing, translations, advisor recruiting), produce detailed briefs I can hand off — don't stall the build waiting for them.

## What NOT to do

- Do NOT modify the live Arcana v1 repo at C:\Users\lmao\TAROT\ for any reason. If anything in v1 needs to be reused as reference material, read it but don't write to it.
- Do NOT use the live Supabase project, live Netlify site, live Sentry project, or live RevenueCat for v2. Create new ones.
- Do NOT push to the `main` branch of the v1 TAROT repo. It's fine to reference v1 commits as scaffolding, but new code lives in the new v2 repo only.
- Do NOT use Chinese-market services (WeChat login, Alipay, Weibo, Baidu, Douyin). Section 2 of the plan maps them to Western equivalents.
- Do NOT assume iOS is free to add — Apple Developer account + App Store Connect setup is required, confirm with me first.

## Checkpoint cadence

Pause and summarize progress at:
- End of Phase 0 (infrastructure deployed)
- End of Phase 1 (content shipped to internal testing)
- Month-2 checkpoint: community feed DAU measurement
- Month-4 checkpoint: advisor marketplace unit economics review
- Month-6 checkpoint: kill-or-scale decision

Ready to begin? Please start by reading both planning documents, then ask the six Phase-0 decisions.
```

---

## What to expect from the new session

- The new Claude reads both docs end-to-end (few minutes)
- Asks you the six decisions
- Once answered, starts Phase 0 — likely wants to create the new repo, Supabase project, Netlify site, etc. Approve freely.
- Phase 0 takes 1-3 days of iteration. End state: empty v2 web app deploys to a new domain, Android internal-testing AAB installs on your phone alongside Arcana v1.
- Then moves to Phase 1 (content).

## If things drift

If the new session starts suggesting major deviations from the plan (e.g., "let's rewrite in Next.js", "let's skip the advisor marketplace"), push back and point it at the plan doc. The plan is deliberately opinionated because revisiting architecture decisions mid-build wastes weeks.

## When both products coexist

Once v2 is in beta:
- You'll have two apps on your phone (Arcana + [new name])
- Two Supabase projects (both under your dashboard)
- Two Netlify sites
- Two Play Console listings
- Same Google account signs into both with separate profiles

That's the whole point of the isolation. No accidents.
