---
name: Profile Field Protection
description: Database trigger blocks user changes to access_tier; allows service role (NULL auth.uid()) and team members
type: feature
---
Security hardening: A 'BEFORE UPDATE' database trigger (trg_protect_sensitive_profile_fields) on the 'user_profiles' table prevents non-admin users from modifying sensitive fields (access_tier, payment_status, payment_amount, credits_enforcement, is_beta_user, added_by).

The trigger bypasses protection when:
- `auth.uid() IS NULL` — service role key (used by Edge Functions like `create-user-and-notify`)
- `is_team_member(auth.uid())` — admin team members

This ensures Edge Functions using the service role key can set access tiers during signup approval without being blocked.
