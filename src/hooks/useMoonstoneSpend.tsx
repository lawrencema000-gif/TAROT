// useMoonstoneSpend — single entry-point every AI reading page calls before
// invoking its edge function.
//
// Usage:
//   const { tryConsume, EarnSheet, balance } = useMoonstoneSpend('dream-interpret');
//   async function handleGenerate() {
//     const ok = await tryConsume();
//     if (!ok) return;            // hook already opened the earn sheet
//     // ...invoke edge function
//   }
//   return <>... {EarnSheet}</>;
//
// On premium users tryConsume() succeeds with no debit. Soft cap (50/24h)
// is enforced server-side; if hit, the sheet shows the soft-cap variant.

import { useCallback, useMemo, useRef, useState } from 'react';
import { spendForAction, refundAction, ACTION_COST } from '../dal/moonstoneSpend';
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
  const idemRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const tryConsume = useCallback(async (): Promise<boolean> => {
    // Concurrency guard — if a tryConsume is already in flight (rapid
    // double-tap, network-laggy click), reject the second call so we never
    // emit two simultaneous spend RPC calls. Each call generates a fresh
    // idempotency key, so without this guard a double-tap would slip past
    // the server idempotency check and double-debit the user.
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    try {
      // Fresh idempotency key per attempt. The page is expected to call
      // refund() on AI failure BEFORE retrying — otherwise the prior debit
      // is orphaned (idem key is overwritten on the next tryConsume).
      idemRef.current = `${actionKey}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const res = await spendForAction(actionKey, cost, idemRef.current);
      if (!res.ok) {
        setReason('insufficient');
        setBalance(null);
        setResetAt(null);
        setOpen(true);
        return false;
      }
      if (res.data.allowed) {
        if (res.data.newBalance !== null) setBalance(res.data.newBalance);
        return true;
      }
      if (res.data.softCapReached) {
        setReason('soft-cap');
        setResetAt(res.data.resetAt);
        setBalance(null);
      } else {
        setReason('insufficient');
        setBalance(res.data.newBalance);
        setResetAt(null);
      }
      setOpen(true);
      return false;
    } finally {
      inFlightRef.current = false;
    }
  }, [actionKey, cost]);

  const refund = useCallback(async (): Promise<void> => {
    // Called by pages when their AI invocation fails after a successful
    // spend. Restores Moonstones via the `refund_action_spend` RPC. The
    // idempotency key was generated in tryConsume; we still hold it in
    // the ref because the hook owns its lifecycle.
    const idem = idemRef.current;
    if (!idem) return;
    const res = await refundAction(idem);
    if (res.ok && res.data.refunded) {
      setBalance(res.data.newBalance);
    }
    idemRef.current = null;
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
