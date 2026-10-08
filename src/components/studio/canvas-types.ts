// Canvas element types + helpers for the Earnova Studio canvas editor.
//
// Each canvas project stores an array of elements (text, shapes, stickers,
// images) positioned on a canvas. Elements are absolutely positioned divs
// with drag/resize/rotate handles.

export type ElementType = 'TEXT' | 'SHAPE' | 'STICKER' | 'IMAGE'

export type ShapeType = 'rect' | 'circle' | 'triangle' | 'line'

export type CanvasElement = {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  zIndex: number
  locked: boolean
  visible: boolean
  // TEXT properties
  text?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  fontStyle?: string
  textDecoration?: string
  color?: string
  textAlign?: 'left' | 'center' | 'right'
  lineHeight?: number
  letterSpacing?: number
  textShadow?: string
  backgroundColor?: string
  padding?: number
  borderRadius?: number
  // SHAPE properties
  shape?: ShapeType
  fill?: string
  borderColor?: string
  borderWidth?: number
  // STICKER properties
  emoji?: string
  // IMAGE properties
  src?: string
  objectFit?: 'cover' | 'contain' | 'fill'
  // SHADOW
  boxShadow?: string
}

export type CanvasData = {
  canvas: {
    width: number
    height: number
    background: string // gradient name or hex color
    backgroundType: 'gradient' | 'solid' | 'image'
  }
  elements: CanvasElement[]
}

export type CanvasPreset = {
  id: string
  name: string
  width: number
  height: number
  icon: string
  description: string
}

// Social media canvas presets
export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'square',       name: 'Square (1:1)',       width: 1080, height: 1080, icon: '⬜', description: 'Instagram post, Facebook post' },
  { id: 'story',        name: 'Story (9:16)',       width: 1080, height: 1920, icon: '📱', description: 'Instagram Story, TikTok, Snapchat' },
  { id: 'landscape',    name: 'Landscape (16:9)',    width: 1920, height: 1080, icon: '🖥️', description: 'YouTube thumbnail, Twitter header' },
  { id: 'portrait',     name: 'Portrait (4:5)',      width: 1080, height: 1350, icon: '🖼️', description: 'Instagram portrait post' },
  { id: 'twitter-card', name: 'Twitter Card',         width: 1200, height: 628,  icon: '🐦', description: 'Twitter/X link card' },
  { id: 'a4-portrait',  name: 'A4 Portrait',          width: 794,  height: 1123, icon: '📄', description: 'Print-ready A4 document' },
  { id: 'logo',         name: 'Logo (512×512)',       width: 512,  height: 512,  icon: '🎨', description: 'Logo / icon design' },
  { id: 'banner',       name: 'Web Banner',            width: 1500, height: 500,  icon: '📊', description: 'Website hero banner' },
]

// Background gradient presets
export const BACKGROUND_GRADIENTS: Record<string, string> = {
  'evergreen-gold': 'linear-gradient(135deg, #0f4c3a 0%, #c89b3c 100%)',
  'berry-sunset': 'linear-gradient(135deg, #b8345d 0%, #d97706 50%, #dc2626 100%)',
  'ocean-deep': 'linear-gradient(135deg, #0d0d0d 0%, #0891b2 50%, #2563eb 100%)',
  'purple-haze': 'linear-gradient(135deg, #2d1b4e 0%, #7c3aed 50%, #c026d3 100%)',
  'neon-glow': 'linear-gradient(135deg, #0a0a0a 0%, #00ff88 50%, #ff00ff 100%)',
  'warm-sunset': 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)',
  'forest-mist': 'linear-gradient(135deg, #0f4c3a 0%, #8b9d77 100%)',
  'royal-blue': 'linear-gradient(135deg, #1a5276 0%, #2563eb 100%)',
  'dark-elegant': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  'christmas-warm': 'linear-gradient(135deg, #0f4c3a 0%, #c89b3c 50%, #d63d24 100%)',
  'pink-bloom': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'fresh-mint': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'solid-white': '#ffffff',
  'solid-black': '#000000',
  'solid-evergreen': '#0f4c3a',
  'solid-cream': '#faf8f3',
}

// Font family presets
export const FONT_FAMILIES = [
  { label: 'Sans', value: 'var(--font-sans)' },
  { label: 'Serif', value: 'var(--font-serif)' },
  { label: 'Mono', value: 'var(--font-mono)' },
  { label: 'Playfair', value: '"Playfair Display", serif' },
  { label: 'Inter', value: '"Inter", sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier', value: '"Courier New", monospace' },
]

// Sticker emoji presets
export const STICKER_EMOJIS = [
  '🎄', '🎅', '⛄', '🎁', '⭐', '❄️', '🔔', '🕯️',
  '🎉', '🎊', '🎈', '🎂', '🍰', '🥳', '👏', '💪',
  '❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔',
  '✨', '🌟', '💫', '🔥', '⚡', '🌈', '☀️', '🌙',
  '📸', '🎵', '🎮', '💻', '🎨', '✏️', '📖', '📝',
  '🌍', '✈️', '🚗', '🏠', '💼', '🏆', '👑', '💎',
  '👍', '🙌', '🤝', '👋', '💯', '✅', '❌', '⚠️',
  '😀', '😍', '🤔', '😎', '🥰', '😭', '😡', '😴',
]

// Shape presets
export const SHAPES: Array<{ type: ShapeType; icon: string; label: string }> = [
  { type: 'rect', icon: '⬜', label: 'Rectangle' },
  { type: 'circle', icon: '⚪', label: 'Circle' },
  { type: 'triangle', icon: '🔺', label: 'Triangle' },
  { type: 'line', icon: '➖', label: 'Line' },
]

// Generate a unique element ID
export function genElementId(): string {
  return 'el-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
}

// Create a default text element
export function createTextElement(text: string = 'Your text here', x = 100, y = 100): CanvasElement {
  return {
    id: genElementId(),
    type: 'TEXT',
    x, y,
    width: 400,
    height: 60,
    rotation: 0,
    opacity: 1,
    zIndex: 10,
    locked: false,
    visible: true,
    text,
    fontSize: 32,
    fontFamily: 'var(--font-serif)',
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 1.4,
    letterSpacing: 0,
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
    padding: 8,
    borderRadius: 0,
  }
}

// Create a default shape element
export function createShapeElement(shape: ShapeType, x = 100, y = 100): CanvasElement {
  const isLine = shape === 'line'
  return {
    id: genElementId(),
    type: 'SHAPE',
    shape,
    x, y,
    width: isLine ? 300 : 200,
    height: isLine ? 4 : 200,
    rotation: 0,
    opacity: 0.8,
    zIndex: 5,
    locked: false,
    visible: true,
    fill: shape === 'line' ? '#c89b3c' : 'transparent',
    borderColor: '#c89b3c',
    borderWidth: 3,
    borderRadius: shape === 'rect' ? 12 : 0,
  }
}

// Create a sticker element
export function createStickerElement(emoji: string, x = 100, y = 100): CanvasElement {
  return {
    id: genElementId(),
    type: 'STICKER',
    x, y,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    zIndex: 8,
    locked: false,
    visible: true,
    emoji,
    fontSize: 72,
  }
}

// Create an image element
export function createImageElement(src: string, x = 100, y = 100): CanvasElement {
  return {
    id: genElementId(),
    type: 'IMAGE',
    x, y,
    width: 300,
    height: 300,
    rotation: 0,
    opacity: 1,
    zIndex: 3,
    locked: false,
    visible: true,
    src,
    objectFit: 'cover',
    borderRadius: 12,
  }
}

// Default empty canvas
export function createDefaultCanvas(preset: CanvasPreset): CanvasData {
  return {
    canvas: {
      width: preset.width,
      height: preset.height,
      background: 'evergreen-gold',
      backgroundType: 'gradient',
    },
    elements: [],
  }
}

// Pre-designed canvas templates (element arrays)
export const CANVAS_TEMPLATES: Array<{
  id: string
  name: string
  presetId: string
  background: string
  icon: string
  description: string
  elements: CanvasElement[]
}> = [
  {
    id: 'christmas-greeting',
    name: 'Christmas Greeting',
    presetId: 'square',
    background: 'christmas-warm',
    icon: '🎄',
    description: 'Festive Christmas greeting card',
    elements: [
      { ...createStickerElement('🎄', 440, 100), width: 200, height: 200, fontSize: 160 },
      { ...createTextElement('Merry Christmas!', 240, 380), width: 600, height: 80, fontSize: 56, color: '#ffffff', textShadow: '0 3px 10px rgba(0,0,0,0.5)' },
      { ...createTextElement('Wishing you joy and peace', 290, 480), width: 500, height: 40, fontSize: 24, fontWeight: 'normal', color: '#fef3c7' },
      { ...createStickerElement('🎁', 200, 600), fontSize: 80 },
      { ...createStickerElement('⭐', 780, 200), fontSize: 60 },
      { ...createStickerElement('❄️', 150, 300), fontSize: 50 },
      { ...createStickerElement('❄️', 850, 500), fontSize: 50 },
    ],
  },
  {
    id: 'birthday-card',
    name: 'Birthday Card',
    presetId: 'square',
    background: 'pink-bloom',
    icon: '🎂',
    description: 'Colorful birthday celebration card',
    elements: [
      { ...createStickerElement('🎂', 440, 120), width: 200, height: 200, fontSize: 140 },
      { ...createTextElement('Happy Birthday!', 240, 380), width: 600, height: 80, fontSize: 52, color: '#ffffff', textShadow: '0 3px 10px rgba(0,0,0,0.4)' },
      { ...createTextElement('May your day be amazing!', 290, 480), width: 500, height: 40, fontSize: 24, fontWeight: 'normal', color: '#fce7f3' },
      { ...createStickerElement('🎈', 180, 500), fontSize: 80 },
      { ...createStickerElement('🎈', 800, 500), fontSize: 80 },
      { ...createStickerElement('🎉', 500, 600), fontSize: 70 },
    ],
  },
  {
    id: 'motivational-quote',
    name: 'Motivational Quote',
    presetId: 'square',
    background: 'dark-elegant',
    icon: '💫',
    description: 'Inspirational quote on dark background',
    elements: [
      { ...createTextElement('"The only way to do great work is to love what you do."', 140, 350), width: 800, height: 200, fontSize: 42, fontWeight: 'bold', color: '#ffffff', lineHeight: 1.5, textShadow: '0 2px 8px rgba(0,0,0,0.5)' },
      { ...createTextElement('— Steve Jobs', 440, 600), width: 200, height: 40, fontSize: 24, fontWeight: 'normal', color: '#c89b3c' },
      { ...createStickerElement('✨', 100, 100), fontSize: 60 },
      { ...createStickerElement('✨', 900, 800), fontSize: 60 },
    ],
  },
  {
    id: 'event-invitation',
    name: 'Event Invitation',
    presetId: 'square',
    background: 'royal-blue',
    icon: '💌',
    description: 'Elegant event invitation',
    elements: [
      { ...createShapeElement('rect', 100, 100), width: 880, height: 880, fill: 'transparent', borderColor: '#c89b3c', borderWidth: 4, borderRadius: 20, opacity: 0.6 },
      { ...createTextElement("You're Invited!", 290, 200), width: 500, height: 60, fontSize: 44, color: '#ffffff' },
      { ...createTextElement('Join us for a special occasion', 290, 300), width: 500, height: 40, fontSize: 24, fontWeight: 'normal', color: '#bfdbfe' },
      { ...createTextElement('📅 December 25, 2026', 340, 500), width: 400, height: 40, fontSize: 28, color: '#c89b3c' },
      { ...createTextElement('📍 Grand Hall, Accra', 340, 560), width: 400, height: 40, fontSize: 28, color: '#c89b3c' },
      { ...createStickerElement('🎉', 490, 700), fontSize: 80 },
    ],
  },
  {
    id: 'social-promo',
    name: 'Social Promo',
    presetId: 'square',
    background: 'neon-glow',
    icon: '🚀',
    description: 'Eye-catching social media promo',
    elements: [
      { ...createTextElement('50% OFF', 240, 200), width: 600, height: 100, fontSize: 80, fontWeight: 'bold', color: '#00ff88', textShadow: '0 0 20px rgba(0,255,136,0.5)' },
      { ...createTextElement('Limited time offer', 340, 350), width: 400, height: 40, fontSize: 28, fontWeight: 'normal', color: '#ff00ff' },
      { ...createStickerElement('🚀', 490, 500), fontSize: 100 },
      { ...createTextElement('Shop Now', 390, 700), width: 300, height: 50, fontSize: 32, color: '#ffffff', backgroundColor: 'rgba(0,255,136,0.2)', borderRadius: 25, padding: 12 },
    ],
  },
  {
    id: 'new-year',
    name: 'New Year Card',
    presetId: 'square',
    background: 'purple-haze',
    icon: '🎆',
    description: 'Celebratory New Year card',
    elements: [
      { ...createTextElement('2027', 340, 200), width: 400, height: 120, fontSize: 100, fontWeight: 'bold', color: '#ffffff', textShadow: '0 0 30px rgba(192,38,211,0.8)' },
      { ...createTextElement('Happy New Year!', 290, 380), width: 500, height: 60, fontSize: 44, color: '#f3e8ff' },
      { ...createTextElement('New beginnings, new dreams', 290, 460), width: 500, height: 40, fontSize: 24, fontWeight: 'normal', color: '#c084fc' },
      { ...createStickerElement('🎆', 200, 600), fontSize: 80 },
      { ...createStickerElement('🎆', 750, 600), fontSize: 80 },
      { ...createStickerElement('✨', 100, 200), fontSize: 50 },
      { ...createStickerElement('✨', 900, 400), fontSize: 50 },
    ],
  },
]
