// useMoonstoneSpend — single entry-point every AI reading page calls before
// invoking its edge function.
//
// Usage:
//   const { tryConsume, EarnSheet, balance } = useMoonstoneSpend('dream-interpret');
//   async function handleGenerate() {
//     const ok = await tryConsume();
//     if (!ok) return;            // hook already opened the earn sheet
//     // ...invoke edge function — the SERVER debits + refunds on failure
//   }
//   return <>... {EarnSheet}</>;
//
// IMPORTANT: tryConsume is now a READ-ONLY gate check. The actual debit (and
// refund-on-failure) is server-authoritative inside the AI edge function's
// handler — the client never holds the spend or refund capability, which is
// what closes the self-refund exploit. tryConsume only surfaces the earn
// sheet proactively when the user can't afford the action; the edge function
// also rejects with INSUFFICIENT_BALANCE/AI_SOFT_CAP if the balance changes
// between the check and the call.
//
// On premium users tryConsume() succeeds with no debit. Soft cap (50/24h)
// is enforced server-side; if hit, the sheet shows the soft-cap variant.

import { useCallback, useMemo, useState } from 'react';
import { getGateStatus, ACTION_COST } from '../dal/moonstoneSpend';
import { useT } from '../i18n/useT';
import { EarnMoonstonesSheet, type EarnSheetReason } from '../components/moonstones/EarnMoonstonesSheet';
// The gate-check failure is surfaced from here so every caller gets the same
// honest message; same pattern as services/levelSystem.ts.
// eslint-disable-next-line boundaries/element-types
import { toast } from '../components/ui';

interface UseMoonstoneSpendOptions {
  cost?: number;
}

export function useMoonstoneSpend(actionKey: string, opts: UseMoonstoneSpendOptions = {}) {
  const cost = opts.cost ?? ACTION_COST;
  const { t } = useT('app');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<EarnSheetReason>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<string | null>(null);
  /** Set when the gate itself could not be checked (RPC error); null otherwise. */
  const [error, setError] = useState<string | null>(null);

  const tryConsume = useCallback(async (): Promise<boolean> => {
    // Read-only gate check — does NOT debit. The edge function does the real
    // debit server-side. This just decides whether to proactively show the
    // earn sheet before the user spends a round-trip on a call that would be
    // rejected for insufficient balance.
    const res = await getGateStatus(actionKey, cost);
    if (!res.ok) {
      // The gate could not be checked. That is not a shortfall: never tell
      // the user they are out of Moonstones because an RPC failed (for
      // months a 42702 in action_gate_status read as "You need 50 Moonstones"
      // to every free user holding 100).
      const message = t('moonstones.gateCheckFailed', {
        defaultValue: 'Couldn’t check your balance — try again.',
      });
      setError(message);
      setBalance(null);
      setResetAt(null);
      toast(message, 'error');
      return false;
    }
    setError(null);
    if (res.data.allowed) {
      if (res.data.balance !== null) setBalance(res.data.balance);
      return true;
    }
    if (res.data.softCapReached) {
      setReason('soft-cap');
      setResetAt(res.data.resetAt);
      setBalance(null);
    } else {
      setReason('insufficient');
      setBalance(res.data.balance);
      setResetAt(null);
    }
    setOpen(true);
    return false;
  }, [actionKey, cost, t]);

  const refund = useCallback(async (): Promise<void> => {
    // No-op. Refunds are now server-authoritative: the AI edge function
    // refunds itself if the reading fails. Kept so existing call sites
    // (which call refund() on AI failure) keep compiling and behave as a
    // harmless no-op. Safe to delete from call sites over time.
  }, []);

  const closeSheet = useCallback(() => setOpen(false), []);

  const EarnSheet = useMemo(
    () => (
      <EarnMoonstonesSheet
        open={open}
        onClose={closeSheet}
        reason={reason}
        balance={balance}
        resetAt={resetAt}
        onBalanceChange={(newBalance) => {
          setBalance(newBalance);
          // If the user earned enough mid-sheet, auto-close so they can retry.
          if (newBalance >= cost) {
            setOpen(false);
          }
        }}
      />
    ),
    [open, closeSheet, reason, balance, resetAt, cost],
  );

  return { tryConsume, refund, EarnSheet, balance, error };
}
