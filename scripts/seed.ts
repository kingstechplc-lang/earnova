// Seed: Christmas 2026 flagship campaign + 2 ad networks + compatibility rules
// + platform's own ad-network integration + 2 demo users + 1 sample Special Page.
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function main() {
  console.log('Seeding...')

  // ── Ad Networks ──────────────────────────────────────────────────────
  const adsterra = await db.adNetwork.upsert({
    where: { code: 'adsterra' },
    update: {},
    create: {
      code: 'adsterra',
      displayName: 'Adsterra',
      integrationTypes: JSON.stringify(['SCRIPT', 'DIRECT_LINK', 'BANNER', 'NATIVE', 'PUSH', 'IN_PAGE']),
      requiresSiteVerification: true,
      policyDocUrl: 'https://adsterra.com/blog/set-up-publishers-dashboard/',
      status: 'ACTIVE',
      tcfVendorId: 470,
    },
  })

  const monetag = await db.adNetwork.upsert({
    where: { code: 'monetag' },
    update: {},
    create: {
      code: 'monetag',
      displayName: 'Monetag',
      integrationTypes: JSON.stringify(['SCRIPT', 'DIRECT_LINK', 'IN_PAGE', 'PUSH', 'VIGNETTE', 'MULTITAG']),
      requiresSiteVerification: true,
      policyDocUrl: 'https://help.monetag.com/en/articles/6726312-how-do-i-get-started-as-a-publisher-add-and-verify-your-website-s',
      status: 'ACTIVE',
      tcfVendorId: 1192,
    },
  })

  const platform = await db.adNetwork.upsert({
    where: { code: 'platform' },
    update: {},
    create: {
      code: 'platform',
      displayName: 'Platform (Kingstech)',
      integrationTypes: JSON.stringify(['SCRIPT', 'BANNER']),
      requiresSiteVerification: false,
      status: 'ACTIVE',
    },
  })

  // ── Compatibility Matrix ─────────────────────────────────────────────
  // Allow user networks to coexist with platform (with density caps enforced elsewhere).
  // Allow Adsterra + Monetag coexistence (both networks permit per research).
  // Allow any network to coexist with itself only via density caps (no explicit FORBIDDEN).
  const pairs: [string, string, string][] = [
    ['adsterra', 'monetag', 'ALLOWED'],
    ['adsterra', 'platform', 'ALLOWED_WITH_LIMITS'],
    ['monetag', 'platform', 'ALLOWED_WITH_LIMITS'],
    ['adsterra', 'adsterra', 'ALLOWED_WITH_LIMITS'],
    ['monetag', 'monetag', 'ALLOWED_WITH_LIMITS'],
    ['platform', 'platform', 'ALLOWED_WITH_LIMITS'],
  ]
  for (const [a, b, v] of pairs) {
    const na = await db.adNetwork.findUnique({ where: { code: a } })
    const nb = await db.adNetwork.findUnique({ where: { code: b } })
    if (!na || !nb) continue
    await db.adNetworkCompatibility.upsert({
      where: { networkAId_networkBId: { networkAId: na.id, networkBId: nb.id } },
      update: { verdict: v as any, maxSimultaneousUnits: v === 'ALLOWED' ? null : 2, minVerticalSeparationPx: 200 },
      create: {
        networkAId: na.id,
        networkBId: nb.id,
        verdict: v as any,
        maxSimultaneousUnits: v === 'ALLOWED' ? null : 2,
        minVerticalSeparationPx: 200,
      },
    })
  }

  // ── Placement Policy ─────────────────────────────────────────────────
  await db.adPlacementPolicy.upsert({
    where: { name: 'global' },
    update: {},
    create: { name: 'global' },
  })

  // ── Platform's own ad-network integration (Layer 2) ──────────────────
  // The platform runs its own Adsterra + Monetag publisher accounts.
  // These render platform-managed ad inventory on eligible Special Pages.
  const platformAdsterra = await db.platformAdNetworkIntegration.findFirst({
    where: { adNetworkId: adsterra.id },
  })
  if (!platformAdsterra) {
    await db.platformAdNetworkIntegration.create({
      data: {
        adNetworkId: adsterra.id,
        integrationType: 'BANNER',
        zoneIdentifier: 'PLATFORM_ADSTERRA_BANNER_001',
        scriptReference: 'platform-adsterra-banner-001',  // sanitized key — actual script emitted by Renderer
        isActive: true,
      },
    })
  }
  const platformMonetag = await db.platformAdNetworkIntegration.findFirst({
    where: { adNetworkId: monetag.id },
  })
  if (!platformMonetag) {
    await db.platformAdNetworkIntegration.create({
      data: {
        adNetworkId: monetag.id,
        integrationType: 'IN_PAGE',
        zoneIdentifier: 'PLATFORM_MONETAG_INPAGE_001',
        scriptReference: 'platform-monetag-inpage-001',
        isActive: true,
      },
    })
  }

  // ── Campaigns ────────────────────────────────────────────────────────
  const christmas2026 = await db.campaign.upsert({
    where: { slug: 'christmas-2026' },
    update: {
      // Update dates to ensure campaign is currently active for the demo
      startsAt: new Date('2026-09-01'),
      endsAt: new Date('2027-01-10'),
    },
    create: {
      slug: 'christmas-2026',
      title: 'Christmas 2026',
      description: 'The flagship launch campaign for Global Earning Pages. Users from any country can create a Christmas Special Page, publish content, and optionally monetize via their own Adsterra or Monetag account.',
      startsAt: new Date('2026-09-01'),
      endsAt: new Date('2027-01-10'),
      isActive: true,
      featured: true,
    },
  })

  await db.campaign.upsert({
    where: { slug: 'new-year-2027' },
    update: {},
    create: {
      slug: 'new-year-2027',
      title: 'New Year 2027',
      description: 'Follow-up campaign — carry your audience from Christmas into the new year.',
      startsAt: new Date('2026-12-26'),
      endsAt: new Date('2027-02-01'),
      isActive: false,
      featured: false,
    },
  })

  // ── Demo Users ──────────────────────────────────────────────────────
  const kingsley = await db.user.upsert({
    where: { email: 'kingsley@example.com' },
    update: {},
    create: {
      email: 'kingsley@example.com',
      name: 'Kingsley Owusu',
      passwordHash: hashPassword('demo1234'),
      bio: 'Content creator based in Accra. Building my first Christmas page.',
      locale: 'en',
      role: 'USER',
    },
  })
  const admin = await db.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Platform Admin',
      passwordHash: hashPassword('admin1234'),
      role: 'ADMIN',
      locale: 'en',
    },
  })

  // ── Sample Special Page ─────────────────────────────────────────────
  const existingPage = await db.specialPage.findUnique({ where: { slug: 'kingsley-christmas' } })
  if (!existingPage) {
    const page = await db.specialPage.create({
      data: {
        slug: 'kingsley-christmas',
        title: "Kingsley's Christmas Hub",
        description: 'My personal Christmas page — wishes, photos, and a quiz for visitors.',
        pageType: 'CELEBRATION',
        ownerId: kingsley.id,
        campaignId: christmas2026.id,
        moderationState: 'APPROVED',
        publishedAt: new Date(),
        blocks: {
          create: [
            { type: 'HEADING', data: JSON.stringify({ text: 'Welcome to my Christmas Hub' }), order: 0 },
            { type: 'TEXT', data: JSON.stringify({ text: 'Hey! I\'m Kingsley, and this is my corner of the internet for Christmas 2026. I\'ll be posting my Christmas wishes, photos from the holidays, and a little quiz for anyone who stops by.' }), order: 1 },
            { type: 'IMAGE', data: JSON.stringify({ url: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80', alt: 'Christmas decorations', caption: 'My living room, December 2026' }), order: 2 },
            { type: 'QUOTE', data: JSON.stringify({ text: 'Christmas isn\'t a season. It\'s a feeling.', author: 'Edna Ferber' }), order: 3 },
            { type: 'TEXT', data: JSON.stringify({ text: 'If you enjoy this page, share it with a friend. The more the merrier — that\'s the whole point of Christmas, right?' }), order: 4 },
            { type: 'SOCIAL_LINK', data: JSON.stringify({ platform: 'whatsapp', url: 'https://wa.me/233000000000', label: 'Message me on WhatsApp' }), order: 5 },
          ],
        },
      },
    })

    // Add platform ad placements on this page (Layer 2 inventory)
    await db.adPlacement.createMany({
      data: [
        { pageId: page.id, source: 'PLATFORM_NETWORK', slot: 'HEADER', priority: 10, enabled: true },
        { pageId: page.id, source: 'PLATFORM_NETWORK', slot: 'BEFORE_FOOTER', priority: 90, enabled: true },
      ],
    })

    // Mock analytics for the demo page
    await db.pageAnalytics.create({
      data: {
        pageId: page.id,
        visitors7d: 1245,
        visitors30d: 3876,
        pageViews7d: 2891,
        pageViews30d: 8432,
        uniqueVisitors30d: 6109,
        returningVisitors30d: 1783,
        topCountries: JSON.stringify({ GH: 31, NG: 19, US: 14, UK: 9, KE: 7 }),
        topDevices: JSON.stringify({ mobile: 71, desktop: 22, tablet: 7 }),
        topSources: JSON.stringify({ direct: 38, social: 34, search: 22, referral: 6 }),
      },
    })
  }

  console.log('Seed complete.')
  console.log('  Demo user:  kingsley@example.com / demo1234')
  console.log('  Admin user: admin@example.com / admin1234')
  console.log('  Sample page: /p/kingsley-christmas')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
