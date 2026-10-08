// AI Provider abstraction for Earnova Studio content generation.
//
// Per spec section 71 (EARNOVA STUDIO) + section 117 (NO FEATURE BLOAT):
//   The studio must support future AI integration for content creation.
//
// This module defines the AIProvider interface + a stub provider that
// returns template-based suggestions. In the future, real AI providers
// (OpenAI, Anthropic, Gemini, etc.) can be added by implementing this
// interface + registering them in the provider registry.
//
// The architecture is provider-agnostic — the studio UI calls
// `generateStudioContent(type, prompt)` without knowing which AI
// backend is being used. This allows swapping providers without
// changing any UI code.

import type { StudioProjectType } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIGenerateRequest = {
  type: StudioProjectType
  prompt: string              // user's natural language prompt
  context?: {                 // optional context to improve generation
    recipient?: string        // for greeting cards
    occasion?: string         // "christmas", "birthday", etc.
    tone?: string             // "formal", "casual", "funny", "heartfelt"
    language?: string         // "en", "fr", "es", etc.
  }
}

export type AIGenerateResponse = {
  // The generated structured content data — matches the project type's data shape
  data: Record<string, any>
  // A suggested title for the project
  suggestedTitle: string
  // The AI provider that generated this (for attribution + audit)
  provider: string
  // Whether this was actually AI-generated or a stub/template
  isStub: boolean
}

// ─── Provider Interface ─────────────────────────────────────────────────────

export interface AIProvider {
  name: string
  isAvailable: boolean

  /**
   * Generate studio content based on a natural language prompt.
   * Returns structured data matching the project type's expected shape.
   */
  generateStudioContent(req: AIGenerateRequest): Promise<AIGenerateResponse>
}

// ─── Stub Provider ──────────────────────────────────────────────────────────
//
// The stub provider returns pre-written template content based on the project
// type + prompt keywords. This lets the studio UI work immediately without
// requiring an API key for a real AI provider.
//
// When a real AI provider is configured (via env vars like OPENAI_API_KEY),
// the registry will use it instead of this stub.

class StubAIProvider implements AIProvider {
  name = 'stub'
  isAvailable = true

  async generateStudioContent(req: AIGenerateRequest): Promise<AIGenerateResponse> {
    // Simulate AI latency for realistic UX (300-800ms)
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500))

    const { type, prompt, context } = req
    const lowerPrompt = prompt.toLowerCase()

    // Generate content based on project type + prompt keywords
    switch (type) {
      case 'GREETING_CARD':
      case 'SOCIAL_CARD':
      case 'BIRTHDAY_WISH':
      case 'CHRISTMAS_WISH':
        return this.generateGreeting(type, prompt, context)

      case 'QUOTE':
        return this.generateQuote(prompt, context)

      case 'POSTER':
      case 'ANNOUNCEMENT':
        return this.generatePoster(type, prompt, context)

      case 'QUIZ':
        return this.generateQuiz(prompt, context)

      case 'POLL':
        return this.generatePoll(prompt, context)

      case 'COUNTDOWN':
        return this.generateCountdown(prompt, context)

      case 'INVITATION':
      case 'EVENT_PAGE':
        return this.generateInvitation(type, prompt, context)

      default:
        return {
          data: { message: prompt },
          suggestedTitle: prompt.slice(0, 60),
          provider: this.name,
          isStub: true,
        }
    }
  }

  private generateGreeting(type: StudioProjectType, prompt: string, context?: any): AIGenerateResponse {
    const isChristmas = type === 'CHRISTMAS_WISH' || /christmas|xmas|holiday|festive/i.test(prompt)
    const isBirthday = type === 'BIRTHDAY_WISH' || /birthday|bday/i.test(prompt)
    const recipient = context?.recipient || (isChristmas ? 'Friend' : isBirthday ? 'Dear' : 'Hello')

    let message = ''
    if (isChristmas) {
      const messages = [
        `Wishing you a magical Christmas filled with joy, laughter, and unforgettable moments. May this season bring warmth to your heart and peace to your home. 🎄✨`,
        `Merry Christmas! May your day be as wonderful as you are. Sending you love, joy, and holiday cheer from across the miles. 🎅🎁`,
        `This Christmas, I'm grateful for you. May the magic of the season fill your heart with happiness and your home with love. 🌟❄️`,
      ]
      message = messages[Math.floor(Math.random() * messages.length)]
    } else if (isBirthday) {
      const messages = [
        `Happy Birthday! 🎂 May this year bring you everything you've been dreaming of and more. You deserve all the happiness in the world!`,
        `Another year wiser, another year brighter! Wishing you a birthday as amazing as you are. Here's to making incredible memories! 🎉`,
        `On your special day, I want you to know how much you mean to me. Happy Birthday — may your day be filled with love, laughter, and cake! 🎈`,
      ]
      message = messages[Math.floor(Math.random() * messages.length)]
    } else {
      const messages = [
        `Thinking of you and sending warm wishes your way. Hope this message brings a smile to your face! 😊`,
        `Just wanted to reach out and say hello. You've been on my mind, and I hope you're doing wonderfully. 💫`,
        `A little note to brighten your day — you're amazing, and I hope you know it! ✨`,
      ]
      message = messages[Math.floor(Math.random() * messages.length)]
    }

    // If the user provided a specific prompt, incorporate it
    if (prompt.length > 10 && !isChristmas && !isBirthday) {
      message = `${message}\n\n${prompt}`
    }

    const styles = ['classic', 'modern', 'festive', 'minimal', 'vibrant']
    const layouts = ['centered', 'left-align', 'split', 'fullbleed']

    return {
      data: {
        recipient,
        message,
        backgroundImage: isChristmas ? 'christmas-snow' : isBirthday ? 'birthday-balloons' : 'gradient-warm',
        layout: layouts[Math.floor(Math.random() * layouts.length)],
        style: styles[Math.floor(Math.random() * styles.length)],
        fontSize: 'large',
        textColor: '#ffffff',
        accentColor: isChristmas ? '#c89b3c' : isBirthday ? '#e91e63' : '#0f4c3a',
      },
      suggestedTitle: isChristmas ? `Christmas Card for ${recipient}` : isBirthday ? `Birthday Card for ${recipient}` : `Greeting Card for ${recipient}`,
      provider: this.name,
      isStub: true,
    }
  }

  private generateQuote(prompt: string, _context?: any): AIGenerateResponse {
    const quoteTemplates = [
      { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
      { text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
      { text: 'Be the change you wish to see in the world.', author: 'Mahatma Gandhi' },
      { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
      { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
      { text: 'Creativity is intelligence having fun.', author: 'Albert Einstein' },
      { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
      { text: 'Your limitation—it’s only your imagination.', author: 'Unknown' },
    ]

    // Try to match prompt keywords
    let selected = quoteTemplates[Math.floor(Math.random() * quoteTemplates.length)]

    // If user typed a specific topic, generate a relevant quote
    if (/success|achieve/i.test(prompt)) {
      selected = { text: 'Success is walking from failure to failure with no loss of enthusiasm.', author: 'Winston Churchill' }
    } else if (/love|heart/i.test(prompt)) {
      selected = { text: 'Where there is love there is life.', author: 'Mahatma Gandhi' }
    } else if (/dream|future/i.test(prompt)) {
      selected = { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' }
    }

    const styles = ['minimal', 'gradient', 'bold', 'elegant', 'dark']

    return {
      data: {
        text: selected.text,
        author: selected.author,
        style: styles[Math.floor(Math.random() * styles.length)],
        backgroundImage: 'gradient-mountain',
        fontSize: 'xlarge',
        textColor: '#ffffff',
      },
      suggestedTitle: `Quote: ${selected.text.slice(0, 40)}...`,
      provider: this.name,
      isStub: true,
    }
  }

  private generatePoster(type: StudioProjectType, prompt: string, _context?: any): AIGenerateResponse {
    const styles = ['modern', 'retro', 'minimal', 'bold', 'gradient']
    const layouts = ['centered', 'top-heavy', 'bottom-heavy', 'split']

    return {
      data: {
        title: prompt.slice(0, 60) || 'Your Event Title',
        subtitle: 'Join us for an unforgettable experience',
        description: 'Add more details about your event here. This is where you tell people what to expect.',
        backgroundImage: 'gradient-vibrant',
        layout: layouts[Math.floor(Math.random() * layouts.length)],
        style: styles[Math.floor(Math.random() * styles.length)],
        accentColor: '#c89b3c',
        textColor: '#ffffff',
      },
      suggestedTitle: type === 'ANNOUNCEMENT' ? `Announcement: ${prompt.slice(0, 40)}` : `Poster: ${prompt.slice(0, 40)}`,
      provider: this.name,
      isStub: true,
    }
  }

  private generateQuiz(prompt: string, _context?: any): AIGenerateResponse {
    // Generate 3 questions based on the prompt topic
    const topic = prompt.slice(0, 40) || 'General Knowledge'

    return {
      data: {
        title: `${topic} Quiz`,
        description: `Test your knowledge about ${topic.toLowerCase()}!`,
        questions: [
          {
            question: `What is the most important aspect of ${topic.toLowerCase()}?`,
            options: ['Understanding the basics', 'Advanced techniques', 'Practical application', 'Theory'],
            correctIndex: 0,
            explanation: 'Understanding the basics is always the foundation of any subject.',
          },
          {
            question: `Which approach works best for learning about ${topic.toLowerCase()}?`,
            options: ['Reading only', 'Practice + theory', 'Watching videos only', 'Memorization'],
            correctIndex: 1,
            explanation: 'Combining practice with theory gives the best results.',
          },
          {
            question: `How can you improve your knowledge of ${topic.toLowerCase()}?`,
            options: ['Consistent practice', 'Waiting for inspiration', 'Avoiding challenges', 'Giving up easily'],
            correctIndex: 0,
            explanation: 'Consistent practice is key to mastery.',
          },
        ],
        style: 'interactive',
      },
      suggestedTitle: `${topic} Quiz`,
      provider: this.name,
      isStub: true,
    }
  }

  private generatePoll(prompt: string, _context?: any): AIGenerateResponse {
    const question = prompt.length > 10 ? prompt.slice(0, 100) : 'What would you like to know?'

    return {
      data: {
        question,
        options: [
          { text: 'Option A', votes: 0 },
          { text: 'Option B', votes: 0 },
          { text: 'Option C', votes: 0 },
          { text: 'Option D', votes: 0 },
        ],
        style: 'bar',
        allowMultiple: false,
      },
      suggestedTitle: `Poll: ${question.slice(0, 40)}`,
      provider: this.name,
      isStub: true,
    }
  }

  private generateCountdown(prompt: string, _context?: any): AIGenerateResponse {
    // Default to 7 days from now
    const target = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Try to parse "christmas" or specific dates from prompt
    if (/christmas|xmas/i.test(prompt)) {
      target.setMonth(11) // December
      target.setDate(25)
    }

    const styles = ['minimal', 'festive', 'dark', 'gradient', 'neon']

    return {
      data: {
        targetDate: target.toISOString(),
        title: prompt.slice(0, 60) || 'Countdown',
        subtitle: 'Something exciting is coming!',
        style: styles[Math.floor(Math.random() * styles.length)],
        showDays: true,
        showHours: true,
        showMinutes: true,
        showSeconds: true,
      },
      suggestedTitle: `Countdown: ${prompt.slice(0, 40)}`,
      provider: this.name,
      isStub: true,
    }
  }

  private generateInvitation(type: StudioProjectType, prompt: string, _context?: any): AIGenerateResponse {
    const styles = ['elegant', 'modern', 'festive', 'minimal', 'bold']
    const date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks from now

    return {
      data: {
        title: prompt.slice(0, 60) || "You're Invited!",
        subtitle: 'Join us for a special occasion',
        eventDate: date.toISOString(),
        location: 'Location to be announced',
        description: 'We would be delighted to have you join us for this special event. More details coming soon.',
        backgroundImage: 'gradient-elegant',
        style: styles[Math.floor(Math.random() * styles.length)],
        accentColor: '#c89b3c',
        textColor: '#ffffff',
        rsvpEnabled: true,
      },
      suggestedTitle: type === 'EVENT_PAGE' ? `Event: ${prompt.slice(0, 40)}` : `Invitation: ${prompt.slice(0, 40)}`,
      provider: this.name,
      isStub: true,
    }
  }
}

// ─── Provider Registry ───────────────────────────────────────────────────────

let activeProvider: AIProvider | null = null

/**
 * Get the active AI provider. If no real provider is configured (no API keys
 * in env), falls back to the stub provider.
 *
 * Future: check OPENAI_API_KEY, ANTHROPIC_API_KEY, etc. and use the
 * first available real provider.
 */
export function getAIProvider(): AIProvider {
  if (activeProvider) return activeProvider

  // Future: check for real AI providers
  // if (process.env.OPENAI_API_KEY) {
  //   activeProvider = new OpenAIProvider()
  // } else if (process.env.ANTHROPIC_API_KEY) {
  //   activeProvider = new AnthropicProvider()
  // } else {
  //   activeProvider = new StubAIProvider()
  // }

  activeProvider = new StubAIProvider()
  return activeProvider
}

/**
 * Check if AI generation is available (always true with stub provider).
 * In production, this would check if a real AI provider is configured.
 */
export function isAIAvailable(): boolean {
  return getAIProvider().isAvailable
}
