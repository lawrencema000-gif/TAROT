import { supabase } from '../lib/supabase';

const POSITIVE_ACTIONS_THRESHOLD = 3;
const COOLDOWN_DAYS_LATER = 7;
const COOLDOWN_DAYS_FEEDBACK = 14;

export type RatePromptResponse = 'rated' | 'feedback' | 'later';

interface RatePromptState {
  rate_prompt_shown_at: string | null;
  rate_prompt_response: RatePromptResponse | null;
  rate_prompt_count: number;
  positive_actions_count: number;
}

class RatePromptService {
  async getState(userId: string): Promise<RatePromptState | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('rate_prompt_shown_at, rate_prompt_response, rate_prompt_count, positive_actions_count')
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

  async shouldShowPrompt(userId: string): Promise<boolean> {
    const state = await this.getState(userId);
    if (!state) return false;

    if (state.rate_prompt_response === 'rated') {
      return false;
    }

    if (state.positive_actions_count < POSITIVE_ACTIONS_THRESHOLD) {
      return false;
    }

    if (state.rate_prompt_shown_at) {
      const lastShown = new Date(state.rate_prompt_shown_at);
      const now = new Date();
      const daysSinceShown = Math.floor((now.getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24));

      if (state.rate_prompt_response === 'later' && daysSinceShown < COOLDOWN_DAYS_LATER) {
        return false;
      }

      if (state.rate_prompt_response === 'feedback' && daysSinceShown < COOLDOWN_DAYS_FEEDBACK) {
        return false;
      }

      if (!state.rate_prompt_response && daysSinceShown < COOLDOWN_DAYS_LATER) {
        return false;
      }
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
