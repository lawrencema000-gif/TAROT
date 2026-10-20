// Bazi AI interpretation client.
//
// Pulls the structured chart data from the local computation
// (src/data/bazi.ts + baziDeep.ts) and sends it to the bazi-interpret
// edge function which calls Gemini for the narrative reading.
//
// Premium-gated server-side. Cached per user per year, so a normal
// page-view is a single SELECT to the cache table — no Gemini cost.

import { supabase } from '../lib/supabase';
import { getLocale } from '../i18n/config';
import { logWarn } from '../utils/telemetry';
import type { BaziResult, BaziPhase1Deepening } from '../data/bazi';
import type { BaziDeepResult, Gender } from '../data/baziDeep';

export interface BaziAIReading {
  core_summary: string;
  personality: string;
  elements: string;
  career: string;
  wealth: string;
  relationships: string;
  family: string;
  hidden_stems: string;
  branch_relations: string;
  health: string;
  luck_pillar: string;
  annual: string;
  strategy: string;
  closing_summary: string;
}

export interface InterpretResponse {
  ok: boolean;
  reading?: BaziAIReading;
  cached?: boolean;
  /**
   * Why there is no reading, as a stable code: the function's envelope
   * `error.code` (PREMIUM_REQUIRED, RATE_LIMITED, AI_DISABLED, AI_DAILY_LIMIT,
   * AI_SOFT_CAP, AI_FAILED, …) or one of this client's own: NOT_SIGNED_IN,
   * NETWORK (no response), HTTP (a status with no envelope code),
   * BAD_RESPONSE (not JSON), EMPTY_READING (ok without a reading), NO_DETAIL
   * (ok: false without a code). The panel words the failure from this and the
   * status, never from English text (see readingFailure).
   */
  code?: string;
  /** The HTTP status when there was a response. */
  status?: number;
  /** English diagnostic for the log only; never shown to the reader. */
  detail?: string;
}

/** The failures the reading panel words differently (bazi.ai.errors.<failure>). */
export type BaziReadingFailure = 'signIn' | 'premium' | 'rateLimit' | 'dailyLimit' | 'unavailable' | 'generic';

/** Sort a failed response into the case the reader is told about, by its code and status. */
export function readingFailure(res: Pick<InterpretResponse, 'code' | 'status'>): BaziReadingFailure {
  const { code, status } = res;
  if (code === 'NOT_SIGNED_IN' || code === 'UNAUTHORIZED' || status === 401) return 'signIn';
  if (code === 'PREMIUM_REQUIRED' || status === 403) return 'premium';
  if (code === 'AI_DAILY_LIMIT' || code === 'AI_SOFT_CAP') return 'dailyLimit';
  if (code === 'RATE_LIMITED' || status === 429) return 'rateLimit';
  if (code === 'AI_DISABLED' || code === 'AI_NOT_CONFIGURED' || status === 503) return 'unavailable';
  return 'generic';
}

/** A failed response: the code and status the panel reads, and the English kept for the log. */
function failure(code: string, detail: string, status?: number): InterpretResponse {
  logWarn('bazi-interpret', detail, { code, status });
  return { ok: false, code, status, detail };
}

export async function generateBaziReading(args: {
  result: BaziResult;
  phase1: BaziPhase1Deepening;
  deep: BaziDeepResult | null;
  birthDate: string;
  birthTime: string | null;
  gender: Gender;
  force?: boolean;
}): Promise<InterpretResponse> {
  const { result, phase1, deep, birthDate, birthTime, gender, force } = args;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return failure('NOT_SIGNED_IN', 'Not signed in');

  const body = {
    birthDate,
    birthTime,
    gender,
    force: !!force,
    // The reading is written in the UI language; the server keys its
    // per-user cache on this too, so switching locale regenerates.
    locale: getLocale(),
    pillars: {
      year: { stem: result.year.stem, branch: result.year.branch },
      month: { stem: result.month.stem, branch: result.month.branch },
      day: { stem: result.day.stem, branch: result.day.branch },
      hour: { stem: result.hour.stem, branch: result.hour.branch },
    },
    dayMaster: `${result.dayMaster} (${result.dayMasterElement} / ${result.dayMasterPolarity})`,
    chartStrength: {
      rating: phase1.strength,
      explanation: `Day Master is ${phase1.strength}. Element balance — ${Object.entries(result.elementBalance).map(([el, n]) => `${el}: ${n}`).join(', ')}. Dominant: ${result.dominantElement}; weakest: ${result.weakElement}.`,
    },
    favorableElement: {
      // Translate the local single-element guidance into useful/risky lists.
      // The supporting element + Day Master's own element are useful;
      // controlling and dominant excess elements are risky.
      useful: [phase1.favorable.element, phase1.favorable.supporting],
      risky: [result.dominantElement].filter((e) => e !== phase1.favorable.element && e !== phase1.favorable.supporting),
      explanation: `Most useful element: ${phase1.favorable.element}. Supporting element: ${phase1.favorable.supporting}. Career hint: ${phase1.favorable.careerHint}.`,
    },
    hiddenStems: {
      year: phase1.hiddenStems.year,
      month: phase1.hiddenStems.month,
      day: phase1.hiddenStems.day,
      hour: phase1.hiddenStems.hour,
    },
    tenGods: {
      year: phase1.tenGods.year,
      month: phase1.tenGods.month,
      hour: phase1.tenGods.hour,
    },
    branchRelations: deep?.branchRelations?.map((br) => ({
      kind: br.type,
      branches: br.branches,
      meaning: br.meaning,
    })),
    climate: deep?.climate
      ? {
          reading: `Climate dominant: ${deep.climate.dominant} (cold ${deep.climate.cold}, hot ${deep.climate.hot}, wet ${deep.climate.wet}, dry ${deep.climate.dry}).`,
          advice: deep.climate.remedy,
        }
      : undefined,
    luckPillars: deep?.luckPillars?.map((lp) => ({
      ageStart: lp.startAge,
      ageEnd: lp.endAge,
      stem: lp.stem,
      branch: lp.branch,
      theme: lp.theme,
    })),
    currentLuckPillar: deep?.currentLuckPillar
      ? {
          ageStart: deep.currentLuckPillar.startAge,
          ageEnd: deep.currentLuckPillar.endAge,
          stem: deep.currentLuckPillar.stem,
          branch: deep.currentLuckPillar.branch,
        }
      : undefined,
    annualLuck: deep?.annualLuck
      ? { year: deep.annualLuck.year, stem: deep.annualLuck.stem, branch: deep.annualLuck.branch }
      : undefined,
  };

  const supabaseUrl = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SUPABASE_URL;
  const url = `${supabaseUrl}/functions/v1/bazi-interpret`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return failure('NETWORK', `No response: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (!res.ok) {
    // The handler's error envelope: { error: { code, message }, correlationId }.
    let code: string | null = null;
    let message = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: { code?: unknown; message?: unknown } };
      if (typeof j?.error?.code === 'string') code = j.error.code;
      if (typeof j?.error?.message === 'string' && j.error.message) message = j.error.message;
    } catch { /* not JSON: the status is all there is */ }
    return failure(code ?? 'HTTP', message, res.status);
  }

  // Unwrap the standard handler envelope. The bazi-interpret edge fn
  // returns `{ data: { ok, reading, cached }, correlationId }` per the
  // _shared/handler.ts contract — without unwrapping, `parsed.ok` is
  // `undefined`, the component sees a falsy ok, and shows the generic
  // "Failed to generate reading" error even though the request succeeded.
  // Reading was being silently discarded after a ~30-50s wait. Falls
  // back to the raw shape for any caller that returns the legacy flat
  // payload (none currently, but keeps this resilient to handler
  // refactors).
  type Payload = { ok?: boolean; reading?: BaziAIReading; cached?: boolean; error?: unknown; code?: unknown };
  let parsed: { data?: Payload; correlationId?: string } | Payload;
  try {
    parsed = await res.json();
  } catch (e) {
    return failure('BAD_RESPONSE', `Server returned a non-JSON response: ${e instanceof Error ? e.message : String(e)}`, res.status);
  }
  const unwrapped: Payload | undefined = (parsed && typeof parsed === 'object' && 'data' in parsed && parsed.data)
    ? parsed.data
    : (parsed as Payload);

  // Defensive: the edge function should always return either ok=true with
  // a reading object, or ok=false with an error. If neither holds, say why
  // instead of an empty panel. This guards against truncated edge function
  // responses (e.g. wall-clock timeout mid-write) that can leave the
  // response shape malformed.
  if (unwrapped?.ok && unwrapped.reading) {
    return { ok: true, reading: unwrapped.reading, cached: unwrapped.cached };
  }
  if (unwrapped?.ok) {
    return failure('EMPTY_READING', 'The AI returned successfully but the reading was empty (likely an edge-function timeout).', res.status);
  }
  const code = typeof unwrapped?.code === 'string' ? unwrapped.code : null;
  const detail = typeof unwrapped?.error === 'string' ? unwrapped.error : 'AI generation failed without a specific error.';
  return failure(code ?? 'NO_DETAIL', detail, res.status);
}
