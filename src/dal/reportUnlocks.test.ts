import { describe, it, expect, vi, beforeEach } from 'vitest';

/*
 * unlock_report_with_moonstones' refusals, as the report pages read them
 * (p9 Q01): a short balance, and a chart-based report asked for by a member
 * with no natal chart (refused before the debit, so nothing was taken).
 */

const rpc = vi.fn();
vi.mock('../lib/supabase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));
vi.mock('../utils/telemetry', () => ({ captureException: vi.fn() }));

import { unlockWithMoonstones } from './reportUnlocks';

describe('reportUnlocks.unlockWithMoonstones', () => {
  beforeEach(() => rpc.mockReset());

  it('passes the key, the reference and the price, and reads the new balance', async () => {
    rpc.mockResolvedValue({ data: [{ unlocked: true, new_balance: 200 }], error: null });
    await expect(unlockWithMoonstones('natal-chart-pdf', '1988-11-02', 200)).resolves.toEqual({ ok: true, data: { unlocked: true, newBalance: 200 } });
    expect(rpc).toHaveBeenCalledWith('unlock_report_with_moonstones', { p_report_key: 'natal-chart-pdf', p_reference: '1988-11-02', p_cost: 200 });
  });

  it('a short balance is insufficient-balance', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Insufficient Moonstones: balance 120, need 200' } });
    await expect(unlockWithMoonstones('natal-chart-pdf', '1988-11-02', 200)).resolves.toEqual({ ok: false, error: 'insufficient-balance' });
  });

  it('no natal chart on the server is chart-missing, not a connection error', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'natal chart required for natal-chart-pdf' } });
    await expect(unlockWithMoonstones('natal-chart-pdf', '1988-11-02', 200)).resolves.toEqual({ ok: false, error: 'chart-missing' });
  });

  it('anything else is passed through', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Price mismatch for natal-chart-pdf' } });
    await expect(unlockWithMoonstones('natal-chart-pdf', '1988-11-02', 200)).resolves.toEqual({ ok: false, error: 'Price mismatch for natal-chart-pdf' });
  });
});
