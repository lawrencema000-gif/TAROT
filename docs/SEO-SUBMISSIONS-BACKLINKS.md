# SEO Submissions &amp; Backlinks Playbook — 2026-04-25

A ready-to-execute packet for the off-page half of the SEO boost. Everything
here needs account access or outreach, so it can't be automated from the
repo. Copy the text blocks straight into each form / email.

---

## Priority 1 — Free high-authority directories (do these first)

These are DA 70+ sites that accept free submissions and pass real link equity.
Each one typically takes 5–10 minutes. Create accounts as `hello@tarotlife.app`
or whatever your canonical product email is.

### 1. Product Hunt launch
- URL: https://www.producthunt.com/posts/new
- Category: Lifestyle / Health &amp; Fitness
- Tagline (60 chars): **Daily tarot, horoscope, and reflection — powered by real astronomy.**
- Description (260 chars):
  > Arcana turns your daily self-reflection into a 5-minute ritual: real-ephemeris horoscope, 78-card tarot pull, and a journaling prompt. Under the hood: real Human Design bodygraph, Bazi pillars, AI dream interpretation via Gemini. Free tier + Premium.
- Topics: Tarot, Astrology, Wellness, Journaling, AI
- First comment (post this yourself when you launch):
  > Maker here! Arcana is my love letter to the ancient divination systems I kept seeing turned into gimmicks. Under every reading is real astronomical math — not pre-written sun-sign copy. Happy to answer anything about how the chart engine works, why I went Jungian rather than predictive, or the thinking behind the four-language launch.
- Schedule: Tuesday, Wednesday, or Thursday, 00:01 PT for maximum US visibility.

### 2. AlternativeTo
- URL: https://alternativeto.net/software/add/
- Alternative to: Co-Star, The Pattern, Labyrinthos, Sanctuary
- Category: Lifestyle > Mind &amp; Body
- Paste the "Long description" from `public/press.html`.

### 3. BetaList (if pre-launch variants exist)
- URL: https://betalist.com/submit
- Use shorter pitch; emphasize novelty of real-ephemeris + AI dream interp.

### 4. Indie Hackers app directory
- URL: https://www.indiehackers.com/products
- Link back to tarotlife.app + Product Hunt launch page once live.

### 5. F6S
- URL: https://www.f6s.com/
- Good for B2B visibility + investor scouts.

### 6. StartupStash
- URL: https://startupstash.com/submit/
- Tarot / Wellness category.

### 7. SaaSHub
- URL: https://www.saashub.com/submit-product
- Sometimes manual review, worth the wait.

### 8. Launching Next
- URL: https://www.launchingnext.com/submit/

### 9. ProductCool
- URL: https://www.productcool.com/submit

### 10. WhereToSubmit
- URL: https://wheretosubmit.co/submit

---

## Priority 2 — Claim social profiles (15 min, huge branded-search impact)

Every social profile becomes a `sameAs` entry in the Organization schema. I've
already added placeholder URLs to `src/utils/seo.ts` — swap them for real
handles once claimed. These 5 plus Play Store form the brand-identity anchor
that LLMs + Google use to resolve "who is Arcana?" queries.

- [ ] **Instagram**: @tarotlife.app — bio: "Daily tarot, real astrology, reflective journaling. ✨ tarotlife.app"
- [ ] **TikTok**: @tarotlife.app — same bio
- [ ] **Twitter/X**: @tarotlife_app — bio: "Know yourself. One ritual a day. 🌙 tarotlife.app"
- [ ] **Pinterest**: @tarotlife — domain-verified. Aesthetic pins of cards/horoscopes drive long-tail traffic.
- [ ] **YouTube**: @tarotlife — tutorials on using the app + card meaning explainers. Enables Short-form content.
- [ ] **Medium**: @tarotlife — syndicate 1–2 blog posts/week with canonical URL back to tarotlife.app/blog/*.

After claiming, update `sameAs` array in `src/utils/seo.ts`:
```ts
sameAs: [
  'https://play.google.com/store/apps/details?id=com.arcana.app',
  'https://www.instagram.com/YOUR_REAL_HANDLE/',
  'https://www.tiktok.com/@YOUR_REAL_HANDLE',
  'https://twitter.com/YOUR_REAL_HANDLE',
  'https://www.pinterest.com/YOUR_REAL_HANDLE/',
  'https://www.youtube.com/@YOUR_REAL_HANDLE',
],
```

---

## Priority 3 — Niche directories (tarot/astrology specific)

Smaller DA but highly relevant audience.

- Tarot.com community partner listings
- Astrology.com / AstroSeek referral directories
- r/tarot (value-post only, NEVER spam)
- r/astrology, r/humandesign, r/Iching subreddits
- Reddit post template:
  > I've been building a daily tarot + astrology app that runs on real ephemeris data instead of pre-written sun-sign content, and today we shipped [specific feature]. Not here to spam — just wanted to share a builder's note for anyone interested in how these tools actually compute under the hood. AMA.

---

## Priority 4 — Outreach (earning real backlinks)

Ten blogger/podcast pitches. Personalise the first sentence of each before
sending.

### Template A — Tarot/astrology blog
Subject: **Quick pitch: a tarot app that runs on real astronomy**

> Hi [NAME],
>
> I've been reading [THEIR RECENT POST] — especially the bit about [ONE CONCRETE DETAIL]. Loved that framing.
>
> I'm the maker of Arcana (tarotlife.app), a daily tarot + astrology app that tries to treat the old systems with respect. What sets it apart is that every astrological reading runs on real astronomical ephemeris data rather than the generic sun-sign content most horoscope apps serve. Human Design is computed with the actual 88°-solar-arc calculation. Dream interpretation runs through a Jungian AI prompt (not a fortune-teller).
>
> I thought your audience might find the engine interesting, and I'd love to hear your honest take. Happy to send a Premium code for you to poke around. No strings — if it resonates, wonderful; if not, no harm.
>
> Either way, thanks for the writing.
>
> — [YOUR NAME]
> https://tarotlife.app
> Press kit: https://tarotlife.app/press

### Template B — Wellness/self-help podcast
Subject: **Guest pitch: daily rituals, Jungian dreams, why prediction is a trap**

> Hi [HOST NAME],
>
> Caught your episode on [THEIR EP] and the moment you said [SPECIFIC QUOTE] stuck with me — it's exactly the thread I've been pulling on with Arcana.
>
> I build a tarot/astrology app but my actual thesis is about self-reflection: why predictive language in wellness apps is making people worse at introspecting, and how a daily 5-minute ritual (horoscope + tarot pull + journal prompt) trains better interoception than any habit tracker.
>
> Happy to come on. I can talk about:
>   — How Gen Z returning to tarot is basically a return to Jungian archetypes
>   — Why we ripped out "predictive" language from every reading and replaced it with reflection prompts
>   — The technical weirdness of computing Human Design properly (88°-solar-arc calc, 64 I-Ching gates, etc.) vs. most apps faking it
>
> Press kit for logos / bio: https://tarotlife.app/press
>
> — [YOUR NAME]

### Template C — "Best tarot apps" listicle writers
Subject: **New contender for your "best tarot apps 2026" roundup**

> Hi [NAME],
>
> If you're planning an updated "best tarot apps" piece this year, I'd love to put Arcana (tarotlife.app) in your review pile.
>
> What makes it different from Co-Star / The Pattern / Labyrinthos:
>   1. Real ephemeris — every chart is computed, not pre-written
>   2. 13 divination systems (tarot, astrology, Bazi, I-Ching, Human Design, runes, dice, dream work, mood, etc.)
>   3. AI dream interpreter running a Jungian prompt
>   4. Native in 4 languages (English, Japanese, Korean, Chinese) at launch
>
> Screenshots + fact sheet: https://tarotlife.app/press
>
> Happy to issue a free Premium code so you can evaluate without the paywall. Thanks for considering.
>
> — [YOUR NAME]

### Targets to pitch (30 min of research, then send)

Search Google for recent articles from these publications and find the
author. DM via Twitter or find their email in the byline. Do NOT mass-email
a generic list — one researched pitch is worth 20 spray pitches.

- Well+Good (wellness lifestyle)
- Bustle (millennial culture)
- Refinery29 (astrology vertical)
- Vox (wellness tech criticism)
- The Cut / NY Magazine (culture)
- Allure (tarot/astro angle)
- Mind Body Green (wellness)
- Cosmopolitan (astrology)
- Tarot.com (community)
- Chani Nicholas newsletter (if she takes pitches)
- The Tarot Lady (Theresa Reed)
- Little Red Tarot (Beth Maiden)

---

## Priority 5 — Schema.org `sameAs` enforcement

Once you've claimed the profiles above, the `src/utils/seo.ts` `sameAs` array
becomes live — Google + LLMs resolve the brand entity. I've already added
placeholder URLs; swap them in.

---

## Priority 6 — Internal linking (already strong, small additions)

The app is well-interlinked via the sitemap. Small additions to strengthen:

- [ ] Add a footer on `/blog` that links to `/press`, `/privacy-policy.html`, `/reading`, and the Play Store
- [ ] Add a "Tarot meanings" card near the top of `/blog` so blog readers flow into the 78 card-meaning pages (each of which already has its own Article + DefinedTerm schema)
- [ ] On each tarot card page, add links to 3 related cards ("related cards") — already has breadcrumbs, missing related links

---

## Measurement

After 30 days, check:

1. **Google Search Console** — new URLs (feature routes + press) should be discovered + indexed
2. **Ahrefs/Semrush** — backlink count and referring domains
3. **Branded search volume** — "arcana tarot" / "tarotlife" queries
4. **AI citation queries** — ask ChatGPT / Perplexity / Gemini: "what are the best tarot apps that use real astronomy?" — Arcana should be in the answer within a few months of `llms.txt` being live

---

## What this packet does NOT cover (by design)

- **Paid backlinks / PBN networks** — these get you a Google penalty. Don't.
- **Automated comment spam / forum posting** — same reason. Don't.
- **Bulk directory submission services** — 95% of them submit to low-quality sites that hurt more than help. The 10 directories above are hand-picked for DA + actual relevance.
- **Guest post exchanges with irrelevant sites** — if the site doesn't care about tarot/astrology/wellness, the link is worth less than nothing.

The slow way (content + real relationships) is the only way that actually
works. This playbook is 3–6 months of work if you're consistent. That's
also the realistic timeline for seeing rank movement regardless.
