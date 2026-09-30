# Shikshantaram OS

Build me a complete **Shikshantaram OS Dashboard** — a premium, full-screen app dashboard that feels like a universe. When someone logs in, they land on this dashboard and see 8 powerful tools arranged beautifully. This is a one-stop suite to help creators launch AI-powered digital products in under 72 hours.

This is NOT a landing page. This is a POST-LOGIN DASHBOARD — a full app UI with a sidebar, a top nav bar, a main content area, and tool cards. It must feel like Notion meets Linear meets a premium SaaS product.

**Design DNA:** Inherit 100% of the design language from the existing Shikshantaram apps:
- Fonts: `Sora` (headings) + `DM Sans` (body/UI)
- Glassmorphism cards: `rgba(255,255,255,0.88)` background + `backdropFilter: blur(16px)`
- Page background: rich multi-stop gradient
- Pill badges, gradient text headings, subtle box-shadows
- Smooth animations: fadeUp, popIn, slideDown, pulse
- Color palette: purples (#7c3aed, #a855f7), oranges (#ea580c, #f97316), greens (#059669, #10b981), pinks (#ec4899), cyans (#06b6d4)

DO NOT use Tailwind. DO NOT use any UI library. Pure React + inline styles only.
Build the COMPLETE app in one shot. Do not ask questions.

---

## FONTS
```html
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
```

---

## GLOBAL CSS (inject via style tag in React)
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body { font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
input::placeholder { color: #94a3b8; }
button:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes popIn {
  from { opacity: 0; transform: scale(0.88) translateY(12px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes slideRight {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
@keyframes spinSlow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
}
@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.3); }
  50%       { box-shadow: 0 0 40px rgba(124,58,237,0.6); }
}
```

---

## APP LAYOUT ARCHITECTURE

The app is a **full-viewport layout** with 3 zones:

```
┌─────────────────────────────────────────────────────────┐
│                    TOP NAVBAR (60px)                     │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│   LEFT       │         MAIN CONTENT AREA               │
│  SIDEBAR     │         (scrollable)                     │
│  (240px)     │                                          │
│              │                                          │
│  (fixed,     │                                          │
│   full       │                                          │
│   height)    │                                          │
└──────────────┴──────────────────────────────────────────┘
```

- Root container: `display: flex; flex-direction: column; height: 100vh; overflow: hidden;`
- Body below navbar: `display: flex; flex: 1; overflow: hidden;`
- Sidebar: `width: 240px; flex-shrink: 0; height: 100%; overflow-y: auto;`
- Main content: `flex: 1; overflow-y: auto; padding: 32px 36px;`

Page background (applied to the full root):
```css
background: linear-gradient(150deg, #f5f3ff 0%, #fdf4ff 20%, #fff7ed 45%, #f0fdf4 70%, #f0f9ff 100%);
```

---

## ZONE 1 — TOP NAVBAR (height: 60px)

Position: relative (not sticky — it's in a fixed layout)
Background: `rgba(255,255,255,0.82)` with `backdropFilter: blur(24px) saturate(180%)`
Border-bottom: `1px solid rgba(255,255,255,0.9)`
Box-shadow: `0 1px 16px rgba(0,0,0,0.06)`
Padding: 0 24px
Layout: flex, align-items center, justify-content space-between, height 60px

**Left — Logo + Brand:**
Flex row, gap 10px, align-items center
- Logo SVG (32×32):
```svg
<svg width="32" height="32" viewBox="0 0 50 50" fill="none">
  <path d="M25 4C16 4 11 10 11 16c0 3.5 1.5 6 4.5 7.5L9 28c-3 1.5-4 4.5-2 6.5L12 33l2 4.5 5-5c1.5 1.5 3.5 2.5 6 2.5s4.5-1 6-2.5l5 5 2-4.5 4.5 1.5c2-2-.8-5-2.8-6.5l-6-9C36.5 22 38 19.5 38 16 38 10 34 4 25 4z" fill="#0f172a"/>
  <circle cx="21" cy="14" r="2" fill="white"/>
  <circle cx="29" cy="14" r="2" fill="white"/>
</svg>
```
- Brand name: "Shikshantaram OS" — Sora, font-weight 900, font-size 15px, color #0f172a, letter-spacing -0.03em
- Version badge: small pill next to brand — "v1.0 BETA" — font-size 9px, font-weight 700, background `linear-gradient(135deg,#7c3aed,#a855f7)`, color white, padding 2px 7px, border-radius 20px, letter-spacing 0.06em

**Center — Global search bar:**
Width: 320px, max-width 100%
Container: flex, align-items center, gap 8px, background #f8fafc, border-radius 10px, padding 7px 12px, border `1.5px solid #e2e8f0`
- Search icon SVG (14×14, stroke #94a3b8)
- Input: placeholder "Search tools, features..." — DM Sans, font-size 13px, color #0f172a, border none, background transparent, outline none, flex 1
- Keyboard shortcut badge: "⌘K" — font-size 10px, color #94a3b8, background #f1f5f9, border `1px solid #e2e8f0`, padding 1px 6px, border-radius 4px

**Right — User controls:**
Flex row, gap 12px, align-items center
- Notification bell icon (20×20, stroke #64748b) — position relative; has a 6px orange dot (top 0, right 0) for unread indicator
- Divider: 1×20px, background #e2e8f0
- User avatar pill (flex, gap 8px, align-items center, padding 4px 12px 4px 4px, background rgba(255,255,255,0.9), border `1px solid #e2e8f0`, border-radius 50px, cursor pointer):
  - Avatar circle: 30×30px, border-radius 50%, background `linear-gradient(135deg,#7c3aed,#ec4899)`, display flex, align-items center, justify-content center
  - Avatar initials: "SH" — Sora, font-weight 800, font-size 11px, color white
  - Name: "Shiksha" — DM Sans, font-weight 600, font-size 12.5px, color #0f172a
  - ChevronDown icon 12×12, color #94a3b8

---

## ZONE 2 — LEFT SIDEBAR (width: 240px)

Background: `rgba(255,255,255,0.65)` with `backdropFilter: blur(20px)`
Border-right: `1px solid rgba(255,255,255,0.85)`
Padding: 20px 12px
Box-shadow: `2px 0 16px rgba(0,0,0,0.04)`
Overflow-y: auto

### Sidebar Section 1 — "MY WORKSPACE" label
Font-size: 9px, font-weight: 800, color: #94a3b8, letter-spacing: 0.12em, UPPERCASE
Padding: 0 8px, margin-bottom: 6px

### Sidebar Navigation Items
Each nav item: flex row, gap 10px, align-items center, padding 9px 10px, border-radius 10px, cursor pointer, transition all 0.15s, margin-bottom 2px

**Active state:** background `linear-gradient(135deg,rgba(124,58,237,0.12),rgba(168,85,247,0.08))`, border `1px solid rgba(124,58,237,0.18)`, label color #7c3aed, font-weight 700
**Hover state:** background `rgba(0,0,0,0.04)`
**Inactive state:** background transparent, label color #475569, font-weight 500

Nav item structure:
- Icon box: 28×28px, border-radius 7px, background: active→`rgba(124,58,237,0.12)` / inactive→`#f8fafc`, display flex, align-items center, justify-content center, flex-shrink 0
- Label text: DM Sans, font-size 13px
- Right side: either nothing, a count badge, or a "SOON" badge

**8 navigation items in order:**

1. **Dashboard** (id: "dashboard")
   Icon: grid/home SVG, stroke #7c3aed when active / #64748b when inactive
   Label: "Dashboard"
   No badge
   
2. **Niche Clarity** (id: "niche") ← UNLOCKED ✅
   Icon: crosshair/target SVG
   Label: "Niche Clarity"
   Right badge: "LIVE" pill — background `#dcfce7`, color `#15803d`, font-size 8px, font-weight 800, padding 1px 6px, border-radius 20px
   
3. **Product Navigator** (id: "product") ← UNLOCKED ✅
   Icon: compass/navigate SVG
   Label: "Product Navigator"
   Right badge: "LIVE" pill — same green style
   
4. **Offer Creation** (id: "offer") ← LOCKED 🔒
   Icon: gift/package SVG, color #94a3b8
   Label: "Offer Creation" — color #94a3b8
   Right badge: "SOON" pill — background `#f1f5f9`, color `#94a3b8`, font-size 8px, font-weight 800, padding 1px 6px, border-radius 20px
   
5. **Funnel Builder** (id: "funnel") ← LOCKED 🔒
   Icon: funnel SVG, color #94a3b8
   Label: "Funnel Builder" — color #94a3b8
   Right badge: "SOON" pill
   
6. **Product Creator** (id: "creator") ← LOCKED 🔒
   Icon: wand/sparkle SVG, color #94a3b8
   Label: "Product Creator" — color #94a3b8
   Right badge: "SOON" pill
   
7. **Copy Suite** (id: "copy") ← LOCKED 🔒
   Icon: pen/edit SVG, color #94a3b8
   Label: "Copy Suite" — color #94a3b8
   Right badge: "SOON" pill
   
8. **AI Ad Suite** (id: "ads") ← LOCKED 🔒
   Icon: megaphone SVG, color #94a3b8
   Label: "AI Ad Suite" — color #94a3b8
   Right badge: "SOON" pill

### Sidebar Section 2 — Divider line (1px, #f1f5f9, margin 14px 0)

### Sidebar Section 3 — "ACCOUNT" label (same small label style)

Two items:
- **Settings** — gear icon, label "Settings", color #64748b
- **Help & Docs** — question circle icon, label "Help & Docs", color #64748b

### Sidebar Footer (pinned to bottom area, margin-top auto):
Progress card — background `linear-gradient(135deg,rgba(124,58,237,0.08),rgba(168,85,247,0.06))`, border `1px solid rgba(124,58,237,0.15)`, border-radius 12px, padding 12px

- Top: "🚀 72-Hour Launch" — DM Sans, font-weight 700, font-size 12px, color #7c3aed, margin-bottom 4px
- Subtitle: "2 of 8 tools unlocked" — font-size 10.5px, color #94a3b8, margin-bottom 8px
- Progress bar: full-width, height 5px, background #f1f5f9, border-radius 50px
  Filled portion: 25% width (2/8), background `linear-gradient(90deg,#7c3aed,#a855f7)`, border-radius 50px
- Bottom: "More tools dropping soon →" — font-size 9.5px, color #7c3aed, font-weight 600, margin-top 6px

---

## ZONE 3 — MAIN CONTENT AREA

This area renders different content based on `activePage` state.

### STATE MANAGEMENT
```javascript
const [activePage, setActivePage] = useState("dashboard");
```
When user clicks a LOCKED tool, do NOT navigate — instead show a toast notification (see Toast section).
When user clicks UNLOCKED tool (niche, product), set activePage to that id.
Dashboard is always accessible.

---

## PAGE: DASHBOARD (activePage === "dashboard")

This is the home screen users see first after login. It must feel like a mission control center.

### Dashboard Header
Animation: `fadeUp 0.4s ease`
Margin-bottom: 32px

- Greeting line: "Good morning, Shiksha 👋" — Sora, font-weight 800, font-size 28px, color #0f172a, letter-spacing -0.02em
- Subline: "Your digital product universe is ready. Let's build something legendary." — DM Sans, font-size 14.5px, color #64748b, margin-top 6px, line-height 1.6

### Stats Strip (4 cards in a row, gap 14px, margin-bottom 32px)
Animation: `fadeUp 0.4s ease 0.06s both`
Grid: `repeat(4, 1fr)`, gap 14px

Each stat card:
- Background: `rgba(255,255,255,0.88)`, backdropFilter `blur(16px)`, border-radius 16px, padding 18px 20px
- Border: `1px solid rgba(255,255,255,0.95)`, box-shadow `0 4px 20px rgba(0,0,0,0.05)`
- Top row: flex, space-between, align-items center
  - Label: font-size 11px, font-weight 700, color #94a3b8, letter-spacing 0.06em, UPPERCASE
  - Icon box: 32×32px, border-radius 8px, colored background, SVG icon inside
- Value: Sora, font-size 28px, font-weight 800, color #0f172a, margin-top 8px, letter-spacing -0.02em
- Change pill (bottom): font-size 10.5px, font-weight 700, flex, gap 3px, align-items center

4 stats:
1. **Tools Unlocked** — value: "2 / 8" — icon box background #ede9fe, icon color #7c3aed (grid icon) — change pill: `+2 live now` green
2. **Products Ideas** — value: "500+" — icon box background #fff7ed, icon color #ea580c (lightbulb icon) — change pill: `Explore →` orange
3. **Niches Mapped** — value: "594" — icon box background #dcfce7, icon color #059669 (target icon) — change pill: `Updated` green
4. **Time to Launch** — value: "72 hrs" — icon box background #fce7f3, icon color #be185d (clock/rocket icon) — change pill: `⚡ Fast track` pink

### Section: "Your Tool Suite" heading
```
"Your Tool Suite" — Sora, font-weight 800, font-size 18px, color #0f172a
+ "8 tools to take you from idea to income" — DM Sans, font-size 13px, color #94a3b8, margin-top 2px
```
Margin-bottom: 16px, animation: `fadeUp 0.4s ease 0.1s both`

### Tool Cards Grid (the CENTERPIECE of the dashboard)
Grid: `repeat(auto-fill, minmax(280px, 1fr))`, gap 16px
Animation: `fadeUp 0.4s ease 0.14s both`

**8 tool cards total.** Each card is unique in color. Clicking UNLOCKED tools navigates. Clicking LOCKED tools shows a toast.

#### CARD STRUCTURE — UNLOCKED tool:
Container: position relative, border-radius 20px, overflow hidden, cursor pointer, transition all 0.2s
Box-shadow: `0 4px 20px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.8)`
Hover: translateY(-4px), box-shadow `0 12px 40px {accent}25`

Top band (height: 120px, position relative, overflow hidden):
- Background: `linear-gradient(135deg, {color1}, {color2})`
- Large background icon (opacity 0.12, position absolute, right -10px, bottom -10px, width 90px, height 90px, the category SVG scaled up)
- Top-left: Status badge — "LIVE" (green) or "SOON" (gray)
- Bottom-left: Tool number — "01", "02" etc. — Sora, font-weight 900, font-size 32px, color `rgba(255,255,255,0.25)`, position absolute, bottom 12px, left 20px

Bottom content (padding: 18px 20px 20px):
- Background: `rgba(255,255,255,0.88)`, backdropFilter `blur(16px)`
- Tool name: Sora, font-weight 800, font-size 16px, color #0f172a, margin-bottom 4px
- Description: DM Sans, font-size 12.5px, color #64748b, line-height 1.6, margin-bottom 14px
- Bottom row: flex, space-between, align-items center
  - Tags: 1–2 small pill tags (topics this tool covers)
  - CTA button: "Open Tool →" — DM Sans, font-weight 700, font-size 12px, color {accent}, background `{accentLight}`, padding 5px 14px, border-radius 50px, border none, cursor pointer
    Hover: background {accent}, color white

#### CARD STRUCTURE — LOCKED tool:
Same structure but:
- Top band: `linear-gradient(135deg, #e2e8f0, #cbd5e1)` — greyed out
- Background icon: opacity 0.08
- Status badge: "COMING SOON"
- Overlay on top band: lock icon (24×24, white, opacity 0.5) centered
- Tool name: color #94a3b8
- Description: color #cbd5e1
- Bottom CTA: "🔒 Coming Soon" — background #f1f5f9, color #94a3b8, cursor not-allowed
- Hover: translateY(-2px) only (subtle, not the full lift)

**8 Tool Cards — exact specs:**

**Card 1: Niche Clarity** — UNLOCKED
- Number: "01"
- Top gradient: `linear-gradient(135deg, #7c3aed, #c026d3)`
- Tool name: "Niche Clarity"
- Description: "Discover 594+ profitable niches with market data, growth signals & ideal buyer personas."
- Tags: "594 Niches", "Market Data"
- Accent: #7c3aed, AccentLight: rgba(124,58,237,0.08)
- Big bg icon: target/crosshair SVG

**Card 2: Product Navigator** — UNLOCKED
- Number: "02"
- Top gradient: `linear-gradient(135deg, #ea580c, #f59e0b)`
- Tool name: "Product Navigator"
- Description: "500+ digital product ideas with launch timelines, price points & full ascension paths."
- Tags: "500+ Ideas", "Launch Fast"
- Accent: #ea580c, AccentLight: rgba(234,88,12,0.08)
- Big bg icon: compass SVG

**Card 3: Offer Creation** — LOCKED
- Number: "03"
- Tool name: "Offer Creation"
- Description: "Build irresistible offers with pricing psychology, bonuses & positioning frameworks."
- Tags: "Offers", "Pricing"

**Card 4: Funnel Builder** — LOCKED
- Number: "04"
- Tool name: "Funnel Builder"
- Description: "Design your complete sales funnel — from lead magnet to high-ticket back-end."
- Tags: "Funnels", "Automation"

**Card 5: Product Creator** — LOCKED
- Number: "05"
- Tool name: "Product Creator"
- Description: "AI-powered suite to create ebooks, templates, prompt packs & micro-courses inside the app."
- Tags: "AI Creator", "Auto-build"

**Card 6: Copy Suite** — LOCKED
- Number: "06"
- Tool name: "Copy Suite"
- Description: "Write sales pages, email sequences, ad copy & hooks in minutes with AI-powered copywriting."
- Tags: "Copywriting", "AI Writing"

**Card 7: AI Ad Suite** — LOCKED
- Number: "07"
- Tool name: "AI Ad Suite"
- Description: "Generate Meta, Google & YouTube ads with AI — creatives, copy, targeting & budgets."
- Tags: "Paid Ads", "Ad Creatives"

**Card 8: Landing Page Designer** — LOCKED
- Number: "08"
- Tool name: "Landing Page Designer"
- Description: "Drag-and-drop page builder with conversion-optimized templates for every product type."
- Tags: "Pages", "Conversion"

### Section: "Quick Start" (below tool cards)
Animation: `fadeUp 0.4s ease 0.2s both`
Margin-top: 32px

Heading: "🚀 Start Here — Your 72-Hour Launch Path" — Sora, font-weight 800, font-size 17px, color #0f172a, margin-bottom 4px
Subheading: "Follow these steps to go from zero to your first digital product sale." — DM Sans, 13px, #64748b, margin-bottom 16px

3 step cards in a row (grid: `repeat(3,1fr)`, gap 14px):

Each step card:
- Background: `rgba(255,255,255,0.88)`, backdropFilter `blur(16px)`, border-radius 16px, padding 20px
- Border: `1px solid rgba(255,255,255,0.95)`, box-shadow `0 4px 16px rgba(0,0,0,0.05)`

Step 1: "Find Your Niche" — Step badge: circle "1" (background #ede9fe, color #7c3aed) — Icon: 🎯 — Title: Sora 14px 800 — Desc: "Use Niche Clarity to find a proven, low-competition niche with strong buyer demand." — CTA: "Start Niche Clarity →" (purple, clickable, navigates to niche page)

Step 2: "Pick Your Product" — Step badge: circle "2" (background #fff7ed, color #ea580c) — Icon: 📦 — Title: Sora 14px 800 — Desc: "Use Product Navigator to choose a fast-launch product idea with a built-in ascension path." — CTA: "Open Product Navigator →" (orange, clickable)

Step 3: "Build & Launch" — Step badge: circle "3" (background #dcfce7, color #059669) — Icon: 🚀 — Title: Sora 14px 800 — Desc: "More creator tools drop soon. Subscribe to get notified when Product Creator & Copy Suite go live." — CTA: "Get Notified →" (green, shows coming soon toast)

---

## PAGE: NICHE CLARITY (activePage === "niche")

This page IS the existing Niche Finder app, but re-rendered INSIDE the dashboard's main content area (no separate navbar, no full-page background — just the content portion).

### Page Header (inside main content area):
Animation: `fadeUp 0.4s ease`
Margin-bottom: 24px

Flex row, space-between, align-items flex-start:

Left:
- Breadcrumb: "Dashboard / Niche Clarity" — DM Sans, 11.5px, color #94a3b8 — "Dashboard" is clickable (navigates back), separator " / ", "Niche Clarity" is bold #0f172a
- Title: "Niche Clarity" — Sora, font-weight 900, font-size 26px, color #0f172a, letter-spacing -0.02em, mt 4px
- Subtitle: "Find your perfect coaching or product niche from 594+ research-backed options." — DM Sans, 13.5px, #64748b, mt 3px

Right:
- Live badge: "✦ 594 Niches" — background `rgba(124,58,237,0.08)`, border `1px solid rgba(124,58,237,0.18)`, border-radius 50px, padding 5px 14px, font-size 10px, font-weight 700, color #7c3aed, letter-spacing 0.06em, UPPERCASE

### Content:
Render the complete Niche Finder functionality here:
- Filter panel (same glassmorphism style, white bg, blur)
- Search bar
- Growth filter buttons (active: #059669)
- Competition filter buttons (active: #7c3aed)
- Category accordion list with all 11 categories and all 594 niches
- On niche card click: open the AI-powered NicheModal (same modal as before, appearing over the dashboard)

**The Niche Finder content is identical to the standalone app's Browse tab.** Same data, same logic, same modal. Just embedded inside the dashboard layout without the page navbar/hero.

---

## PAGE: PRODUCT NAVIGATOR (activePage === "product")

This page IS the existing Digital Product Finder app, embedded inside the dashboard.

### Page Header:
Flex row, space-between, align-items flex-start:

Left:
- Breadcrumb: "Dashboard / Product Navigator" (clickable Dashboard link)
- Title: "Product Navigator" — Sora, font-weight 900, font-size 26px, color #0f172a, letter-spacing -0.02em
- Subtitle: "500+ digital product ideas with launch speed, price points & full ascension paths."

Right:
- Live badge: "⚡ 500+ Products" — background `rgba(234,88,12,0.08)`, border `1px solid rgba(234,88,12,0.18)`, color #ea580c

### Content:
Render the complete Product Navigator functionality:
- Filter panel with Launch Speed + Price Point filters
- Search bar
- Quick Launch tab + Browse All tab switcher (same orange/warm color scheme)
- Category accordion with all 11 digital product categories and all 495 products
- Product card click → AI-powered ProductModal with ascension path

---

## LOCKED TOOL PAGE (when locked sidebar item is clicked — show toast instead)

Do NOT navigate to a separate page. Instead show a **toast notification** at the bottom-right of the screen.

**Toast component:**
Position: fixed, bottom 24px, right 24px, z-index 1000
Animation: `popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)`
Auto-dismiss: 3.5 seconds

Toast card:
- Background: `rgba(255,255,255,0.95)`, backdropFilter `blur(20px)`, border-radius 14px, padding 14px 18px
- Border: `1px solid rgba(255,255,255,0.9)`, box-shadow `0 8px 32px rgba(0,0,0,0.12)`
- Min-width: 280px, max-width: 360px
- Layout: flex, gap 12px, align-items flex-start

Left: lock emoji in a 36×36px box, border-radius 10px, background #f1f5f9

Right:
- Title: "Coming Soon 🔒" — Sora, font-weight 800, font-size 14px, color #0f172a
- Message: "[Tool Name] is under construction. We're building something incredible — stay tuned!" — DM Sans, 12.5px, color #64748b, line-height 1.6, mt 2px

Bottom: progress bar (shimmer animation, linear gradient from #e2e8f0 to #f1f5f9, background-size 400px 100%, animation shimmer 1.5s linear infinite) — height 3px, border-radius 50px, margin-top 10px — shrinks from 100% to 0% over 3.5s (use CSS animation or state timer)

Close (✕) button: position absolute top-right of toast, color #94a3b8

State: `const [toast, setToast] = useState(null)` — stores `{ toolName: string } | null`

---

## THE AI NICHE MODAL (same as before, now appears over dashboard)

Identical to the existing NicheModal component. When a niche card is clicked inside the Niche Clarity page, this modal opens over everything with:
- Backdrop: `rgba(5,10,20,0.65)` + blur 12px, z-index 500
- Modal card: max-width 440px, popIn animation, white background
- Header band with gradient matching category accent
- AI-generated persona, pain points, market size, growth, competition, data source
- "View Strategy →" CTA

---

## THE AI PRODUCT MODAL (same as before, now appears over dashboard)

Identical to the ProductModal. Appears when product card is clicked inside Product Navigator page. Same structure with the 🚀 Ascension Path section.

---

## COMPLETE NICHE DATA (embed ALL of this)

The dashboard must contain ALL 594 niches from the Niche Finder AND all 495 digital product ideas from the Product Navigator — everything embedded in the same file.

**All 11 niche categories with their complete niche lists:**

### Health & Longevity (71 niches)
id:"health", iconBg:"#d1fae5", iconColor:"#059669", accent:"#10b981", countColor:"#065f46"
"Metabolic health & insulin resistance","GLP-1 nutrition support (muscle retention, micronutrients)","Weight-loss maintenance / rebound prevention","Strength training for beginners (30–50)","Strength training for women 40+","Menopause symptom & lifestyle","PCOS lifestyle & fertility-support","Thyroid-friendly lifestyle","Gut health & IBS lifestyle","Autoimmune-friendly lifestyle (habit + food logs)","Heart health & cholesterol lifestyle","Hypertension lifestyle","Reversing prediabetes lifestyle","Sleep optimization (insomnia protocols)","Circadian rhythm & light hygiene","Breathwork for stress + HRV","Mobility & posture correction","Back pain prevention & desk ergonomics","Chronic pain pacing & movement","Neuro-nutrition / brain health","Anti-inflammatory cooking & meal-prep","Plant-forward nutrition","Sports nutrition for amateur athletes","Running injury prevention","Marathon/triathlon mindset & plan","Kids nutrition for picky eaters","Family wellness routine","Healthy aging for 60+","Longevity biomarkers & habit (non-medical)","Medical checkup interpretation (lifestyle action plan)","Skin health & routines","Hair health & lifestyle","Hormone-friendly lifestyle (stress, sleep, nutrition)","Digestive enzyme & mindful eating","Alcohol reduction / sober-curious","Smoking/vaping quit-support","Healthy cooking for busy professionals","Healthy eating for hostel/PG life","Healthy eating for frequent travelers","Fitness for new moms","Fitness for dads with low time","Functional training for home workouts","Gym confidence (first 30 days)","Body recomposition (strength + protein habits)","Flexibility & yoga basics","Somatic movement & body awareness","Stress-eating & emotional hunger","Healthy habits for shift workers","Digestive health for women","Holistic recovery & overtraining prevention","Yin yoga & restorative practices","Kundalini yoga & awakening","Vinyasa flow & dynamic yoga","Yoga Nidra & yogic sleep","Prenatal & postnatal yoga","Chair yoga for seniors & mobility","Ayurveda lifestyle & daily routines","Ayurvedic nutrition & body types","Naturopathy & natural healing","Traditional Chinese Medicine (TCM) basics","Acupressure & meridian wellness","Homeopathy basics & remedies","Bach Flower Remedies & emotional healing","Aromatherapy & essential oils","Holotropic Breathwork","Wim Hof Method & cold exposure","Pranayama & yogic breathing","Box breathing & tactical breathwork","Theta Healing & belief work","Access Bars & consciousness","EFT Tapping & emotional freedom"

### Dance & Movement (72 niches)
id:"dance", iconBg:"#fce7f3", iconColor:"#be185d", accent:"#ec4899", countColor:"#9d174d"
"Bharatanatyam for beginners","Advanced Bharatanatyam (Varnam & Padam)","Bharatanatyam for kids","Kathak for beginners","Advanced Kathak (Tatkaar & compositions)","Kathak abhinaya & expression","Odissi dance coaching","Kuchipudi dance coaching","Mohiniyattam coaching","Manipuri dance coaching","Sattriya dance coaching","Kathakali basics & gestures","Bhangra coaching","Garba & Dandiya coaching","Lavani dance coaching","Ghoomar coaching","Bihu dance coaching","Chhau dance basics","Kolattam & folk stick dance","Bollywood dance for beginners","Bollywood choreography","Bollywood wedding dance","Semi-classical fusion dance","Indo-contemporary fusion","Bollywood fitness dance","Hip-hop dance fundamentals","Breaking & B-boy basics","Popping & locking technique","House dance coaching","Krumping basics","Contemporary dance technique","Lyrical dance coaching","Jazz dance fundamentals","Ballet for beginners","Ballet technique & barre","Modern dance coaching","Tap dance coaching","Salsa for beginners","Salsa On1 & On2 styles","Bachata coaching","Bachata sensual style","Kizomba coaching","Zouk dance coaching","Cha-cha coaching","Rumba coaching","Jive & swing dance","Tango fundamentals","Argentine tango coaching","Waltz & foxtrot coaching","Ballroom dance for couples","Zumba instructor training","Dance fitness coaching","Barre fitness coaching","Dance cardio & conditioning","Pilates for dancers","Yoga for dancers (flexibility)","Dance injury prevention","Dance for kids (3-6 years)","Dance for tweens (7-12 years)","Teen dance coaching","Parent-child dance bonding","Dance for special needs kids","Stage performance coaching","Dance audition preparation","Dance competition coaching","Choreography creation","Dance teacher to online coach","Dance studio business","Dance content for social media","Dance for confidence & expression","Therapeutic movement & dance","Dance for seniors (gentle movement)"

### Mental & Emotional Fitness (55 niches)
id:"mental", iconBg:"#ede9fe", iconColor:"#7c3aed", accent:"#8b5cf6", countColor:"#5b21b6"
"Anxiety management (skills + exposure planning)","Burnout recovery for professionals","Digital overwhelm / attention reset","Mindfulness fundamentals","Meditation habit building (30-day)","Self-esteem & confidence","Imposter syndrome for high performers","Emotional regulation (CBT/DBT-informed)","Somatic nervous system regulation","Trauma-informed resilience (non-therapy)","Grief support (structure + routines)","Anger management","Overthinking & rumination","Decision clarity","Values & identity","Purpose discovery","Habit change (behavior design)","Procrastination","ADHD productivity (adult)","Neurodiversity-friendly routines","Autism-friendly work/life","Sleep anxiety / orthosomnia","Social anxiety confidence","Public speaking anxiety","Confidence on camera","Inner child healing (non-clinical)","Shadow-work journaling","Journaling & reflection","Mindset for entrepreneurs","Mental toughness for athletes","High-pressure exam mindset","Teen emotional resilience","Parent emotional regulation","Couples emotional skills","Boundaries (family + work)","People-pleasing recovery","Perfectionism recovery","Self-compassion","Stoicism for modern life","Spiritual practice + mental health balance","Community belonging & loneliness","Dating mindset","Confidence after breakup","Mindset for money","Mindset for health","Fear of tech/AI anxiety","Creativity confidence","Sleep + stress synergy","Workplace conflict resilience","Resilience for caregivers","Vipassana & insight meditation","Transcendental Meditation (TM)","Zen meditation & zazen","Loving-kindness (Metta) meditation","Body scan & progressive relaxation"

### Relationships & Family (50 niches)
id:"relationships", iconBg:"#fee2e2", iconColor:"#dc2626", accent:"#ef4444", countColor:"#b91c1c"
"Marriage communication","Couples conflict resolution","Pre-marriage compatibility","Love languages & intimacy","Rebuilding trust","Co-parenting after separation","Healthy boundaries with in-laws","Family systems communication (non-therapy)","Teen-parent communication","Parenting in the digital age","Screen-time rules & family tech policy","Raising resilient teens","Academic pressure & parent support","Mindful parenting","Positive discipline (3–10 years)","Newborn routines & parenting","Parenting for working moms","Parenting for working dads","Single parent resilience","Blended family","Sibling rivalry","Family meeting facilitation","Emotional coaching for kids","Helping kids with learning habits","Attachment-informed parenting","Child confidence building","Social skills for kids","Special needs parent support","Neurodivergent child support routines","Marriage after kids","Intimacy after childbirth","Relationship repair after affairs","Dating for 30+ professionals","Dating for introverts","Arranged marriage decision","Healthy breakup","Friendship building","Loneliness-to-community","Family financial communication","Household roles & mental load","Caregiving for aging parents","Grandparent involvement","Family health routines","Family travel & bonding","Home environment harmony","Family goal-setting","Couples goal alignment","Emotional safety in relationships","Conflict de-escalation","Wedding planning stress"

### Money & Wealth (50 niches)
id:"money", iconBg:"#fef9c3", iconColor:"#b45309", accent:"#f59e0b", countColor:"#78350f"
"Personal budgeting & cashflow","Debt payoff strategy","Credit score & credit behavior","Emergency fund & safety-net","First-time investor (index funds basics)","SIP habit (India)","Financial literacy for young adults","Money management for couples","Money boundaries with family","High-income, low-savings","Salary negotiation (money angle)","Side-income planning","Freelancer finances (tax + buffers)","Entrepreneur personal finance","Business owner cashflow","Profit-first implementation","Pricing confidence","Subscription reduction / expense detox","Smart spending & anti-impulse","Minimalism + money","Retirement planning habit","Insurance literacy (life/health basics)","Health insurance claim readiness","Estate planning readiness (checklists)","Wedding finance","Home-buying readiness","Home-loan strategy","Student loan strategy","Financial planning for new parents","Financial planning for caregivers","Financial recovery after job loss","Financial recovery after divorce","Money mindset + investing habits","Crypto risk management (education)","Value investing basics","Stock market discipline","Goal-based investing","Emergency career transition fund","Tax planning habits (non-CPA)","Business expense tracking","Bookkeeping habits for solopreneurs","Revenue diversification","Digital product income planning","Affiliate income system","Creator monetization (revenue streams)","Real estate investing readiness","Rent vs buy decision","Luxury spending control","Financial coaching for teens","Family financial education"

### Career & Work (50 niches)
id:"career", iconBg:"#dbeafe", iconColor:"#1d4ed8", accent:"#3b82f6", countColor:"#1e3a8a"
"Career clarity (niche + direction)","Mid-career transition (10+ years exp.)","AI-proof career strategy","Resume & LinkedIn positioning","Interview mastery","Portfolio building (projects)","Remote work career","Hybrid work productivity","Leadership promotion","Manager-to-leader","First-time manager","Executive presence","High-performance work systems","Time management for professionals","Deep work & focus","Meeting hygiene","Workplace politics navigation","Workplace communication","Conflict management at work","Negotiation skills","Personal branding for employees","Career coaching for Gen Z","Career coaching for returning moms","Return-to-work after break","Career coaching for immigrants","Career coaching for teachers to corporate","Career coaching for engineers to PM","Product management transition","Data/analytics career","Cybersecurity career","Cloud career","AI/ML career roadmap","Prompt engineering career","Sales career","Consulting career","Healthcare career","Teaching career (better pedagogy + growth)","Trade skills pathway","Career coaching for creatives","Job search systems","Networking systems","Mentorship & sponsor strategy","Work-life boundaries","Burnout prevention at work","Career confidence for introverts","Public speaking for workplace","Leadership storytelling","Performance review strategy","Skill-building plan (12-week)","Learning agility"

### Business Growth for Experts (50 niches)
id:"business", iconBg:"#ffedd5", iconColor:"#c2410c", accent:"#f97316", countColor:"#9a3412"
"Offer design for coaches","High-ticket positioning","Webinar selling","Community building","Membership program design","Course curriculum design","Product ladder & ascension","Lead magnet + funnel","Paid ads for coaches","Copywriting for coaches","Story-based marketing","Personal brand content strategy","Short-form video systems","YouTube growth for experts","Podcast growth & monetization","Email marketing systems","Launch planning","Evergreen webinar automation","Sales call mastery","Objection handling","Pricing + packaging","Client onboarding systems","Client retention","Coaching delivery excellence","Group coaching facilitation","Community engagement & gamification","Operations & SOP creation","Delegation & hiring VA/team","Agency-to-product transition","Creator-to-coach transition","Offline to online digitization","Building a signature framework","Brand archetype & messaging","High-converting landing page","Conversion rate optimization","Offer stack & bonuses","Partnerships & JV","Affiliate program creation","Event selling (workshops/retreats)","Retreat design & pricing","Client acquisition via LinkedIn","Client acquisition via Instagram","Client acquisition via WhatsApp","Client acquisition via webinars","Upsell & continuity","Community monetization","Analytics & KPI dashboard","Marketing automation tools","Ethical persuasion","Spiritual + business alignment"

### AI & Tech Mastery (50 niches)
id:"ai", iconBg:"#cffafe", iconColor:"#0e7490", accent:"#06b6d4", countColor:"#164e63"
"AI literacy for non-tech professionals","ChatGPT productivity","Prompting for business outcomes","AI for content creation","AI for research & synthesis","AI for customer support","AI chatbot/AI clone creation","No-code app building (vibe coding)","Automation with Zapier/Make","AI workflow design","AI tools stack selection","AI policy & safe usage","Data privacy for creators","Cyber hygiene for families","Digital security for solopreneurs","Personal knowledge management (PKM)","Second brain systems (Notion/Obsidian)","Email & calendar automation","AI for marketing analytics","AI for paid ads optimization","AI for sales enablement","AI for HR/recruiting workflows","AI for teaching/training","AI + community moderation","Building AI agents for tasks","AI for coding beginners","AI for Excel/Sheets mastery","AI for design (Canva/Midjourney)","AI video editing workflows","AI voice + podcast workflows","AI for language learning","Digital declutter","Screen-time reduction + tool setup","Digital wellbeing (device habits)","Online reputation management","Creator tech stack setup","Website + landing pages for coaches","Shopify/D2C basics","CRM setup for coaches","Email deliverability","SEO basics for creators","Analytics (GA4)","Funnel tracking & attribution","AI for customer surveys","AI-powered journaling","AI-assisted life planning","Tech confidence for seniors","Tech adoption for small businesses","Digital accessibility basics","Workplace AI upskilling"

### Leadership & Communication (50 niches)
id:"leadership", iconBg:"#e0e7ff", iconColor:"#4338ca", accent:"#6366f1", countColor:"#312e81"
"Leadership fundamentals","Servant leadership","Influence without authority","Conflict resolution","Crucial conversations","High-stakes negotiation","Executive presence & gravitas","Stakeholder management","Team motivation","Performance management","Coaching skills for managers","Feedback mastery","Meeting facilitation","Storytelling for leaders","Presentation mastery","Public speaking","Sales presentation","Teaching on stage","On-camera charisma","Voice & articulation","Accent neutralization","English fluency for professionals","Writing clarity","Persuasive writing","LinkedIn thought leadership","Personal branding communication","Networking confidence","Relationship building","Community leadership","Customer empathy","Emotional intelligence (EQ)","Listening skills","Boundary setting in communication","Assertiveness","Difficult manager","Managing up","Cross-cultural communication","Remote team communication","Asynchronous communication","Conflict mediation","High-trust team culture","Vision & mission articulation","Leadership for founders","Leadership for women","Leadership for introverts","Leadership for young managers","DEI-aware leadership","Ethical leadership","Crisis communication","Media training"

### Lifestyle & Productivity (48 niches)
id:"lifestyle", iconBg:"#dcfce7", iconColor:"#15803d", accent:"#84cc16", countColor:"#3f6212"
"Time-blocking & weekly planning","Goal-setting & OKR personal","Morning routine design","Evening routine design","Energy management","Work-life integration","Minimalism & declutter","Home organization","Digital productivity","Focus & deep work","Flow state","Habit tracking system","Accountability (90-day)","Personal operating system (Life OS)","Meal planning for busy people","Fitness habit stacking","Sleep routine","Stress management","Travel routines (frequent flyers)","Parent productivity","Entrepreneur productivity","Student productivity","Exam prep planning","Study skills","Memory techniques","Reading habit","Learning acceleration","Language learning habit","Creativity + productivity","Decision fatigue reduction","ADHD-friendly productivity","Tech boundaries","Phone addiction recovery","Workstation ergonomics","Remote work environment","Calm home systems","Family schedule systems","Couples productivity","Life planning for 2026","Vision book creation","Bucket list & experiences","Purposeful leisure","Micro-adventure","Healthy social life","Personal style & wardrobe","Confidence through style","Home cooking systems","Personal safety routines"

### Creativity & Creator Economy (48 niches)
id:"creativity", iconBg:"#fae8ff", iconColor:"#a21caf", accent:"#c026d3", countColor:"#701a75"
"YouTube channel launch & growth","Short-form video content","Podcast launch & monetization","Instagram content strategy","Personal brand building","Newsletter & Substack growth","Content repurposing systems","Content calendar systems","Faceless YouTube channel","TikTok for creators","LinkedIn creator strategy","Twitter/X growth","Reels & short video editing","Video storytelling","On-camera confidence","Copywriting for creators","Caption writing mastery","SEO content writing","Blog to business","Graphic design for creators (Canva)","Photography for content creators","Brand photography","Creative writing & storytelling","Screenwriting & scriptwriting","Children's book author","Self-publishing & Amazon KDP","Journaling & expressive writing","Spoken word & poetry","Stand-up comedy writing","Voice acting & narration","Music production basics","Songwriting & lyrics","Artist business development","Illustration & digital art","Motion graphics basics","UX writing & content design","Interior design content","Food photography & styling","Fashion & style content","Travel content creator","DIY & craft business","Etsy & handmade business","Creator monetization strategy","Brand deals & sponsorships","Creator community building","Live streaming & events","Merch & product creation","Creative entrepreneurship mindset"

---

**All 11 digital product categories with complete product lists (embed exactly as in the Digital Product Finder prompt — 45 products per category × 11 categories = 495 products):**

[Ebooks & Guides 45], [Templates & Systems 45], [Prompt Packs 45], [Micro-Courses 45], [Canva & Design 45], [Spreadsheets & Trackers 45], [Swipe Files 45], [AI Tools 45], [No-Code & SaaS 45], [Memberships 45], [Done-For-You Kits 45]

Use the exact product names from the Digital Product Finder prompt (the one previously generated). All 495 product names must be embedded verbatim.

---

## DETERMINISTIC RNG (same function — use for all growth/competition values)
```javascript
function seedRng(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}
```

---

## RESPONSIVE BEHAVIOR
- On screens < 900px: sidebar collapses to a 60px icon-only rail (show only icons, no labels, no badges)
- On screens < 640px: sidebar becomes a bottom tab bar (5 most important items as icons)
- Main content: max-width none, full available width, padding reduces to 20px on mobile
- Stats grid: 2 columns on tablet, 1 column on mobile
- Tool cards: 1 column on mobile

---

## FINAL BUILD RULES

1. Single React file (App.jsx) — all state, all data, all components in one file
2. Pure inline styles only — NO Tailwind, NO UI libraries, NO CSS modules
3. All 8 CSS keyframe animations must be injected via a style tag
4. The dashboard, niche page, and product page are all rendered in the same layout — only the main content area changes
5. LOCKED tools must NEVER navigate — they only trigger the toast
6. All 594 niches AND all 495 products must be embedded in full
7. The seeded RNG must be used — NO Math.random()
8. Both AI modals (NicheModal and ProductModal) must work with `VITE_ANTHROPIC_API_KEY`
9. The sidebar progress card must always show "2 of 8 tools unlocked"
10. Build everything in one generation. Do not ask questions. Follow every spec exactly.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://shikshantaram-os.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e60b4515-0315-47e7-9680-161ad848c745).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
