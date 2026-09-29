# Earnova

**Create. Share. Shine.**

A global creator platform with ad monetization. Build beautiful pages, share them with the world, and optionally connect your own Adsterra or Monetag account to monetize your legitimate traffic.

Christmas 2026 is our flagship launch campaign — but the platform supports creators worldwide, every day of the year.

---

## Features

### Page Builder
- Drag-and-reorder content blocks (Heading, Text, Image, Quote, Link, Social Link, Divider)
- Live preview
- One-click publish / unpublish
- Auto-generated slug URLs (`/p/your-page-title`)
- 12 page types (Personal, Celebration, Link Hub, Creator, Blogger, Photography, Music, Gaming, Business, Event, Professional, Link Hub)

### Ad Monetization
- **Adsterra** and **Monetag** integration with real ad-network script tag rendering
- **AdRenderer library** generates correct ad tags per network + integration type:
  - Adsterra BANNER: `atOptions` config + `invoke.js` script
  - Adsterra NATIVE/PUSH/VIGNETTE: async `invoke.js` / `social-bar.js`
  - Monetag MultiTag/In-Page Push/OnClick: unified `invoke.js` pattern
  - Direct Link format for both networks
- **Two ad layers**:
  - **Platform ads** (Layer 2): the platform's own Adsterra/Monetag publisher account renders on every eligible Special Page
  - **User ads**: creators connect their own ad-network account, subject to admin approval
- **Placement engine** with policy-driven co-display rules:
  - Per-network compatibility matrix (ALLOWED / ALLOWED_WITH_LIMITS / FORBIDDEN)
  - Global caps (max ad units per page, max platform/user ads, min content separation)
  - Global kill switch (emergency ad suppression)
- **Verification lifecycle** for platform ads: UNVERIFIED → VERIFYING → VERIFIED → SUSPENDED
- **Test endpoint** simulates real ad-network requests (200-800ms latency, 85% pass rate)
- Only VERIFIED platform integrations render ads — admin gate enforced at placement engine level

### Admin Console (10 tabs)
1. **Overview** — platform stats (users, pages, campaigns, integrations, networks) + recent moderation events
2. **Campaigns** — full CRUD for seasonal campaigns (slug, title, description, dates, active/featured toggles)
3. **Platform ads** — manage + verify the platform's own ad inventory (Adsterra/Monetag publisher accounts)
4. **Integrations** — manage ALL user ad integrations (edit config, disable, revoke, re-enable)
5. **Ad networks** — CRUD for ad network definitions (code, display name, integration types, TCF vendor ID, status)
6. **Compatibility** — visual matrix grid + rules for network co-display
7. **Policy** — platform toggles (kill switch, platform ads, user ads, manual approval) + numeric caps
8. **Users** — search + filter, ban/unban with auto-disable, user detail dialog
9. **Pages** — page moderation (search, filter by state, inline state transitions)
10. **Reviews** — pending user ad-integration approvals (approve/reject/revoke)

### Trust Score (Shadow Mode)
- 5 sub-scores: Traffic Quality, Content Risk, Ad Risk, Spam Risk, Account Risk
- Weighted composite (35/20/25/15/5)
- Signal breakdown visible to admins for audit
- Computed on-demand via "Recompute" button
- Calibrating in Phase 1 before automated enforcement in Phase 2

### Compliance Architecture
- **Consent gate**: ads only render after visitor consent (MVP auto-grants; production would use IAB TCF v2.2 CMP)
- **Earnings disclaimer**: users must acknowledge before connecting ad networks
- **No fake earnings**: platform never displays fabricated earnings numbers — links to ad-network dashboard instead
- **Audit trail**: every admin action (test, verify, suspend, unverify, ban, unban, approve, reject, revoke) logs a ModerationEvent
- **Sanitized ad storage**: never stores raw user-supplied JavaScript — only sanitized identifiers (zoneKey, cdnUrl)
- **GDPR/CCPA consent schema**: ConsentRecord table (append-only), AdNetworkVendorMapping for TCF vendor IDs

### Design System
- **Palette**: Deep Evergreen `#0F4C3A` + Warm Gold `#D4A437` + Cream `#FBF8F2` + Berry `#8B2C5C` + Cranberry `#C0392B`
- **Typography**: Playfair Display (serif headings) + Geist Sans (body) + Geist Mono (code)
- **30+ keyframe animations**: fade-in-up, gradient-shift, aurora-rotate, mesh-shift, shimmer, float, pulse-glow, sparkle-pulse, scan-line, pop-in, confetti-fall, and more
- **Glassmorphism**: glass-card, glass-strong with backdrop-blur
- **Gradient dialogs**: GradientDialogHeader with 6 variants (evergreen, gold, berry, festive, cranberry, ocean)
- **Framer Motion**: 3D tilt cards, magnetic buttons, layoutId nav underlines, staggered reveals, animated SVG score circles, count-up numbers
- **Confetti celebrations**: on signup (200 particles), page publish (180), ad integration approval (150), verification (150), test pass (60)
- **Responsive**: mobile-first, 2-col stat cards on mobile → 4-col on desktop
- **Accessibility**: prefers-reduced-motion respected, focus rings, ARIA labels, keyboard navigation
- **Custom scrollbar**: gold gradient with hover state

### Technical Stack
- **Framework**: Next.js 16 with App Router (Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York style)
- **Database**: Prisma ORM (SQLite for dev)
- **Authentication**: Session-based (cookie, sha256 password hashing)
- **Animations**: Framer Motion
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable
- **Icons**: Lucide React
- **Fonts**: Geist Sans, Geist Mono, Playfair Display

---

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- SQLite (included — no external DB needed for development)

### Installation

```bash
# Clone the repo
git clone https://github.com/kingstechplc-lang/earnova.git
cd earnova

# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Or create .env with:
# DATABASE_URL=file:./db/custom.db

# Push database schema
bun run db:push

# Seed demo data
bunx tsx scripts/seed.ts

# Start dev server
bun run dev
```

Visit `http://localhost:3000`

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Creator | `kingsley@example.com` | `demo1234` |
| Admin | `admin@example.com` | `admin1234` |

### Sample Page

Visit `http://localhost:3000/#/p/kingsley-christmas` to see a live Special Page with platform ad slots.

---

## Project Structure

```
earnova/
├── prisma/
│   └── schema.prisma          # Full data model (20+ models)
├── scripts/
│   ├── seed.ts                # Demo data seeder
│   ├── build_body.py          # Architecture spec PDF generator
│   ├── cover.html             # PDF cover page
│   └── merge_final.py         # PDF merger
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (fonts, metadata)
│   │   ├── page.tsx           # Single-page app (view-state navigation)
│   │   ├── globals.css        # Design system (palette, animations, utilities)
│   │   └── api/               # API routes
│   │       ├── auth/          # register, login, logout, me
│   │       ├── pages/         # CRUD + publish
│   │       ├── page-builder/  # Block CRUD + reorder
│   │       ├── p/[slug]/      # Public page renderer
│   │       ├── monetization/  # Integrations + disclaimer
│   │       ├── admin/         # 15+ admin API routes
│   │       ├── campaigns/     # Active campaigns list
│   │       ├── networks/      # Ad network list
│   │       └── analytics/     # Page analytics + trust score
│   ├── components/
│   │   ├── admin/             # 8 admin section components
│   │   ├── ad/                # AdSlot (real ad-tag injection)
│   │   ├── animated/          # CountUp, TiltCard, MagneticButton,
│   │   │                      # FloatingOrbs, Sparkles, Confetti,
│   │   │                      # GradientDialogHeader, motion primitives
│   │   ├── layout/            # Header, Footer
│   │   ├── views/             # 8 view components (landing, login,
│   │   │                      # signup, dashboard, builder, monetization,
│   │   │                      # admin, public-page, analytics)
│   │   └── ui/                # shadcn/ui component library
│   └── lib/
│       ├── auth.ts            # Session-based auth
│       ├── db.ts              # Prisma client
│       ├── safe-fetch.ts      # Error-resilient fetch wrapper
│       ├── ad-renderer.ts     # Adsterra/Monetag ad-tag generator
│       ├── placement-engine.ts # Policy-driven ad placement
│       ├── trust-score.ts     # 5-subscore trust computation
│       └── utils.ts           # Shared utilities
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Architecture

The platform separates **User Ad Engine** from **Platform Ad Engine** with the **Consent Layer** as the only shared gate. This separation ensures:
- The platform never pays users (earnings come from external ad networks)
- The platform never processes ad payouts or KYC
- The platform's role is infrastructure, moderation, and discovery — not financial intermediation

### Data Model Highlights
- **AdNetwork** + **AdNetworkCompatibility** — network definitions + co-display rules
- **AdPlacementPolicy** — global toggles + caps (kill switch, max units, etc.)
- **PlatformAdNetworkIntegration** — platform's own ad inventory with verification lifecycle
- **AdIntegration** — user-supplied ad integrations with 6-state lifecycle
- **AdPlacement** — per-page ad slot assignments
- **SpecialPage** + **ContentBlock** — pages with drag-reorder blocks
- **Campaign** — seasonal campaigns (Christmas 2026, New Year 2027, etc.)
- **TrustScore** — shadow-mode scoring (5 sub-scores + composite)
- **ModerationEvent** — append-only audit log for all state transitions
- **ConsentRecord** — GDPR/CCRA consent tracking (append-only)
- **EarningsDisclaimerAck** — user acknowledgment gate

### Ad Tag Generation

The AdRenderer (`src/lib/ad-renderer.ts`) generates real ad-network script tags:

**Adsterra BANNER**:
```html
<script>atOptions = {'key':'ZONE_KEY','format':'iframe','height':250,'width':300,'params':{}};</script>
<script src="//CDN_URL/ZONE_KEY/invoke.js"></script>
```

**Monetag (all types)**:
```html
<script src="//CDN_URL/ZONE_ID/invoke.js" async="async" data-cfasync="false"></script>
```

The AdSlot component injects these into the DOM programmatically (creating `<script>` elements, copying attributes, handling onload/onerror).

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server on port 3000 |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run db:migrate` | Run Prisma migrations |
| `bunx tsx scripts/seed.ts` | Seed demo data |

---

## License

This project is proprietary. All rights reserved.

---

## Acknowledgments

- [Next.js](https://nextjs.org/) — React framework
- [shadcn/ui](https://ui.shadcn.com/) — UI component library
- [Framer Motion](https://www.framer.com/motion/) — Animation library
- [Prisma](https://www.prisma.io/) — Database ORM
- [Adsterra](https://adsterra.com/) — Ad network
- [Monetag](https://monetag.com/) — Ad network
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [Lucide](https://lucide.dev/) — Icons

---

**Earnova** — Create. Share. Shine.
