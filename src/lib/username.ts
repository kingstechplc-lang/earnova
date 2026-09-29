// Username validation + reserved words + profanity filter
// Used by the username claiming API to ensure safe, unique handles

// Reserved usernames that cannot be claimed by users
export const RESERVED_USERNAMES = [
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'api',
  'login', 'signup', 'register', 'settings', 'security', 'account',
  'explore', 'search', 'trending', 'monetization', 'earn', 'earning',
  'official', 'staff', 'team', 'moderator', 'mod', 'superadmin',
  'earnova', 'platform', 'creator', 'pages', 'posts', 'feed',
  'notifications', 'profile', 'dashboard', 'analytics', 'campaign',
  'campaigns', 'help', 'about', 'contact', 'privacy', 'terms',
  'legal', 'cookies', 'policy', 'guidelines', 'community',
  'verify', 'verification', 'reset', 'password', 'email',
  'public', 'private', 'blocked', 'muted', 'reported',
  'beta', 'test', 'dev', 'staging', 'production',
  'www', 'app', 'web', 'mobile', 'ios', 'android',
  'ads', 'adsterra', 'monetag', 'advertising',
  'business', 'organization', 'org', 'company',
  'pro', 'premium', 'free', 'trial',
  'new', 'latest', 'popular', 'trending', 'featured',
  'anonymous', 'guest', 'visitor', 'user', 'users',
  'follow', 'followers', 'following',
  'like', 'comment', 'share', 'save', 'bookmark',
  'post', 'page', 'block', 'content', 'media',
  'tag', 'topic', 'category', 'label',
]

// Basic profanity filter — extend with a proper word list in production
const PROFANITY_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'dick', 'pussy', 'cunt', 'nigger',
  'faggot', 'retard', 'whore', 'slut', 'bastard', 'damn', 'crap',
  'piss', 'hell', 'asshole', 'douche', 'cock', 'prick',
]

export type UsernameValidation = {
  valid: boolean
  error?: string
  suggestions?: string[]
}

export function validateUsername(username: string): UsernameValidation {
  // Length check
  if (!username || username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters.' }
  }
  if (username.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or fewer.' }
  }

  // Character check: only lowercase letters, numbers, underscores, hyphens
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return {
      valid: false,
      error: 'Username can only contain lowercase letters, numbers, underscores, and hyphens.',
    }
  }

  // Must start with a letter or number (not _ or -)
  if (!/^[a-z0-9]/.test(username)) {
    return { valid: false, error: 'Username must start with a letter or number.' }
  }

  // Must not end with _ or -
  if (/[_-]$/.test(username)) {
    return { valid: false, error: 'Username must end with a letter or number.' }
  }

  // No consecutive _ or -
  if (/[_-]{2,}/.test(username)) {
    return { valid: false, error: 'Username cannot have consecutive underscores or hyphens.' }
  }

  // Reserved check
  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return { valid: false, error: 'This username is reserved and cannot be claimed.' }
  }

  // Profanity check
  const lower = username.toLowerCase()
  for (const word of PROFANITY_WORDS) {
    if (lower.includes(word)) {
      return { valid: false, error: 'Username contains inappropriate language.' }
    }
  }

  return { valid: true }
}

export function generateUsernameSuggestions(base: string): string[] {
  const clean = base.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)
  if (!clean) return []
  const suggestions: string[] = []
  const suffixes = ['', '_1', '_2', '123', '_official', '_real', '0', '99']
  for (const suffix of suffixes) {
    const candidate = clean + suffix
    if (candidate.length >= 3 && candidate.length <= 20) {
      suggestions.push(candidate)
    }
  }
  return suggestions.slice(0, 5)
}

// Normalize username for case-insensitive uniqueness
export function normalizeUsername(username: string): string {
  return username.toLowerCase().trim()
}

// Calculate profile completion percentage (0-100)
export function calculateProfileCompletion(user: {
  username?: string | null
  name?: string | null
  bio?: string | null
  image?: string | null
  coverImage?: string | null
  country?: string | null
  website?: string | null
  interests?: string | null
}): number {
  const fields = [
    user.username,
    user.name,
    user.bio,
    user.image,
    user.coverImage,
    user.country,
    user.website,
    user.interests,
  ]
  const filled = fields.filter(f => f && f.trim().length > 0).length
  return Math.round((filled / fields.length) * 100)
}
