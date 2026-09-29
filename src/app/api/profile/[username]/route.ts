// /api/profile/[username]
// GET — public creator profile by username (with pages + stats)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeUsername, calculateProfileCompletion } from '@/lib/username'

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const normalized = normalizeUsername(username)

  const user = await db.user.findUnique({
    where: { usernameLower: normalized },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      image: true,
      coverImage: true,
      country: true,
      website: true,
      interests: true,
      profileVisibility: true,
      createdAt: true,
      socialLinks: { orderBy: { sortOrder: 'asc' } },
      pages: {
        where: {
          publishedAt: { not: null },
          moderationState: { notIn: ['BANNED', 'SUSPENDED'] },
        },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          pageType: true,
          publishedAt: true,
          campaign: { select: { id: true, title: true } },
          _count: { select: { blocks: true } },
        },
        orderBy: { publishedAt: 'desc' },
      },
      _count: {
        select: { pages: true },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  }

  if (user.profileVisibility === 'PRIVATE') {
    return NextResponse.json({ error: 'This profile is private' }, { status: 403 })
  }

  // Record profile view (fire-and-forget)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || null
  db.profileView.create({
    data: {
      profileOwnerId: user.id,
      source: 'direct',
      country: null, // could be derived from GeoIP
    },
  }).catch(() => {})

  const profileCompletion = calculateProfileCompletion({
    username: user.username,
    name: user.name,
    bio: user.bio,
    image: user.image,
    coverImage: user.coverImage,
    country: user.country,
    website: user.website,
    interests: user.interests,
  })

  return NextResponse.json({
    profile: {
      id: user.id,
      name: user.name,
      username: user.username,
      bio: user.bio,
      image: user.image,
      coverImage: user.coverImage,
      country: user.country,
      website: user.website,
      interests: user.interests ? JSON.parse(user.interests) : [],
      joinedAt: user.createdAt,
      profileCompletion,
      socialLinks: user.socialLinks,
      pages: user.pages,
      stats: {
        totalPages: user._count.pages,
      },
    },
  })
}
