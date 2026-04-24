-- ============================================================================
-- RLS init-plan optimization - 2026-04-24
-- ============================================================================
-- Wraps bare auth.uid() calls inside USING / WITH CHECK clauses with
-- (SELECT auth.uid()) so Postgres plans the call ONCE as an init-plan
-- instead of re-evaluating per row. No semantic change; pure perf.
--
-- Targets 41 policies across 26 tables flagged by the Supabase performance
-- advisor as auth_rls_initplan. Auto-generated against the live policy
-- catalog on 2026-04-24.
--
-- Idempotent: DROP POLICY IF EXISTS then CREATE POLICY. Safe to re-run.
-- ============================================================================

DROP POLICY IF EXISTS advisor_avail_advisor_manage ON public.advisor_availability;
CREATE POLICY advisor_avail_advisor_manage ON public.advisor_availability
  FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM advisor_profiles p
  WHERE ((p.id = advisor_availability.advisor_id) AND (p.user_id = (SELECT auth.uid()))))));

DROP POLICY IF EXISTS advisor_cashouts_select_own ON public.advisor_cashouts;
CREATE POLICY advisor_cashouts_select_own ON public.advisor_cashouts
  FOR SELECT TO public
  USING ((((SELECT auth.uid()) = user_id) OR is_admin()));

DROP POLICY IF EXISTS advisor_interest_select_own ON public.advisor_interest;
CREATE POLICY advisor_interest_select_own ON public.advisor_interest
  FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS advisor_payout_accounts_select_own ON public.advisor_payout_accounts;
CREATE POLICY advisor_payout_accounts_select_own ON public.advisor_payout_accounts
  FOR SELECT TO public
  USING ((((SELECT auth.uid()) = user_id) OR is_admin()));

DROP POLICY IF EXISTS advisor_sessions_rate ON public.advisor_sessions;
CREATE POLICY advisor_sessions_rate ON public.advisor_sessions
  FOR UPDATE TO public
  USING (((SELECT auth.uid()) = client_user_id))
  WITH CHECK (((SELECT auth.uid()) = client_user_id));

DROP POLICY IF EXISTS advisor_sessions_select_participant ON public.advisor_sessions;
CREATE POLICY advisor_sessions_select_participant ON public.advisor_sessions
  FOR SELECT TO public
  USING ((((SELECT auth.uid()) = client_user_id) OR (EXISTS ( SELECT 1
   FROM advisor_profiles p
  WHERE ((p.id = advisor_sessions.advisor_id) AND (p.user_id = (SELECT auth.uid()))))) OR is_admin()));

DROP POLICY IF EXISTS advisor_verifications_select_own ON public.advisor_verifications;
CREATE POLICY advisor_verifications_select_own ON public.advisor_verifications
  FOR SELECT TO public
  USING ((((SELECT auth.uid()) = user_id) OR is_admin()));

DROP POLICY IF EXISTS advisor_verifications_update_own_pending ON public.advisor_verifications;
CREATE POLICY advisor_verifications_update_own_pending ON public.advisor_verifications
  FOR UPDATE TO public
  USING ((((SELECT auth.uid()) = user_id) AND (status = 'pending'::text)));

DROP POLICY IF EXISTS affiliate_apps_select_own ON public.affiliate_applications;
CREATE POLICY affiliate_apps_select_own ON public.affiliate_applications
  FOR SELECT TO public
  USING ((((SELECT auth.uid()) = user_id) OR is_admin()));

DROP POLICY IF EXISTS affiliate_earnings_select_own ON public.affiliate_earnings;
CREATE POLICY affiliate_earnings_select_own ON public.affiliate_earnings
  FOR SELECT TO public
  USING ((((SELECT auth.uid()) = referrer_id) OR is_admin()));

DROP POLICY IF EXISTS ai_memories_select_own ON public.ai_conversation_memories;
CREATE POLICY ai_memories_select_own ON public.ai_conversation_memories
  FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS ai_turns_select_own ON public.ai_conversation_turns;
CREATE POLICY ai_turns_select_own ON public.ai_conversation_turns
  FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view own ai usage" ON public.ai_usage_ledger_2026_04;
CREATE POLICY "Users can view own ai usage" ON public.ai_usage_ledger_2026_04
  FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view own ai usage" ON public.ai_usage_ledger_2026_05;
CREATE POLICY "Users can view own ai usage" ON public.ai_usage_ledger_2026_05
  FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can read own horoscope cache" ON public.astrology_horoscope_cache;
CREATE POLICY "Users can read own horoscope cache" ON public.astrology_horoscope_cache
  FOR SELECT TO authenticated
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update own horoscope cache" ON public.astrology_horoscope_cache;
CREATE POLICY "Users can update own horoscope cache" ON public.astrology_horoscope_cache
  FOR UPDATE TO authenticated
  USING (((SELECT auth.uid()) = user_id))
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can read own natal chart" ON public.astrology_natal_charts;
CREATE POLICY "Users can read own natal chart" ON public.astrology_natal_charts
  FOR SELECT TO authenticated
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update own natal chart" ON public.astrology_natal_charts;
CREATE POLICY "Users can update own natal chart" ON public.astrology_natal_charts
  FOR UPDATE TO authenticated
  USING (((SELECT auth.uid()) = user_id))
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can delete own transit events" ON public.astrology_transit_events;
CREATE POLICY "Users can delete own transit events" ON public.astrology_transit_events
  FOR DELETE TO authenticated
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can read own transit events" ON public.astrology_transit_events;
CREATE POLICY "Users can read own transit events" ON public.astrology_transit_events
  FOR SELECT TO authenticated
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS community_blocks_delete_own ON public.community_blocks;
CREATE POLICY community_blocks_delete_own ON public.community_blocks
  FOR DELETE TO public
  USING (((SELECT auth.uid()) = blocker_id));

DROP POLICY IF EXISTS community_blocks_select_own ON public.community_blocks;
CREATE POLICY community_blocks_select_own ON public.community_blocks
  FOR SELECT TO public
  USING (((SELECT auth.uid()) = blocker_id));

DROP POLICY IF EXISTS community_comments_delete_own ON public.community_comments;
CREATE POLICY community_comments_delete_own ON public.community_comments
  FOR DELETE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS community_posts_delete_own ON public.community_posts;
CREATE POLICY community_posts_delete_own ON public.community_posts
  FOR DELETE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS community_posts_update_own ON public.community_posts;
CREATE POLICY community_posts_update_own ON public.community_posts
  FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS community_reactions_delete_own ON public.community_reactions;
CREATE POLICY community_reactions_delete_own ON public.community_reactions
  FOR DELETE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS community_reports_select_own ON public.community_reports;
CREATE POLICY community_reports_select_own ON public.community_reports
  FOR SELECT TO public
  USING (((SELECT auth.uid()) = reporter_id));

DROP POLICY IF EXISTS compat_invites_select_inviter ON public.compat_invites;
CREATE POLICY compat_invites_select_inviter ON public.compat_invites
  FOR SELECT TO authenticated
  USING ((inviter_user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS compat_responses_select_participant ON public.compat_responses;
CREATE POLICY compat_responses_select_participant ON public.compat_responses
  FOR SELECT TO authenticated
  USING ((((SELECT auth.uid()) = responder_id) OR (EXISTS ( SELECT 1
   FROM compat_invites i
  WHERE ((i.id = compat_responses.invite_id) AND (i.inviter_user_id = (SELECT auth.uid())))))));

DROP POLICY IF EXISTS replay_unlocks_select_own ON public.live_room_replay_unlocks;
CREATE POLICY replay_unlocks_select_own ON public.live_room_replay_unlocks
  FOR SELECT TO public
  USING ((((SELECT auth.uid()) = user_id) OR is_admin()));

DROP POLICY IF EXISTS live_room_rsvps_host_read ON public.live_room_rsvps;
CREATE POLICY live_room_rsvps_host_read ON public.live_room_rsvps
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM live_rooms r
  WHERE ((r.id = live_room_rsvps.room_id) AND (r.host_user_id = (SELECT auth.uid()))))));

DROP POLICY IF EXISTS live_room_rsvps_own ON public.live_room_rsvps;
CREATE POLICY live_room_rsvps_own ON public.live_room_rsvps
  FOR ALL TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS live_room_tips_participant ON public.live_room_tips;
CREATE POLICY live_room_tips_participant ON public.live_room_tips
  FOR SELECT TO public
  USING (((((SELECT auth.uid()) = tipper_user_id) OR ((SELECT auth.uid()) = host_user_id)) OR is_admin()));

DROP POLICY IF EXISTS live_rooms_host_manage ON public.live_rooms;
CREATE POLICY live_rooms_host_manage ON public.live_rooms
  FOR ALL TO public
  USING ((((SELECT auth.uid()) = host_user_id) OR is_admin()));

DROP POLICY IF EXISTS moonstone_daily_checkins_select_own ON public.moonstone_daily_checkins;
CREATE POLICY moonstone_daily_checkins_select_own ON public.moonstone_daily_checkins
  FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS moonstone_streak_milestones_select_own ON public.moonstone_streak_milestones;
CREATE POLICY moonstone_streak_milestones_select_own ON public.moonstone_streak_milestones
  FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS moonstone_transactions_select_own ON public.moonstone_transactions;
CREATE POLICY moonstone_transactions_select_own ON public.moonstone_transactions
  FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS referral_codes_select_own ON public.referral_codes;
CREATE POLICY referral_codes_select_own ON public.referral_codes
  FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS referral_redemptions_select_participant ON public.referral_redemptions;
CREATE POLICY referral_redemptions_select_participant ON public.referral_redemptions
  FOR SELECT TO public
  USING ((((SELECT auth.uid()) = referrer_id) OR ((SELECT auth.uid()) = invitee_id)));

DROP POLICY IF EXISTS report_unlocks_select_own ON public.report_unlocks;
CREATE POLICY report_unlocks_select_own ON public.report_unlocks
  FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS session_messages_participant_read ON public.session_messages;
CREATE POLICY session_messages_participant_read ON public.session_messages
  FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM (advisor_sessions s
     LEFT JOIN advisor_profiles p ON ((p.id = s.advisor_id)))
  WHERE ((s.id = session_messages.session_id) AND ((s.client_user_id = (SELECT auth.uid())) OR (p.user_id = (SELECT auth.uid())))))) OR is_admin()));

-- Done. Expected: auth_rls_initplan warnings drop from 55 to ~14.
