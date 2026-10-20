import { describe, it, expect, vi, beforeEach } from 'vitest';

/*
 * The client half of the achievements contract (migration 20261003000018):
 * the server derives every badge from its own records and keeps only the
 * facts the device alone sees, each with the value it compares — so the
 * reporters must send that value (a bare card view is the old v1.2.0
 * report, counted only as one unnamed card), report each fact once, and
 * surface only what this call unlocked.
 */
const rpc = vi.fn();
vi.mock('../lib/supabase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import {
  ACHIEVEMENT_UNLOCKED_EVENT,
  checkAchievementProgress,
  checkSpecificCardAchievement,
  reportCardExplored,
  reportQuizTypeComplete,
  reportSpreadTypeUsed,
  reportZodiacSignViewed,
} from './achievements';

const reports = () =>
  rpc.mock.calls
    .filter(([fn]) => fn === 'check_achievement_progress')
    .map(([, args]) => [args.p_activity_type, args.p_value]);

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: [], error: null });
});

describe('the reporters send the value the server compares', () => {
  it('a card view carries the card id, once per card per session, and only ids 0-77', async () => {
    await reportCardExplored('u-views', 5);
    await reportCardExplored('u-views', 5);
    await reportCardExplored('u-views', 0);
    await reportCardExplored('u-views', 77);
    for (const bad of [-1, 78, 1.5, Number.NaN]) await reportCardExplored('u-views', bad);
    expect(reports()).toEqual([
      ['cards_explored', '5'],
      ['cards_explored', '0'],
      ['cards_explored', '77'],
    ]);
  });

  it('a drawn card carries its canonical name; no name, no report', async () => {
    await checkSpecificCardAchievement('u', 'The Fool');
    await checkSpecificCardAchievement('u', '');
    expect(reports()).toEqual([['specific_card_drawn', 'The Fool']]);
  });

  it('spread, quiz and sign reports carry their id, and only the ids a badge lists', async () => {
    await reportSpreadTypeUsed('u', 'celtic-cross');
    await reportSpreadTypeUsed('u', 'horseshoe');
    await reportQuizTypeComplete('u', 'big-five');
    await reportQuizTypeComplete('u', 'love-tree');
    await reportZodiacSignViewed('u', ' Scorpio ');
    await reportZodiacSignViewed('u', 'ophiuchus');
    expect(reports()).toEqual([
      ['spread_types_used', 'celtic-cross'],
      ['quiz_types_complete', 'big-five'],
      ['zodiac_signs_viewed', 'scorpio'],
    ]);
  });

  it('a bare report sends p_value null (the server reads its own records)', async () => {
    await checkAchievementProgress('u', 'celtic_cross_complete');
    expect(rpc).toHaveBeenCalledWith('check_achievement_progress', {
      p_user_id: 'u',
      p_activity_type: 'celtic_cross_complete',
      p_increment: 1,
      p_value: null,
    });
  });
});

describe('what a call unlocked', () => {
  it('returns only the badges this call unlocked and announces them', async () => {
    const heard = vi.fn();
    window.addEventListener(ACHIEVEMENT_UNLOCKED_EVENT, heard);
    rpc.mockResolvedValueOnce({
      data: [
        { achievement_id: 'a1', achievement_name: 'Tower Moment', xp_reward: 75, rarity: 'rare', newly_unlocked: true },
        { achievement_id: 'a2', achievement_name: 'Lucky Seven', xp_reward: 200, rarity: 'epic', newly_unlocked: false },
      ],
      error: null,
    });
    const got = await checkAchievementProgress('u', 'specific_card_drawn', 1, 'The Tower');
    expect(got.map((a) => a.achievement_name)).toEqual(['Tower Moment']);
    expect(heard).toHaveBeenCalledTimes(1);

    // Nothing new (a repeat changes nothing on the server): no announcement.
    await checkAchievementProgress('u', 'specific_card_drawn', 1, 'The Tower');
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener(ACHIEVEMENT_UNLOCKED_EVENT, heard);
  });

  it('an RPC error is no unlock', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await checkAchievementProgress('u', 'reading_complete')).toEqual([]);
    spy.mockRestore();
  });
});
