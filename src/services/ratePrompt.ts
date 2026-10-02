import { supabase } from '../lib/supabase';
import { getPlatform, isNative } from '../utils/platform';

/**
 * When to ask for a store rating (R6 A6).
 *
 * Only where a store page exists: the native Android build (Google Play).
 * The web app and any platform without a listing never see the prompt,
 * whatever the counters say. And only once the person has shown they use
 * the product: a seven-day ritual streak or ten positive actions, not
 * three quizzes on the first evening.
 */
const POSITIVE_ACTIONS_THRESHOLD = 10;
const STREAK_THRESHOLD_DAYS = 7;
const COOLDOWN_DAYS_LATER = 7;
const COOLDOWN_DAYS_FEEDBACK = 14;

export type RatePromptResponse = 'rated' | 'feedback' | 'later';

interface RatePromptState {
  rate_prompt_shown_at: string | null;
  rate_prompt_response: RatePromptResponse | null;
  rate_prompt_count: number;
  positive_actions_count: number;
  streak: number | null;
}

class RatePromptService {
  /** The prompt exists only where a store listing does. */
  canPrompt(): boolean {
    return isNative() && getPlatform() === 'android';
  }

  async getState(userId: string): Promise<RatePromptState | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('rate_prompt_shown_at, rate_prompt_response, rate_prompt_count, positive_actions_count, streak')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as RatePromptState;
  }

  async incrementPositiveActions(userId: string): Promise<number> {
    const state = await this.getState(userId);
    const newCount = (state?.positive_actions_count || 0) + 1;
    await supabase
      .from('profiles')
      .update({ positive_actions_count: newCount })
      .eq('id', userId);
    return newCount;
  }

  /** Pure so the gate can be tested without a database. */
  meetsThreshold(state: Pick<RatePromptState, 'positive_actions_count' | 'streak'>): boolean {
    return (state.positive_actions_count ?? 0) >= POSITIVE_ACTIONS_THRESHOLD || (state.streak ?? 0) >= STREAK_THRESHOLD_DAYS;
  }

  async shouldShowPrompt(userId: string): Promise<boolean> {
    if (!this.canPrompt()) return false;

    const state = await this.getState(userId);
    if (!state) return false;

    if (state.rate_prompt_response === 'rated') return false;
    if (!this.meetsThreshold(state)) return false;

    if (state.rate_prompt_shown_at) {
      const lastShown = new Date(state.rate_prompt_shown_at);
      const daysSinceShown = Math.floor((Date.now() - lastShown.getTime()) / (1000 * 60 * 60 * 24));

      if (state.rate_prompt_response === 'later' && daysSinceShown < COOLDOWN_DAYS_LATER) return false;
      if (state.rate_prompt_response === 'feedback' && daysSinceShown < COOLDOWN_DAYS_FEEDBACK) return false;
      if (!state.rate_prompt_response && daysSinceShown < COOLDOWN_DAYS_LATER) return false;
    }

    return true;
  }

  async recordPromptShown(userId: string): Promise<void> {
    const state = await this.getState(userId);
    const newCount = (state?.rate_prompt_count || 0) + 1;

    await supabase
      .from('profiles')
      .update({
        rate_prompt_shown_at: new Date().toISOString(),
        rate_prompt_count: newCount,
      })
      .eq('id', userId);
  }

  async recordResponse(userId: string, response: RatePromptResponse): Promise<void> {
    await supabase
      .from('profiles')
      .update({
        rate_prompt_response: response,
        rate_prompt_shown_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }

  getPlayStoreUrl(): string {
    return 'https://play.google.com/store/apps/details?id=com.arcana.app';
  }

  getFeedbackEmail(): string {
    return 'mailto:support@arcana.app?subject=Arcana%20App%20Feedback';
  }
}

export const ratePromptService = new RatePromptService();
