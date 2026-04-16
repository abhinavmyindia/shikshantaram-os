---
name: Signup Approval Workflow
description: Admin approval maps payment_type to default tier (full→premium, beta→beta, reserve→basic), emails reflect actual tier
type: feature
---
The Signup Approval workflow maps payment_type to default tier selection:
- `full` → `premium` (payment_status: paid)
- `beta` → `beta` (payment_status: beta, is_beta_user: true)
- `reserve` → `basic` (payment_status: reserved)

The `create-user-and-notify` edge function handles user creation with update-retry-upsert for profile assignment. Email templates dynamically reflect the assigned tier label and access description.
