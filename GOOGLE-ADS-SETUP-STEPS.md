# Google Ads Conversion Setup — manual steps

The code side is done — gtag fires these 4 events on the live site:

| Event | Fires when | Use as |
|---|---|---|
| `free_reading_drawn` | Visitor reveals a card in the hero demo | Primary conversion (days 1-7, fills fast) |
| `sign_up` | Email or Google signup succeeds | Primary conversion (after 30+ `free_reading_drawn`) |
| `onboarding_complete` | User finishes profile setup | Secondary — "fully activated" signal |
| `purchase` | Premium subscription confirmed | Eventual primary for value-based bidding (needs ~30 purchases of data first) |

These events need to be wired as **conversion actions** in Google Ads. This is all manual dashboard work — Google Ads doesn't expose a non-OAuth API path from CLI.

## Step 1 — Wait for events to flow into GA4 (24-48h)

Before doing anything in Google Ads, verify the events are showing up in GA4:

1. Go to **analytics.google.com** → pick the TarotLife property (the one labeled "AI Novel" unless you've renamed it per earlier note)
2. Left sidebar → **Reports → Realtime**
3. In another tab, visit `https://tarotlife.app/` → click "Draw Your Card" → pick a card
4. Within 30 seconds, you should see `free_reading_drawn` appear in the realtime event stream

If it doesn't appear, check:
- AdBlocker/privacy extension is off on the test browser
- Console shows no gtag errors
- `window.gtag` is a function when you inspect the page

## Step 2 — Mark GA4 events as conversions

In GA4:

1. Admin (bottom-left gear icon) → **Events**
2. For each of the 4 events above, toggle **Mark as conversion** to ON
3. GA4 will now start counting these as conversions

**New GA4 may call this "key events" instead of "conversions"** — same thing.

## Step 3 — Link GA4 to Google Ads

In Google Ads:

1. Tools → **Data manager** (or **Linked accounts** in older UI)
2. Click **Google Analytics (GA4) & Firebase**
3. Find the TarotLife property → click **Link**
4. Grant "auto-tagging" permission
5. Wait ~15 minutes for the link to propagate

## Step 4 — Import conversions from GA4

In Google Ads:

1. Tools → **Conversions**
2. Click **+ New conversion action**
3. Choose **Import** → **Google Analytics 4 properties** → **Web**
4. Select the 4 conversions: `free_reading_drawn`, `sign_up`, `onboarding_complete`, `purchase`
5. Click **Import and continue**

Each conversion appears in your Conversions table with status "No recent conversions" until data flows through.

## Step 5 — Set conversion goals per campaign

In Google Ads → Campaigns → your active web campaign → **Settings → Conversion goals**:

1. Click **Use different conversion goals for this campaign**
2. Select `free_reading_drawn` as the **Primary** goal for the first 7 days
3. Add `sign_up`, `onboarding_complete`, `purchase` as **Secondary** so you see the full funnel in reporting

After 7 days or ~30 `sign_up` conversions, swap primary to `sign_up`. After ~30 `purchase` conversions, swap to `purchase` and switch bid strategy to **Maximize Conversion Value** with your target ROAS.

## Step 6 — Verify the tag picks up your site traffic

In Google Ads → Tools → **Google Tag**:

1. Find the tag `G-6V3H9HV31V` (your shared Analytics + Ads tag)
2. Click **Tag coverage** → should list `tarotlife.app`
3. Click **Status** → should be green

If it's not green, click **Diagnose** and follow the fix — usually a missing consent banner or the tag being fired before consent.

## Step 7 — Set up Enhanced Conversions (recommended for `purchase`)

Enhanced Conversions sends hashed email/phone to Google alongside the conversion, which recovers ~15-30% of conversion signal lost to cookie blocking.

1. Google Ads → Conversions → click the `purchase` conversion
2. Turn on **Enhanced conversions for web**
3. Choose **Google Tag** as the method
4. Follow the prompt — no code changes needed (gtag auto-collects from form fields/dataLayer)

For `purchase`, our gtag event already sends `transaction_id`, `value`, and `currency` — Enhanced Conversions will pick these up automatically.

## Step 8 — Sanity check after 48h

Week 1 acceptance criteria:

- [ ] `free_reading_drawn` conversion count > 0 in Google Ads
- [ ] Each ad variant (v1-v5) shows separate rows in Supabase query:
  ```sql
  SELECT utm_campaign, COUNT(*)
  FROM profiles
  WHERE utm_source = 'google' AND created_at > now() - interval '7 days'
  GROUP BY utm_campaign;
  ```
- [ ] GA4 Realtime shows `free_reading_drawn` when you test the demo yourself
- [ ] At least one `sign_up` or `free_reading_cta_clicked` conversion has fired

If any of these are red, that's the debug target for session 2 — data plumbing, not creative.

---

## Quick reference — what goes where

| Need | Location |
|---|---|
| Ad copy (headlines, descriptions) | [GOOGLE-ADS-WEB-VARIANTS.md](GOOGLE-ADS-WEB-VARIANTS.md) |
| Images + video to upload | [ad-creatives/](ad-creatives/) |
| UTM attribution query | bottom of [GOOGLE-ADS-WEB-VARIANTS.md](GOOGLE-ADS-WEB-VARIANTS.md) |
| gtag event definitions | [src/services/analytics.ts](src/services/analytics.ts) |
| This doc — conversion plumbing | you're reading it |
