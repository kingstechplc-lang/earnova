// POST /api/studio/ai/generate — generate studio content using AI
//
// Per spec section 71: the studio must support future AI integration.
// This endpoint uses the AI provider abstraction (src/lib/ai/index.ts)
// which currently uses a stub provider but can be swapped for real AI
// providers (OpenAI, Anthropic, etc.) without changing any UI code.
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getAIProvider, type AIGenerateRequest } from '@/lib/ai'
import type { StudioProjectType } from '@prisma/client'

const VALID_TYPES: StudioProjectType[] = [
  'GREETING_CARD', 'SOCIAL_CARD', 'BIRTHDAY_WISH', 'CHRISTMAS_WISH',
  'QUOTE', 'POSTER', 'ANNOUNCEMENT', 'QUIZ', 'POLL', 'COUNTDOWN',
  'INVITATION', 'EVENT_PAGE',
]

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, prompt, context } = body as {
    type: string
    prompt: string
    context?: {
      recipient?: string
      occasion?: string
      tone?: string
      language?: string
    }
  }

  if (!type || !VALID_TYPES.includes(type as StudioProjectType)) {
    return NextResponse.json({ error: 'Invalid project type' }, { status: 400 })
  }
  if (!prompt || prompt.trim().length < 2) {
    return NextResponse.json({ error: 'Prompt must be at least 2 characters' }, { status: 400 })
  }

  const provider = getAIProvider()

  const request: AIGenerateRequest = {
    type: type as StudioProjectType,
    prompt: prompt.trim(),
    context,
  }

  try {
    const response = await provider.generateStudioContent(request)
    return NextResponse.json(response)
  } catch (err) {
    console.error('[studio/ai] Generation failed:', err)
    return NextResponse.json(
      { error: 'AI generation failed. Please try again.' },
      { status: 500 }
    )
  }
}
