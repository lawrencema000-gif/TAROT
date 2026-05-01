// Bazi AI interpretation client.
//
// Pulls the structured chart data from the local computation
// (src/data/bazi.ts + baziDeep.ts) and sends it to the bazi-interpret
// edge function which calls Gemini for the narrative reading.
//
// Premium-gated server-side. Cached per user per year, so a normal
// page-view is a single SELECT to the cache table — no Gemini cost.

import { supabase } from '../lib/supabase';
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
  error?: string;
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
  if (!token) return { ok: false, error: 'Not signed in' };

  const body = {
    birthDate,
    birthTime,
    gender,
    force: !!force,
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
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      message = j?.error?.message || message;
    } catch { /* */ }
    return { ok: false, error: message };
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
  const parsed = (await res.json()) as
    | { data?: InterpretResponse; correlationId?: string }
    | InterpretResponse;
  if (parsed && typeof parsed === 'object' && 'data' in parsed && parsed.data) {
    return parsed.data;
  }
  return parsed as InterpretResponse;
}
