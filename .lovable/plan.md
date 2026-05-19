## Product Creator — Tool #6 Build Plan

A new live tool: AI-powered ebook + mind map creator using securely-embedded MindPal workflows, with monthly per-type usage limits and a "My Products" library.

### 1. Database (migration)
- `product_creator_configs` — stores MindPal embed URLs (service-role only, no public RLS). Seeded with the two workflow URLs.
- `user_products` — user-owned product records (in_progress / completed), with RLS.
- `product_creator_monthly_usage` — per-user, per-month ebook/mindmap counters.
- `edge_function_logs` — created if missing (service-role only).

### 2. Edge Functions
- `manage-product-creator` — actions: `get_config` (returns embed URL + usage), `start`, `complete` (increments counter), `delete`.
- `get-user-products` — returns user's products + this month's usage.

Both verify JWT in code; embed URLs are never exposed to frontend source. Registered in `supabase/config.toml` with `verify_jwt = false`.

### 3. New page `/product-creator`
- Route added in `AppRoutes.tsx`.
- Header with usage pills (📚 X/5, 🧠 X/5).
- Pill tab switcher: Ebook Creator / Mind Map Creator.
- **STATE 1**: details form (ebook = title/author/country, mindmap = topic/country), prefilled from `sessionStorage.pc_prefill`. Limit-reached warning card replaces CTA when applicable.
- **STATE 2**: workspace — fetches embed URL via Edge Function, renders iframe (700px min, no border-radius break), with right-click + devtools keyboard shortcut blocker scoped to this page only. "Mark as Complete" → confirm modal → complete action.
- **STATE 3**: success card with usage pill + "View My Products" / "Create Another".
- Glassmorphism, Sora, teal/cyan gradient — matches existing tool identity.

### 4. My Saved — new "My Products" tab
- Added as leftmost tab.
- Auto-selected when route is `/my-saved?tab=my-products` (or wherever My Saved lives).
- Usage summary bar + 2-column grid of product cards with type/status badges, source badge, inline delete confirm.
- Empty state CTA to `/product-creator`.

### 5. Product Navigator — "🛠 Build This Product" button
- Teal outline button on the idea detail view.
- Saves `{product_name, country, niche, source: 'product_navigator'}` to `sessionStorage.pc_prefill` and navigates to `/product-creator`.

### 6. Sidebar + Dashboard unlock
- Remove lock icon / Coming Soon / disabled handler from Product Creator entries in `src/pages/Index.tsx`.
- Wire to `navigate('/product-creator')`. Keep green→cyan gradient and active styling.

### Build order
1. DB migration (await approval)
2. Edge functions + config.toml
3. `/product-creator` page + route
4. My Saved tab
5. Product Navigator button
6. Sidebar/dashboard unlock

### Notes / scope guards
- No edits to existing tool logic beyond the Product Navigator CTA, sidebar/dashboard unlock, and adding a tab to My Saved.
- Embed URLs live only in DB; frontend never references them.
- Inspect-blocking active only on `/product-creator`.
- Deletion does not decrement monthly counters.
- I'll need to read several existing files (My Saved page, Product Navigator detail, sidebar/dashboard in `Index.tsx`, AppRoutes) before editing to match patterns and exact field names.
