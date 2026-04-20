import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export interface QuizResultRow {
  id: string;
  user_id: string;
  quiz_type: string;
  quiz_id: string;
  result: string;
  scores: Record<string, unknown>;
  label?: string | null;
  completed_at: string;
  [key: string]: unknown;
}

export interface QuizResultInsert {
  userId: string;
  quizType: string;
  quizId: string;
  result: string;
  scores: Record<string, unknown>;
  label?: string | null;
}

export async function listForUser(userId: string): Promise<Result<QuizResultRow[]>> {
  const { data, error } = await supabase
    .from('quiz_results')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });
  if (error) {
    captureException('dal.quizResults.listForUser', error, { userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data as QuizResultRow[]) ?? [] };
}

export async function listAllForUser(userId: string): Promise<Result<QuizResultRow[]>> {
  const { data, error } = await supabase
    .from('quiz_results')
    .select('*')
    .eq('user_id', userId);
  if (error) {
    captureException('dal.quizResults.listAllForUser', error, { userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data as QuizResultRow[]) ?? [] };
}

export async function countForUser(userId: string): Promise<Result<number>> {
  const { count, error } = await supabase
    .from('quiz_results')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) {
    captureException('dal.quizResults.countForUser', error, { userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: count ?? 0 };
}

export async function insert(input: QuizResultInsert): Promise<Result<void>> {
  const { error } = await supabase.from('quiz_results').insert({
    user_id: input.userId,
    quiz_type: input.quizType,
    quiz_id: input.quizId,
    result: input.result,
    scores: input.scores,
    label: input.label ?? input.result,
  });
  if (error) {
    captureException('dal.quizResults.insert', error, { userId: input.userId, quizType: input.quizType });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}
