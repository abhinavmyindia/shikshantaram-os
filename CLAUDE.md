# Shikshantaram OS: Project Instructions for Claude

Read this file fully before touching any code. It describes what the product is, how it is built, the rules every change must follow. Where this file and README.md disagree, this file and the code win. README.md is the original seed prompt (2 live tools, 6 locked, seeded RNG) and is stale.

Facts below were taken from the repo as read. Anything the repo cannot prove (live database state, Supabase dashboard settings, Lovable settings) is marked "unverified".

---

## 1. What this product is

Shikshantaram OS is a paid, invite/approval-based SaaS for Indian creators and coaches who want to build and sell digital products. It walks a user through a pipeline:

1. Niche Clarity: find or browse a niche.
2. Product Navigator: research and pick a product idea in that niche.
3. Offer Creation: turn the idea into a structured offer.
4. Funnel Builder: architecture, step copy, email sequence.
5. Copywriting Suite: sales copy with tone options and a score.
6. Product Creator: produce the actual product (non-fiction book, mind map) through embedded MindPal agents.
7. AskAbhinavAI: a Hindi-English mentor chatbot styled on the founder (Abhinav).

Plus: Knowledge Base (user uploads own documents so AI outputs reflect their expertise), My Saved, Profile, credits and top-ups, free trial, and a full Admin panel.

Two tools are marketed as "SOON" and locked: Landing Page Designer and AI Ads Suite.

Live app: https://shikshantaram-os.lovable.app. Intended production domain: os.shikshantaram.in (the `APP_URL` default in edge functions). Supabase project id: `cjgqtofxqhoubwnzyhlw`. Lovable project id: `e60b4515-0315-47e7-9680-161ad848c745`.

Audience and tone: Indian solo creators, often non-technical. Copy is warm, motivating, plain English with some Hindi-English mixing in the mentor chat. Currency is INR.

---

## 2. Stack and commands

- Vite 5, React 18, TypeScript (SWC), react-router-dom 6, TanStack Query.
- Supabase: Auth, Postgres with RLS, Storage, Realtime, Edge Functions (Deno).
- Built and synced through Lovable (`lovable-tagger`, `.lovable/` folder). Lovable edits commit to GitHub; GitHub pushes sync back to Lovable.
- UI: 49 shadcn/Radix files exist in `src/components/ui` and Tailwind is configured, but the real app pages use pure inline styles (see section 4).
- jsPDF is loaded through `window.jspdf` (not an npm import) for PDF export. `mammoth` extracts DOCX text in the browser.
- Tests: Vitest, with only a trivial example test. There is effectively no automated coverage. Do not claim something is tested.
- Fonts: Sora (headings), DM Sans (body).

Commands: `npm run dev` (port 8080), `npm run build`, `npm run lint`, `npm test`. Run lint and build after any frontend change. Edge functions and migrations are deployed through Lovable/Supabase, not by you.

Env for the frontend: `.env` holds only publishable Supabase values (URL and anon key). Never put a secret in a `VITE_` variable or in any frontend file.

---

## 3. Repo map

- `src/main.tsx`: intercepts `#...type=recovery` URL hashes before Supabase processes them. It stores the tokens in sessionStorage, strips the hash, and redirects to `/reset-password`.
- `src/App.tsx`, `src/AppRoutes.tsx`: providers and top-level routing.
- `src/hooks/`: `useAuth` (context), `useAdminRole`, `useIdleLogout`, `useCreditGate`, `useSaveItem`, `useTracking`.
- `src/utils/`: `creditGate.ts`, `sessionSecurity.ts`, `recentWork.ts`, `retryFetch.ts` (`invokeWithRetry`), `errorTracker.ts`, `activityTracker.ts`, `calculateResearchValue.ts`, `pdfExport.ts`, `documentExtract.ts`, `topupMessages.ts`.
- `src/config/topup.ts`: top-up packs and display credit costs.
- `src/data/niches.ts` (11 categories) and `src/data/products.ts` (11 product categories).
- `src/pages/`: `Index.tsx` (2860 lines, dashboard shell and Niche/Product pages and modals), `AIResearchEngine.tsx` (Product Navigator), `OfferCreation.tsx`, `FunnelBuilder.tsx`, `CopySuite.tsx`, `AskAbhinavAI.tsx`, `KnowledgeBasePage.tsx`, `MySavedPage.tsx`, `ProfilePage.tsx`, `ProductCreator.tsx`, `AdminPanel.tsx` (3408 lines) with `Admin*Tab.tsx` files, `LoginScreen.tsx`, `TrialPage.tsx`, `ResetPassword.tsx`, `RevokedScreen.tsx`, `SplashScreen.tsx`, `NotFound.tsx`.
- `src/components/`: `TopUpModal`, `CreditBalance`, trial banner/lock/expiry components, `IdleWarningModal`, `SecurityBlockPopup`, `ErrorBoundary`, `ChatHistorySidebar`, `ui/` (shadcn).
- `src/integrations/supabase/client.ts` and `types.ts`: generated. Never hand-edit `types.ts`.
- `supabase/config.toml`: per-function `verify_jwt` settings.
- `supabase/functions/`: 53 directories including `_shared/auth.ts`, `_shared/byok.ts`, `_shared/email-log.ts`.
- `supabase/migrations/`: 77 files, 2026-03-07 to 2026-07-02.
- `.lovable/plan.md` and `.lovable/memory/**`: Lovable-side notes (Product Creator build plan, profile field protection, signup approval workflow). Keep them consistent with code when you change those areas.

---

## 4. Design system rules

Keep the existing look. Do not introduce new visual languages.

- Pages are styled with inline `style` objects. Use the existing helper `const s = (x: CSSProperties) => x`. Do not use Tailwind classes or shadcn components in the tool pages. The `ui/` folder exists but the app does not rely on it.
- Page background: `linear-gradient(150deg,#f5f3ff 0%,#fdf4ff 20%,#fff7ed 45%,#f0fdf4 70%,#f0f9ff 100%)`.
- Cards: glassmorphism, `rgba(255,255,255,0.88)` with `backdropFilter: blur(16px)`, soft borders, generous radius.
- Palette: purple `#7c3aed` / `#a855f7` (primary), orange `#ea580c`, green `#059669`, pink `#ec4899`, cyan `#06b6d4`.
- Keyframes already defined: `fadeUp`, `fadeIn`, `popIn`, `slideRight`, `pulse`, `shimmer`, `spinSlow`, `float`, `glow`. Reuse them.
- Layout: 60px top navbar, 240px sidebar. Mobile must keep working; check narrow widths.
- Copy style: friendly, encouraging, short. No em dashes in user-facing copy. Use INR with the rupee sign.
- Do not add new fonts.

---

## 5. Routing and app state

Routing lives in `AppRoutes.tsx`, in this order:

1. While auth is loading, show `SplashScreen`.
2. Password-recovery safety net: if sessionStorage `supabase_recovery_flow` is `true` and the path is not `/reset-password`, force a redirect to `/reset-password`.
3. `/reset-password` and `/trial` are public and render before any auth check. Repeated slashes in the path are normalized.
4. No user: `LoginScreen` for every path.
5. `profile.access_tier === 'revoked'`: `RevokedScreen`.
6. Logged in: `/` Index, `/product-creator` ProductCreator, `/admin` AdminPanel only if `isAdmin` (otherwise Index), `*` NotFound.

Inside `Index.tsx` the tools are not URL routes. An internal `activePage` state (type `PageId`) switches between: `dashboard`, `niche`, `product`, `offer`, `funnel`, `copy_suite`, `settings`, `help`, `profile`, `saved`, `knowledge_base`, `ask_abhinav`. Product Creator is the exception: the sidebar navigates to `/product-creator`.

Cross-tool handoffs use callbacks or sessionStorage:
- Product Navigator "Build This Product" writes `pc_prefill` to sessionStorage and goes to `/product-creator`.
- Product Navigator `onBuildOffer` prefills Offer Creation; Offer Creation `onBuildFunnel` prefills Funnel Builder.

Idle logout: warning at 60 minutes, logout at 65 (`useIdleLogout`, calls `end-session`).

Global popups in Index: motivation popup (once per session, after 10 messages), usage value popup (after at least $0.25 of session AI cost), presence heartbeat every 60 seconds to `upsert-presence`.

Note on the usage popup: `getRetailValue` in `calculateResearchValue.ts` computes cost x 7000 with a floor of 2,500 rupees. This is a marketing figure, not a real cost. Do not present it as real money anywhere new, and do not extend it.

---

## 6. Auth, sessions, tiers and roles

### Auth
`useAuth` provides `user`, `session`, `profile`, `isAdmin`, `loading`, `signIn`, `signOut`, `refreshProfile`. It loads `user_profiles` and checks `admin_users` for `isAdmin`. `signIn` trims and lowercases the email. Profile loading uses `setTimeout(...,0)` inside `onAuthStateChange` to avoid Supabase client deadlocks. Keep that pattern. Never call supabase functions directly inside the auth listener body.

Recovery flow has four layers: `main.tsx` hash interception, `useAuth` handling of `PASSWORD_RECOVERY` and of a `SIGNED_IN` during recovery (sign out and redirect), the AppRoutes safety net, and the ResetPassword page. Do not weaken any layer.

### Session tracking
After sign-in, `initSession` calls the `log-session` edge function. It enforces concurrent-session limits, IP limits and blocked users. It fails open on a network error. The token is stored in localStorage `shikshantaram_session_token`. `signOut` and idle logout call `end-session`.

### Access tiers (`user_profiles.access_tier`)
`trial`, `basic`, `premium`, `beta`, `revoked`.

Frontend `TOOL_ACCESS`:
- niche, product, ask_abhinav: trial and above.
- offer, funnel, copy_suite, knowledge_base: basic, premium, beta. Locked for trial through the `LOCKED_FOR_TRIAL` modal.
- creator, copy, ads: premium and beta.

Trial fields on the profile: `is_trial`, `trial_started_at`, `trial_ends_at`, `trial_source_tier`, `trial_request_id`.

The frontend gate is cosmetic. Real enforcement must be in edge functions and RLS.

### Profile field protection
Trigger `trg_protect_sensitive_profile_fields` blocks non-admin changes to `access_tier`, `payment_status`, `payment_amount`, `credits_enforcement`, `is_beta_user`, `added_by`, `is_trial`, `trial_ends_at`, `trial_request_id`, `trial_source_tier`. It is bypassed when `auth.uid()` is NULL (service role) and for team members. If you add a new sensitive column to `user_profiles`, add it to this trigger in the same migration.

### Admin roles
`admin_users` holds admins. Roles: `owner`, `admin`, `manager`, `operator`. The UI uses `useAdminRole` with a `canDo` matrix. SQL helpers: `is_admin`, `is_owner`, `is_team_member`, `has_admin_role`, `get_my_admin_role`. Admin tabs: Overview, Users, Signups, Trials, Credits, AI Analytics, AskAbhinavAI, AI Settings (owner), Security, Email Delivery, Activity Log, Team Access.

Enforce admin roles on the server for every admin action.

---

## 7. Credits system

Credits meter AI usage per action.

Tables:
- `user_credits`: `balance`, `lifetime_*` counters.
- `credit_transactions`: ledger, with an `idempotency_key`.
- `credit_pricing`: `tool_module` + `call_type` to credits. Editable in Admin, Credits, through `update-credit-pricing`. Changes are logged to `price_change_log`.
- `global_settings.credits_enforcement_mode`: `shadow` or `enforced`.
- `user_profiles.credits_enforcement`: `shadow`, `enforced`, `exempt` (per-user override).

Shadow mode: deductions are recorded but nothing is ever blocked. This is the default. Do not assume credits actually stop users unless the mode is `enforced`.

RPCs (SECURITY DEFINER, EXECUTE revoked from `anon` and `authenticated`, service role only): `deduct_user_credits` (row lock with FOR UPDATE, idempotent), `add_user_credits`, `deduct_chat_credits`.

Starter credits: trigger `trg_starter_credits` gives 500 credits to paid tiers and 50 to trial. The trial approval flow documents 100 trial credits as policy, so reconcile before changing anything (unverified which value wins in the live database).

Client flow (`useCreditGate` and `creditGate.ts`):
1. `gateAction` calls `check-credits`.
2. Run the AI call.
3. `deductAfterSuccess` calls `deduct-credits` with a `crypto.randomUUID()` idempotency key.
4. If the server reports `byok: true`, the user is on their own key and no deduction happens.
5. Client utilities fail open by design ("never block due to our own bug").

Seeded pricing (tool_module / call_type, credits): generate_30_ideas 5, deep_research_report 15, idea_analysis 4, generate_more_ideas 3, niche generate_niches 8, offer structures 5, full offer 12, funnel architecture 8, step copy 6, email sequence 8, copy 8. `TOPUP_CONFIG.CREDIT_COST` in `src/config/topup.ts` is display-only and must match the DB.

AskAbhinavAI deducts 3 credits (text) or 6 (image) inside its own edge function via `deduct_chat_credits`.

Check that every call type used by the client has a matching `credit_pricing` row.

Rules for new credit-using features:
- Add a `credit_pricing` row through a migration.
- Use a stable `tool_module` and `call_type` string, identical in client and DB.
- Gate before, deduct after success, always with an idempotency key.
- Never call the RPCs from the browser; they are service-role only.

### Top-ups (Razorpay)
- `create-razorpay-order`: authenticated, resolves pack server-side. Packs: Rs 500 gives 500; Rs 1000 gives 1000+100; Rs 2000 gives 2000+400; Rs 5000 gives 5000+1500. Custom amount is 1 credit per rupee, currently min Rs 10 (a code comment says this is a testing minimum and should be raised, e.g. to 500) up to Rs 1,00,000.
- `verify-razorpay-payment`: a webhook. Verifies HMAC-SHA256 signature, fails closed, idempotent through `razorpay_orders.status`, calls `add_user_credits`, sends a Resend receipt.
- Realtime channels `credits-<uid>` and `low-balance-<uid>` are restricted by RLS on `realtime.messages`.
- Payment link for access purchase: https://rzp.io/rzp/osaccess. WhatsApp support: https://wa.me/918933966250.

---

## 8. AI routing and BYOK

Three routes exist. Know which one a function uses before editing it.

1. Platform gateway: Lovable AI Gateway `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY`. Models used: `google/gemini-2.5-flash`, `google/gemini-3-flash-preview`. AskAbhinavAI uses `google/gemini-3.6-flash` for chat and `google/gemini-3.1-flash-lite` for session titles, with SSE streaming.
2. Direct Anthropic with `ANTHROPIC_API_KEY`: `claude-sonnet-4-20250514` (find-my-niche fallback, `analyze-document-expertise`) and `claude-haiku-4-5-20251001` (`save-knowledge-doc` tagging and summary, health checks).
3. BYOK (`_shared/byok.ts`): users save their own Anthropic, OpenAI or Gemini key. Keys are AES-GCM encrypted with `BYOK_ENCRYPTION_KEY` (padded or truncated to 32 characters) in `user_byok_keys`, with `key_hint` holding the last 4 characters. Keys are validated on save. `resolveAIKey` reads `user_profiles.byok_preferred_provider`. If the BYOK call or its parse fails, the code falls back to the platform key. Usage is logged to `byok_usage_logs`.

`logUsage` writes `ai_usage_logs` with cost estimates from `MODEL_PRICING_MAP`. Those are estimates.

The Admin AI Settings tab writes `global_settings.default_claude_model`, but no function reads it. Models are hard-coded. Either wire it up or say plainly it is inert; never tell the owner it changes behavior.

Rules:
- Model IDs live in edge functions. Change them in one place per function and note it in the PR.
- Parse model JSON defensively (the code already does repair and retry on truncation in deep research). Keep that.
- Always log usage.

---

## 9. Tool deep dives

### Niche Clarity
- Browse tab: 594 niches from `src/data/niches.ts`, 11 categories (`health, dance, mental, relationships, money, career, business, ai, leadership, lifestyle, creativity`), each `NicheCategory { id, name, iconBg, iconColor, accent, countColor, niches[] }`.
- AI Niche Finder: edge function `find-my-niche` returns 5 niches with `nicheName, nicheCategory, tagline, whyYouFit, targetBuyer, coreProblem, marketDemand, competition, monetisationPotential, earningPotential, productIdea, firstStep, fitScore`. Three random personas (Priya, Vikram, Deepa) are offered as examples.
- Honesty caveat: the NicheModal and ProductModal in `Index.tsx` use a deterministic seeded RNG (`seedRng`, FNV-style hash) to produce growth, competition, market size and persona numbers. These are synthetic, not market data. The UI markets "594 research-backed niches". Do not add new claims of measured data on top of this. If asked to make them "real", say it needs a real data source.

### Product Navigator (`AIResearchEngine.tsx`, function `ai-product-research`)
Actions: `generate-ideas`, `analyze-idea`, `generate-ideas-from-raw`, `generate-more`, `generate-ideas-v2` (categories A Urgent Relief, B Skill and Growth, C Transformation), `generate-more-category`, `deep-research` (30000 max tokens, retry on truncation, JSON repair, fallback report). Can use the user's Knowledge Base through `analyze-document-expertise`.

Caveat: the deep-research prompt asks for "real demand data" and "real competitor examples and pricing" with no web search attached. Output can be hallucinated. Do not present it as verified research. If you improve it, add a real search source rather than stronger wording.

### Offer Creation (`offer-creation`)
Actions `generate-structures` and `build-offer`. Hormozi-style persona. Steps: brief, structures, builder, output.

### Funnel Builder (`funnel-builder`)
Actions `generate-funnel`, `generate-step-copy`, `generate-emails`.

### Copywriting Suite (`generate-copy`)
Tones: professional, conversational, bold, empathetic. Returns copy plus a score object.

### AskAbhinavAI (`ask-abhinav-ai`)
SSE streaming, Hindi-English mentor persona, optional image input (Storage bucket `chat-images`), last 20 messages as history. Tables `chat_sessions` and `chat_messages`. localStorage `askabhinav_session_id`. Helper functions `get-chat-sessions`, `get-chat-messages`. Deducts 3 or 6 credits itself. Admin view: `AdminAskAbhinavTab` with `admin-askabhinav-stats`. Keep the persona voice; do not make it claim to be the real person in a way that misleads users about who they are talking to.

### Knowledge Base (`KnowledgeBasePage.tsx`)
Upload PDF, DOCX or TXT, max 5 MB, min 500 bytes (`documentExtract.ts`). PDF is sent as base64. DOCX and TXT are extracted in the browser and the extracted text is base64-encoded. Function `save-knowledge-doc` (body: `userId, filename, fileType, fileBase64, extractedText, fileSizeBytes`) stores to Storage bucket `knowledge-documents`, tags and summarizes with Haiku, and inserts `user_knowledge_docs`. Delete through `delete-knowledge-doc` (`userId, docId`). Active toggle is a direct update on `user_knowledge_docs`. Note that these functions currently trust `body.userId` (see risks).

### My Saved
`saved_items` via `useSaveItem`. "My Products" tab reads through `get-user-products`.

### Profile
Tabs: profile, activity, security, credits, settings, apikeys. Avatar colors, BYOK key management (`save-byok-key`, `delete-byok-key`, `get-byok-status`, `update-byok-preference`), deletion requests (`deletion_requests`).

### Product Creator (`/product-creator`, `ProductCreator.tsx`)
- Embeds MindPal agents in an iframe. Embed URLs exist only in `product_creator_configs` (DB) and must never be shipped in frontend code or logs.
- Live types: `nonfiction_book`, `mindmap`. Coming soon: `fiction_book`, `course`, `checklist`, `colouring_book`.
- Limit: 5 per type per month, tracked in `product_creator_monthly_usage`. Deleting a product does not decrement the counter (intentional, see `.lovable/plan.md`).
- Function `manage-product-creator` actions: `get_config`, `start`, `complete`, `delete`. Products in `user_products`.
- Inspect-blocking (devtools deterrent) applies on this page only.

### Persistence helpers
- `autoSaveWork` / `loadRecentWork` (`recent_work`): one row per user + tool + call_type, 7-day expiry, cleanup through `cleanup-recent-work` and `delete_expired_recent_work`.
- `invokeWithRetry`: retries only network-level failures, 3 retries, exponential backoff starting at 2s. It does not retry HTTP error responses.
- `errorTracker.ts`: global error capture, dedup, fingerprint, sends to `log-error`, stored in `error_logs` (rate-limited by `trg_error_log_rate_limit`).
- `activityTracker.ts`: sends to `track-activity`. `useTracking`: `user_sessions`, `tool_usage`, RPC `increment_tool_actions`.
- PDF export: `pdfExport.ts`, A4 layout constants and a fixed palette.

---

## 10. Signup, trial and payments flows

### Paid signup
`LoginScreen` SignupForm inserts into `signup_requests` with `payment_type`: `reserve` gives `basic`, `full` gives `premium`, `beta` gives `beta` (sets `is_beta_user`). An admin approves in the panel and `create-user-and-notify` creates the auth user (update, retry, then upsert pattern) and emails the tier-specific welcome. See `.lovable/memory/features/admin/signup-approval-workflow.md`.

### Free trial
Public `/trial` page: form, then 6-digit OTP (10 minute expiry), then success. Functions `submit-trial-request` and `verify-trial-otp`. Admin side: `get-trial-requests`, `approve-trial-user` (durations 2, 7, 14 or 30 days; creates the auth user; profile `access_tier='trial'`), `reject-trial-request`, `admin-upgrade-trial-user`, SQL `expire_trial_users()`, `create-test-trial-user`. `trial_requests.status`: pending, approved, rejected, expired, upgraded.

### Email
Resend, sent from `trial@` and `noreply@` on shikshantaram.in. Every send is logged to `email_delivery_log` via `_shared/email-log.ts`. Use that helper for any new email.

---

## 11. Database

About 39 tables. Main groups:
- Identity and access: `user_profiles`, `admin_users`, `team_invitations`, `user_security_settings`, `login_sessions`, `user_sessions`, `user_presence`, `security_events`, `deletion_requests`, `signup_requests`, `trial_requests`.
- Credits and money: `user_credits`, `credit_transactions`, `credit_pricing`, `price_change_log`, `razorpay_orders`.
- AI and content: `ai_usage_logs`, `byok_usage_logs`, `user_byok_keys`, `chat_sessions`, `chat_messages`, `recent_work`, `saved_items`, `user_knowledge_docs`, `user_products`, `product_creator_configs`, `product_creator_monthly_usage`.
- Ops: `activity_logs`, `admin_activity_log`, `edge_function_logs`, `email_delivery_log`, `error_logs`, `global_settings`, `tool_usage`, `beta_feedback`.

Functions: `add_user_credits`, `deduct_chat_credits`, `deduct_user_credits`, `delete_expired_recent_work`, `expire_trial_users`, `get_my_admin_role`, `get_signup_count`, `has_admin_role`, `increment_tool_actions`, `is_admin`, `is_owner`, `is_team_member`.

Triggers: `on_auth_user_created` (runs `handle_new_user`), `trg_starter_credits`, `trg_protect_sensitive_profile_fields`, `trg_error_log_rate_limit`, `trg_user_profiles_updated_at`, `trg_trial_requests_updated_at`.

Storage buckets: `chat-images`, `knowledge-documents`, both with owner-folder policies. `pg_cron` is enabled.

Migration rules:
- Every table has RLS on. A new table without policies is a bug.
- Users may read only their own rows. Writes that affect money, tier, or limits go through service-role edge functions.
- Migrations are additive and timestamped. Never edit an old migration. Never drop data without explicit user approval.
- The generated `types.ts` will lag; say so and do not hand-edit it.
- Ask the user before creating any migration. They run migrations through Lovable.

---

## 12. Edge functions and their auth

Most functions set `verify_jwt = false` in `config.toml` and must authenticate themselves. The listed set in config.toml is: send-welcome-email, send-upgrade-email, admin-create-user, offer-creation, funnel-builder, generate-copy, log-error, track-activity, log-session, end-session, manage-team, resolve-error, send-password-reset, admin-reset-password, upsert-presence, check-credits, deduct-credits, create-razorpay-order, verify-razorpay-payment, gift-credits, save-byok-key, delete-byok-key, get-byok-status, update-byok-preference, update-credit-pricing, admin-bulk-reset-credits, submit-trial-request, verify-trial-otp, approve-trial-user, get-trial-requests, manage-product-creator, get-user-products, ask-abhinav-ai, get-chat-sessions, get-chat-messages.

### The standard pattern (copy this for every new function)
`_shared/auth.ts` exports `verifyCaller(req)`, which uses `getClaims` (signature-verified) plus an `admin_users` lookup and returns `{ userId, email, isAdmin, adminRole, isOwner }`, plus `unauthorized` and `forbidden` response helpers. Use it, derive the user id from the verified token only, and check `isOwner` or `adminRole` when the action needs it.

Reference implementations to copy: `check-credits`, `deduct-credits`, `create-razorpay-order`, `save-byok-key`, `verify-razorpay-payment`, `approve-trial-user`, `get-trial-requests`.

### Secrets and env (Deno)
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `LOVABLE_API_KEY`, `APP_URL`, `ANTHROPIC_API_KEY`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_KEY_ID`, `OWNER_ALERT_EMAIL`, `BYOK_ENCRYPTION_KEY`. Never print or log them. Never add new secrets to code.

---

## 13. Security and quality backlog

The security and quality backlog is tracked privately by the owner and is deliberately not kept in this public repository. Ask the owner for it before changing authentication, credits, payments or admin functions. Follow the rules in section 14 for all new work.

## 14. Rules for Claude working on this repo

Always:
- Read the file and its neighbors before editing. `Index.tsx`, `AdminPanel.tsx`, `AIResearchEngine.tsx` and `ProfilePage.tsx` are very large. Read only the relevant region, and make small, surgical edits.
- Preserve the design system (section 4) and inline-style convention.
- Put trust decisions on the server. The client may hide a button; the function must still refuse.
- Authenticate every new edge function with `verifyCaller`. Take the user id from the token, never from the body. Enforce admin role per action.
- Keep money and credit logic server-side, idempotent, and logged.
- Use service-role only in edge functions, never in the browser.
- Handle AI failure paths: truncated JSON, empty output, rate limits (429), payment-required (402) from the gateway. Show the user a friendly message, and do not deduct credits for failed calls.
- Log usage (`ai_usage_logs`) for every AI call and emails to `email_delivery_log`.
- When a change needs a migration, a new secret, a Supabase dashboard setting, or a config.toml change, say so explicitly in your reply. The user applies those through Lovable or Supabase.
- When unsure whether live behavior matches the repo, say "unverified" and name how to check.

Never:
- Put the Product Creator embed URLs, API keys, or any secret in frontend code or logs.
- Trust `body.userId`, `body.adminId`, or an unverified JWT payload.
- Loosen RLS, grant EXECUTE on the credit RPCs to `anon` or `authenticated`, or remove the profile-field protection trigger.
- Edit `types.ts`, `client.ts`, or old migrations by hand.
- Claim data is real, research-backed, or verified when it comes from a model or a seeded RNG.
- Add dependencies without a reason, or switch the page styling to Tailwind or shadcn.
- Remove the fail-open behavior on client credit and session utilities without a deliberate decision from the user. It exists so that platform bugs never lock paying users out.
- Push, deploy or run destructive commands unless the user asks.

Style for your replies on this project: short, plain, no filler. State what changed, which files, and anything the user must do in Lovable or Supabase. Do not use em dashes or heavy formatting unless the user asks.

---

## 15. Checklists

### Add a new AI tool
1. Decide access tier and add to `TOOL_ACCESS`, `NAV_ITEMS`, `TOOL_CARDS`, and `PageId` in `Index.tsx`.
2. Build the page in inline styles with existing animations.
3. Create the edge function with `verifyCaller`, BYOK resolution via `_shared/byok.ts`, `logUsage`, and defensive JSON parsing.
4. Add `credit_pricing` rows (migration, ask first). Wire `gateAction` and `deductAfterSuccess` with the same strings.
5. Persist with `autoSaveWork` and offer Save via `useSaveItem`.
6. Add tracking (`useTracking`) and the admin analytics labels if needed.
7. Update this file and `TOPUP_CONFIG` display costs.

### Add an edge function
1. Folder in `supabase/functions/<name>/index.ts` with CORS handling and `verifyCaller`.
2. Decide `verify_jwt` in `config.toml`. If `false`, in-function verification is mandatory.
3. Return typed errors with the right status; never leak internals or secrets.
4. Log to `edge_function_logs` or `error_logs` as similar functions do.
5. List it in section 12 here.

### Add a migration
1. Ask the user first.
2. New timestamped file; additive; RLS and policies in the same file.
3. Update the protect-profile trigger if adding sensitive profile columns.
4. Seed or update `credit_pricing` when adding billable actions.
5. Note that `types.ts` must be regenerated by Lovable.

### Before you say "done"
- Lint and build pass.
- No secret or embed URL in the frontend diff.
- New functions authenticated; admin actions role-checked.
- Credits: gate, deduct, idempotency, failure path (no deduction on error), BYOK skip.
- Mobile width checked.
- Risks from section 13 that the change touches are fixed or flagged.

---

## 16. Open questions for the owner

- Is `credits_enforcement_mode` currently `shadow` or `enforced` in production?
- Trial credits: 50 (trigger) or 100 (approval policy)?
- Should `default_claude_model` be wired into functions or removed from the admin UI?
- Is the Rs 10 custom top-up minimum meant to ship?
- Is there a plan to back niche and product research with real data sources?
