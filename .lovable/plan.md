
The user wants three things:
1. Reset all users' credits to exactly 500 (one-time bulk operation)
2. Track the date of the last bulk reset and show it in the admin portal
3. Add a view in the admin portal showing total credits across all users (system-wide aggregate) for tracking, with existing gift/deduct controls accessible

Let me check what already exists in the Credits admin tab to avoid duplication.

All capabilities exist:
- `add_user_credits` and `deduct_user_credits` RPCs already exist
- Gift flow exists via `gift-credits` Edge Function
- `global_settings` table can store the last reset date
- `AdminCreditsTab.tsx` exists per file listing — I'll extend it

Plan is straightforward and concise.
</plan>

<lov-plan>

## Plan: Bulk Credit Reset + System-Wide Credit Tracking

### What this does
1. **One-time bulk reset** — set every user's `user_credits.balance` to exactly 500 credits.
2. **Track the reset date** — store the timestamp + admin who did it in `global_settings`, display in Admin → Credits tab.
3. **System-wide credits dashboard** — new card in Admin → Credits showing total credits in circulation, average per user, top holders.
4. **Re-runnable reset button** — owner-only "Reset all balances to N" button so future resets (to any amount) can be done from the UI.

### Implementation

**A. Backend — new edge function `admin-bulk-reset-credits`**
- Owner-only (verifies `is_owner` via `admin_users`).
- Input: `{ targetBalance: number, reason?: string }` (defaults to 500).
- For each user in `user_credits`:
  - Compute delta = `targetBalance - current_balance`.
  - Insert a `credit_transactions` row of type `admin_reset` recording the adjustment + `balance_after`.
  - Update `user_credits.balance` to `targetBalance` (timestamps updated).
- Writes to `global_settings`:
  - `last_bulk_credit_reset_at` = timestamp
  - `last_bulk_credit_reset_by` = admin email
  - `last_bulk_credit_reset_amount` = targetBalance
  - `last_bulk_credit_reset_users_affected` = count
- Logs into `admin_activity_log` (action_type: `bulk_credit_reset`).

**B. Database — add `admin_reset` to allowed transaction types**
- Quick migration: ensure `credit_transactions.type` allows the new value (it's free-text today, so no constraint change needed — just document it).

**C. Frontend — extend `AdminCreditsTab.tsx`**
Add a new section at the top of the Credits tab called **"System-Wide Credits"**:

```text
┌─────────────────────────────────────────────────────────────┐
│ SYSTEM-WIDE CREDITS                                         │
│                                                             │
│  💰 Total in Circulation    👥 Active Holders   📊 Avg/User│
│       12,450 credits             47 users         265       │
│                                                             │
│  Last bulk reset: 17 Apr 2026 by abhinav@…                 │
│  Reset value: 500 credits · 47 users affected               │
│                                                             │
│  [ Reset All Balances → ]   ← owner only, opens confirm    │
└─────────────────────────────────────────────────────────────┘
```

- Aggregate query: `SELECT SUM(balance), COUNT(*), AVG(balance) FROM user_credits`.
- Reset metadata pulled from `global_settings`.
- "Reset All Balances" opens a confirm modal: input field (default 500) + reason + double-confirm ("Type RESET to continue").
- After success: toast + refresh aggregates + banner showing "Reset complete: N users → 500 credits".

The existing per-user **Gift** and **Deduct** controls in the Users sub-tab stay as they are — this plan only adds the system-wide layer on top.

### Files touched
- `supabase/functions/admin-bulk-reset-credits/index.ts` (new)
- `supabase/config.toml` (register function with `verify_jwt = false`)
- `src/components/AdminCreditsTab.tsx` (new System-Wide section + reset modal)

### Safety
- Owner-only (server-side check).
- Per-user `credit_transactions` row written for full audit trail (every user can see "Admin reset to 500" in their My Credits history).
- Logged to `admin_activity_log` so the action shows in Admin Activity.
- Confirmation requires typing "RESET" to prevent accidental clicks.

### What you'll see after approving
1. Click **Reset All Balances** in Admin → Credits.
2. Enter `500` + reason → type RESET → confirm.
3. Every user's balance becomes 500 (extras removed, deficits topped up).
4. The banner shows `Last bulk reset: 17 Apr 2026 by you · 500 credits · N users affected`.
5. The total-in-circulation card always shows live system credits going forward.

