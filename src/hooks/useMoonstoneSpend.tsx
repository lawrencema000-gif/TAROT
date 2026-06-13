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
import { EarnMoonstonesSheet, type EarnSheetReason } from '../components/moonstones/EarnMoonstonesSheet';

interface UseMoonstoneSpendOptions {
  cost?: number;
}

export function useMoonstoneSpend(actionKey: string, opts: UseMoonstoneSpendOptions = {}) {
  const cost = opts.cost ?? ACTION_COST;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<EarnSheetReason>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<string | null>(null);

  const tryConsume = useCallback(async (): Promise<boolean> => {
    // Read-only gate check — does NOT debit. The edge function does the real
    // debit server-side. This just decides whether to proactively show the
    // earn sheet before the user spends a round-trip on a call that would be
    // rejected for insufficient balance.
    const res = await getGateStatus(actionKey, cost);
    if (!res.ok) {
      setReason('insufficient');
      setBalance(null);
      setResetAt(null);
      setOpen(true);
      return false;
    }
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
  }, [actionKey, cost]);

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

  return { tryConsume, refund, EarnSheet, balance };
}
