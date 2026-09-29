# Earnova — Codebase Audit (Phase 0)

**Date**: 2026-09-29
**Auditor**: Z.ai Principal Architect
**Repository**: https://github.com/kingstechplc-lang/earnova
**Commit**: `9f9b5af`
**Database**: Neon PostgreSQL (production) / SQLite (local .env — inconsistency)

---

## 1. Existing Architecture Summary

### Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York, 48 components)
- **Database**: Prisma ORM → PostgreSQL (Neon) / SQLite (local)
- **Animations**: Framer Motion (30+ keyframes, 8 animated components)
- **D&D**: @dnd-kit (page builder block reordering)
- **Fonts**: Geist Sans, Geist Mono, Playfair Display

### Database
- **18 Prisma models**: User, Session, AdNetwork, AdNetworkCompatibility, AdPlacementPolicy, ConsentRecord, AdNetworkVendorMapping, SpecialPage, ContentBlock, AdIntegration, AdPlacement, TrustScore, ModerationEvent, Campaign, PlatformAdNetworkIntegration, CreatorSubscription, PageAnalytics, EarningsDisclaimerAck
- **13 enums**: UserRole, AdNetworkStatus, CompatibilityVerdict, PageType, ModerationState, BlockType, IntegrationType, IntegrationLifecycle, PlacementSource, PlacementSlot, PlatformVerificationState, SubscriptionTier, SubscriptionStatus
- **No migrations**: Using `prisma db push --accept-data-loss` (destructive, no migration history)
- **No indexes audit**: Most models have basic indexes but high-volume tables (PageAnalytics, TrustScore) may need optimization

### API Routes (43 total)
- **Auth**: register, login, logout, me (4 routes)
- **Pages**: list, create, get, update, delete, publish (6 routes)
- **Page Builder**: blocks CRUD + reorder (3 routes)
- **Public**: /api/p/[slug] — fetch public page with computed ad placements (1 route)
- **Monetization**: integrations CRUD, submit, disable, attach, disclaimer (6 routes)
- **Networks**: list active ad networks (1 route)
- **Campaigns**: list active campaigns (1 route)
- **Analytics**: get analytics + recompute trust score (1 route)
- **Admin**: campaigns, networks, compatibility, policy, users, pages, platform-integrations, integrations, stats, pending reviews (21 routes)

### UI Components
- **9 views**: landing, login, signup, dashboard, builder, monetization, admin, public-page, analytics
- **10 admin sections**: overview, campaigns, platform-ads, integrations, networks, compatibility, policy, users, pages, reviews
- **3 layout components**: header, footer, sidebar (collapsible)
- **8 animated components**: CountUp, TiltCard, MagneticButton, FloatingOrbs, Sparkles, Confetti, GradientDialogHeader, motion primitives
- **1 ad component**: AdSlot (real ad-tag injection into DOM)

### Libraries
- **ad-renderer.ts**: Generates Adsterra/Monetag script tags based on network + type + CDN + zoneKey
- **placement-engine.ts**: Policy-driven placement with co-display compatibility matrix + global caps
- **trust-score.ts**: 5 sub-scores (Traffic/Content/Ad/Spam/Account) with mock signals
- **auth.ts**: Session-based auth with SHA-256 password hashing (INSECURE)
- **safe-fetch.ts**: Error-resilient fetch wrapper (never throws)
- **db.ts**: Prisma client singleton

### Deployment
- **Dockerfile**: Multi-stage build for containerized deployment
- **docker-compose.yml**: One-command deployment
- **Vercel**: Compatible (postinstall: prisma generate, build: next build)
- **.env committed to git**: SECURITY ISSUE (now removed from tracking + added to .gitignore)

---

## 2. Classification: KEEP / IMPROVE / REFACTOR / REPLACE / REMOVE / MISSING

### KEEP (Working, well-architected)
| Component | Status | Notes |
|-----------|--------|-------|
| AdRenderer | ✅ KEEP | Correct Adsterra/Monetag tag formats, server-side generation |
| Placement Engine | ✅ KEEP | Policy-driven, compatibility matrix, well-structured |
| safe-fetch.ts | ✅ KEEP | Error-resilient, never throws, good pattern |
| AdSlot component | ✅ KEEP | Real DOM injection, consent gate, loading states |
| Platform ad verification lifecycle | ✅ KEEP | UNVERIFIED→VERIFYING→VERIFIED→SUSPENDED, test endpoint |
| Admin console 10-tab structure | ✅ KEEP | Well-organized, CRUD for all entities |
| GradientDialogHeader | ✅ KEEP | 6 variants, scrollable, beautiful |
| Confetti system | ✅ KEEP | Programmatic, brand colors, auto-cleanup |
| Collapsible sidebar | ✅ KEEP | Responsive (desktop persistent + mobile drawer) |
| Campaign CRUD | ✅ KEEP | Full lifecycle, featured/active toggles |
| Ad network CRUD | ✅ KEEP | Integration types, TCF vendor mapping |
| Compatibility matrix | ✅ KEEP | Visual grid + rules CRUD |
| Trust Score (5 sub-scores) | ✅ KEEP | Architecture sound, needs real signals |
| ModerationEvent audit log | ✅ KEEP | Append-only, from/to state, reason, triggered-by |
| EarningsDisclaimerAck | ✅ KEEP | Compliance gate before monetization |
| ContentBlock system | ✅ KEEP | 15 block types, drag-reorder, per-block editors |
| Design system (globals.css) | ✅ KEEP | 30+ animations, glassmorphism, brand palette |
| Page analytics (mock) | ✅ KEEP structure | Replace mock data with real event ingestion |
| CreatorSubscription model | ✅ KEEP | Schema ready for tiers, needs entitlement logic |

### IMPROVE (Working but needs enhancement)
| Component | Issue | Action |
|-----------|-------|--------|
| Auth (auth.ts) | SHA-256 password hashing (INSECURE) | Replace with Argon2id |
| Session model | No device/IP tracking, no revocation UI | Add device, browser, lastActivity, ipHash |
| User model | No username field, no email verification | Add username, emailVerified, bio, avatar |
| SpecialPage | No SEO metadata fields | Add seoTitle, seoDescription, ogImage |
| ContentBlock | No server-side validation (Zod) | Add Zod schemas per block type |
| AdIntegration | Lifecycle states don't match spec (missing SUBMITTED, UNDER_REVIEW, EXPIRED) | Add missing states |
| TrustScore | Mock signals only | Wire to real bot detection + analytics pipeline |
| PageAnalytics | Mock data, not from real events | Build AnalyticsEvent model + aggregation |
| .env | Committed to git (now removed) | Use Vercel env vars only |
| next.config.ts | `ignoreBuildErrors: true` | Remove once TS is clean |
| db:push script | Uses `--accept-data-loss` | Replace with `prisma migrate dev` |
| Admin RBAC | Only role checks (ADMIN/MODERATOR/USER) | Add granular Permission model |
| Public page routing | Client-side SPA, no SSR | Add server-rendered routes for SEO |

### REFACTOR (Architectural change needed)
| Component | Issue | Action |
|-----------|-------|--------|
| Routing | Entire app is client-side SPA at `/` | Migrate to Next.js App Router with real routes (/, /explore, /@username, /p/[slug], /post/[slug]) |
| Ad provider logic | Hard-coded in ad-renderer.ts | Extract to provider abstraction (AdProvider interface) |
| Analytics | Single PageAnalytics model with pre-aggregated fields | Build AnalyticsEvent → aggregation → dashboard pipeline |
| Subscription | CreatorSubscription is a simple tier field | Build Plan + Feature + Entitlement system |

### REPLACE
| Component | Replacement |
|-----------|-------------|
| SHA-256 password hashing | Argon2id via `@node-rs/argon2` or `bcryptjs` |
| `prisma db push` | `prisma migrate dev` (development) + `prisma migrate deploy` (production) |
| Mock trust signals | Real signals from Cloudflare Bot Management + in-house pipeline |

### REMOVE
| Component | Reason |
|-----------|--------|
| `db/` directory (SQLite file) | Production uses Neon PostgreSQL; local should use Neon preview branch or local Postgres |
| `scripts/build_body.py`, `scripts/cover.html`, `scripts/merge_final.py` | Architecture spec PDF generation — not part of the platform |
| `research/` directory | Web search research data — not needed in repo |
| `tool-results/` directory | Internal tool output — not needed in repo |

### MISSING (Must be built per spec)
| System | Models Needed | Priority |
|--------|---------------|---------|
| Creator Identity (username) | Username (unique handle, reserved list, profanity check) | Phase 2 |
| Posts system | Post, PostMedia, PostEngagement | Phase 3 |
| Follow system | Follow (uniqueness constraint) | Phase 4 |
| Comments | Comment, CommentReply | Phase 4 |
| Reactions | Reaction (unified engagement) | Phase 4 |
| Saves/Bookmarks | SavedContent | Phase 4 |
| Notifications | Notification, NotificationPreference, NotificationDelivery | Phase 4 |
| Explore/Search | SearchIndex (or Postgres full-text) | Phase 5 |
| Trending | TrendingScore (weighted model) | Phase 5 |
| Analytics events | AnalyticsEvent, AnalyticsAggregation (hourly/daily) | Phase 6 |
| Reports | ContentReport, ReportResolution | Phase 9 |
| Block/Mute | BlockedUser, MutedUser | Phase 9 |
| Media system | MediaAsset, MediaVariant, MediaFolder | Phase 10 |
| Email verification | EmailVerificationToken | Phase 1 |
| Password reset | PasswordResetToken | Phase 1 |
| Rate limiting | In-memory or Redis-based rate limiter | Phase 1 |
| Permissions (RBAC) | Permission, RolePermission | Phase 1 |
| Audit log | AuditLog (separate from ModerationEvent) | Phase 1 |
| Feature flags | FeatureFlag | Phase 1 |
| System settings | SystemSetting (key-value config) | Phase 1 |
| Legal pages | Terms, Privacy, Cookie Policy, Community Guidelines | Phase 15 |
| Sitemap/robots | sitemap.ts, robots.ts | Phase 3 |
| Security headers | next.config.ts headers config | Phase 1 |
| Tests | Unit + integration + E2E | All phases |
| CI/CD | GitHub Actions workflow | Phase 1 |
| Documentation | /docs directory with architecture docs | All phases |

---

## 3. Security Issues Found

| # | Severity | Issue | Phase to Fix |
|---|----------|-------|-------------|
| 1 | **CRITICAL** | SHA-256 password hashing (not Argon2id/bcrypt) | Phase 1 |
| 2 | **CRITICAL** | .env file committed to git (contains DATABASE_URL) | Fixed in this audit |
| 3 | **HIGH** | No email verification on registration | Phase 1 |
| 4 | **HIGH** | No password reset flow | Phase 1 |
| 5 | **HIGH** | No rate limiting on any endpoint (login, register, comments) | Phase 1 |
| 6 | **HIGH** | No CSRF protection | Phase 1 |
| 7 | **HIGH** | No security headers (CSP, HSTS, X-Content-Type-Options) | Phase 1 |
| 8 | **MEDIUM** | No input validation (Zod) on API routes | Phase 1 |
| 9 | **MEDIUM** | No 2FA support | Phase 1 (optional) |
| 10 | **MEDIUM** | No session revocation UI | Phase 1 |
| 11 | **MEDIUM** | `ignoreBuildErrors: true` in next.config.ts | Phase 1 |
| 12 | **LOW** | `reactStrictMode: false` (should be true for quality) | Phase 1 |
| 13 | **LOW** | No request IDs for tracing | Phase 1 |

---

## 4. Architectural Debt

| # | Issue | Impact | Phase to Fix |
|---|-------|--------|-------------|
| 1 | Client-side SPA at `/` — no server-rendered public routes | Poor SEO, no metadata, no sitemap | Phase 3 |
| 2 | No Prisma migrations — using `db push --accept-data-loss` | No migration history, risk of data loss | Phase 1 |
| 3 | SQLite in local .env vs PostgreSQL in production | Schema divergence risk | Phase 1 |
| 4 | Ad provider logic hard-coded in ad-renderer.ts | Not extensible to new networks | Phase 8 |
| 5 | Mock analytics data (PageAnalytics) | No real traffic insights | Phase 6 |
| 6 | Mock trust score signals | No real fraud detection | Phase 9 |
| 7 | No tests (unit, integration, E2E) | No quality gate | All phases |
| 8 | No CI/CD pipeline | Manual deployment, no quality gate | Phase 1 |
| 9 | No documentation (/docs) | Hard for new developers | All phases |
| 10 | No pagination on list endpoints | Will break at scale | Phase 3+ |

---

## 5. Recommended Implementation Order

Based on the spec's 15 phases + audit findings:

### Phase 1 — Foundation & Security (HIGHEST PRIORITY)
1. Replace SHA-256 with Argon2id password hashing
2. Add email verification (EmailVerificationToken model)
3. Add password reset (PasswordResetToken model)
4. Add rate limiting (in-memory or @upstash/ratelimit)
5. Add Zod input validation on all API routes
6. Add security headers in next.config.ts
7. Add CSRF protection
8. Switch from `db push` to `prisma migrate dev`
9. Remove `ignoreBuildErrors: true`
10. Add AuditLog model (separate from ModerationEvent)
11. Add FeatureFlag model
12. Add SystemSetting model
13. Add granular Permission model (RBAC)
14. Set up GitHub Actions CI/CD
15. Use Neon PostgreSQL for local dev too (or local Postgres)

### Phase 2 — Creator Identity
1. Add Username model (unique handle, case-insensitive, reserved list)
2. Extend User model (bio, avatar, coverImage, country, timezone, locale)
3. Add creator profile page route (/@username)
4. Add username claiming during onboarding
5. Add profile customization

### Phase 3 — Content Platform
1. Add Post model + API routes
2. Add post editor UI
3. Add SEO metadata to SpecialPage + Post
4. Add sitemap.ts + robots.ts
5. Migrate public routes to server-rendered (SEO)
6. Add pagination to list endpoints

### Phase 4 — Social Network
1. Add Follow model
2. Add Comment + Reply models
3. Add Reaction model (unified engagement)
4. Add SavedContent/Bookmark
5. Add Notification system (3 models)

### Phase 5 — Discovery
1. Add Explore page (server-rendered)
2. Add Search (PostgreSQL full-text or simple ILIKE)
3. Add Trending (weighted scoring model)
4. Add Feed (For You / Following / Trending / Latest)

### Phase 6 — Real Analytics
1. Add AnalyticsEvent model
2. Build event ingestion API
3. Build aggregation pipeline (hourly/daily summaries)
4. Replace mock PageAnalytics with real data
5. Add traffic source attribution
6. Add campaign/referral tracking

### Phase 7 — Grow Center
1. Add actionable insights engine
2. Add creator milestones
3. Add profile completion scoring
4. Add growth recommendations

### Phase 8 — Monetization Enhancement
1. Extract AdProvider interface
2. Modularize Adsterra + Monetag providers
3. Add ad health monitoring
4. Enhance Earn Center documentation

### Phase 9 — Trust & Safety
1. Add ContentReport model
2. Add BlockedUser model
3. Wire real trust score signals
4. Add moderation queues
5. Add copyright/impersonation workflow

### Phase 10–15 — Per spec (themes, i18n, business, performance, security audit, production readiness)

---

## 6. Working Features Summary

The following features are **fully functional** and should be preserved:

- ✅ User registration + login + logout (session-based)
- ✅ Special Page creation + editing + publishing
- ✅ Drag-and-reorder content blocks (7 types)
- ✅ Public page rendering with ad slots
- ✅ AdRenderer generating real Adsterra/Monetag script tags
- ✅ Placement engine with co-display compatibility matrix
- ✅ Platform ad verification lifecycle (test + verify + suspend)
- ✅ Admin console with 10 tabs (full CRUD for campaigns, networks, compatibility, policy, users, pages, integrations, platform-ads, reviews)
- ✅ Trust Score (shadow mode, 5 sub-scores, mock signals)
- ✅ ModerationEvent audit trail
- ✅ Earnings disclaimer gate
- ✅ Collapsible sidebar navigation
- ✅ Confetti celebrations
- ✅ 30+ Framer Motion animations
- ✅ Neon PostgreSQL connection
- ✅ Docker + Vercel deployment configs
- ✅ Beautiful design system (evergreen/gold/berry/cream palette)

---

## 7. Conclusion

Earnova has a **solid foundation** for the ad monetization layer, admin console, and page builder. The primary gaps are:

1. **Security** (Phase 1) — password hashing, email verification, rate limiting, CSRF, headers
2. **Creator identity** (Phase 2) — usernames, profiles
3. **Content/social** (Phases 3-4) — posts, follows, comments, notifications
4. **Discovery** (Phase 5) — explore, search, trending, feed
5. **Real analytics** (Phase 6) — event pipeline replacing mock data
6. **Server-rendered routes** (Phase 3) — for SEO, currently all client-side SPA

The existing ad architecture (AdRenderer, placement engine, verification lifecycle, provider config) is **well-designed and should be preserved** — it needs the provider abstraction refactoring in Phase 8 but the core is sound.

**Recommendation**: Begin Phase 1 (Foundation & Security) immediately. It addresses the most critical issues (SHA-256 hashing, no email verification, no rate limiting, .env committed) and establishes the migration/testing/CI foundation for all subsequent phases.
