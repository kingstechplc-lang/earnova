// /api/profile/me
// GET — current user's full profile data (for editing)
// PATCH — update current user's profile (name, bio, image, coverImage, country, etc.)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, auditLog } from '@/lib/auth'
import { validateUsername, normalizeUsername } from '@/lib/username'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      usernameLower: true,
      bio: true,
      image: true,
      coverImage: true,
      country: true,
      timezone: true,
      locale: true,
      website: true,
      interests: true,
      profileVisibility: true,
      emailVerified: true,
      role: true,
      createdAt: true,
      socialLinks: { orderBy: { sortOrder: 'asc' } },
      _count: {
        select: { pages: true },
      },
    },
  })

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    profile: {
      ...profile,
      interests: profile.interests ? JSON.parse(profile.interests) : [],
    },
  })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    name, bio, image, coverImage, country, timezone, locale,
    website, interests, profileVisibility, socialLinks,
  } = body as {
    name?: string | null
    bio?: string | null
    image?: string | null
    coverImage?: string | null
    country?: string | null
    timezone?: string
    locale?: string
    website?: string | null
    interests?: string[]
    profileVisibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
    socialLinks?: Array<{ platform: string; url: string; label?: string }>
  }

  // Build update data
  const data: any = {}
  if (name !== undefined) data.name = name?.trim() || null
  if (bio !== undefined) data.bio = bio?.trim() || null
  if (image !== undefined) data.image = image || null
  if (coverImage !== undefined) data.coverImage = coverImage || null
  if (country !== undefined) data.country = country || null
  if (timezone !== undefined) data.timezone = timezone
  if (locale !== undefined) data.locale = locale
  if (website !== undefined) data.website = website || null
  if (interests !== undefined) data.interests = JSON.stringify(interests)
  if (profileVisibility !== undefined) data.profileVisibility = profileVisibility

  // Update profile
  const updated = await db.user.update({
    where: { id: user.id },
    data,
    select: {
      id: true, name: true, username: true, bio: true, image: true,
      coverImage: true, country: true, timezone: true, locale: true,
      website: true, interests: true, profileVisibility: true,
    },
  })

  // Update social links if provided
  if (socialLinks !== undefined) {
    // Delete existing
    await db.socialLink.deleteMany({ where: { userId: user.id } })
    // Create new
    if (socialLinks.length > 0) {
      await db.socialLink.createMany({
        data: socialLinks.map((sl, i) => ({
          userId: user.id,
          platform: sl.platform,
          url: sl.url,
          label: sl.label || null,
          sortOrder: i,
        })),
      })
    }
  }

  // Audit log
  await auditLog({
    actorId: user.id,
    action: 'user.profile_updated',
    resource: `user:${user.id}`,
    newState: data,
  })

  return NextResponse.json({
    profile: {
      ...updated,
      interests: updated.interests ? JSON.parse(updated.interests) : [],
    },
  })
}
