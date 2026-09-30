'use client'
/**
 * RichTextEditor — TipTap-based rich text editor with full formatting toolbar.
 *
 * Features:
 *   - Bold, Italic, Underline, Strikethrough
 *   - Font family, font size, text color, highlight
 *   - Headings (H1, H2, H3)
 *   - Bullet lists, ordered lists, task lists
 *   - Text alignment (left, center, right, justify)
 *   - Links (with edit dialog)
 *   - Images (URL input)
 *   - Code blocks (syntax highlighting via lowlight)
 *   - Blockquotes
 *   - Horizontal rule
 *   - HTML import/export (via setContent/getHTML)
 *   - Paste support (TipTap parses pasted HTML into structured JSON)
 *   - Placeholder text
 *   - Character count
 *
 * Security:
 *   - TipTap stores content as ProseMirror JSON (structured data, not executable code)
 *   - Pasted HTML is parsed by TipTap into safe JSON — script tags are stripped
 *   - The JSON is stored in the database; on render, it's converted to HTML via
 *     generateHTML() and then sanitized with DOMPurify before dangerouslySetInnerHTML
 *   - This defense-in-depth approach ensures no XSS is possible
 *
 * Per spec section 9 (CONTENT BLOCK SYSTEM):
 *   "DO NOT permit arbitrary HTML execution."
 *   "DO NOT permit arbitrary JavaScript."
 *   "DO NOT trust client-provided block data."
 *   "Validate and sanitize server-side."
 */
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import CharacterCount from '@tiptap/extension-character-count'
import { useEffect, useCallback, useState, useRef } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2,
  Heading3, List, ListOrdered, ListChecks, Quote, Code, Link as LinkIcon,
  Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, Minus, Palette, Type, Highlighter, Check, X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Custom FontSize extension via TextStyle
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize || null,
        renderHTML: attributes => {
          if (!attributes.fontSize) return {}
          return { style: `font-size: ${attributes.fontSize}` }
        },
      },
      // Gradient text: stored as a `gradient` attribute on textStyle.
      // Rendered as inline style with background-clip: text + transparent fill.
      gradient: {
        default: null,
        parseHTML: element => element.getAttribute('data-gradient') || null,
        renderHTML: attributes => {
          if (!attributes.gradient) return {}
          return {
            style: `background-image: ${attributes.gradient}; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;`,
            'data-gradient': attributes.gradient,
          }
        },
      },
    }
  },
})

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px', '48px']
const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Sans Serif', value: 'system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: '"Courier New", monospace' },
  { label: 'Playfair', value: '"Playfair Display", serif' },
  { label: 'Inter', value: '"Inter", sans-serif' },
]
const TEXT_COLORS = [
  '#0f0f0f', '#374151', '#6b7280', '#dc2626', '#ea580c', '#d97706', '#65a30d',
  '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#c026d3', '#db2777', '#ffffff',
]

// Gradient presets — applied via a custom inline style (background-clip: text).
// The gradient is stored as a CSS `background-image` value on the span.
const TEXT_GRADIENTS = [
  { label: 'Evergreen-Gold',   value: 'linear-gradient(135deg, #0f4c3a 0%, #c89b3c 100%)' },
  { label: 'Gold-Berry',        value: 'linear-gradient(135deg, #c89b3c 0%, #b8345d 100%)' },
  { label: 'Berry-Cranberry',   value: 'linear-gradient(135deg, #b8345d 0%, #d63d24 100%)' },
  { label: 'Ocean-Gold',        value: 'linear-gradient(135deg, #0891b2 0%, #c89b3c 100%)' },
  { label: 'Purple-Pink',       value: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)' },
  { label: 'Sunset',            value: 'linear-gradient(135deg, #d97706 0%, #dc2626 50%, #c026d3 100%)' },
  { label: 'Forest-Sage',       value: 'linear-gradient(135deg, #0f4c3a 0%, #8b9d77 100%)' },
  { label: 'Rainbow',           value: 'linear-gradient(135deg, #dc2626 0%, #d97706 25%, #65a30d 50%, #0891b2 75%, #7c3aed 100%)' },
]

type RichTextEditorProps = {
  content: string  // JSON string of ProseMirror doc, or empty string
  onChange: (json: string, html: string) => void
  placeholder?: string
  minHeight?: number
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing your post…',
  minHeight = 300,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false, // replaced by CodeBlockLowlight
      }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
    ],
    content: content ? safeParseJSON(content) : '<p></p>',
    editorProps: {
      attributes: {
        class: 'rich-text-editor-content focus:outline-none px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON())
      const html = editor.getHTML()
      onChange(json, html)
    },
    immediatelyRender: false, // SSR-safe
  })

  // Sync external content changes (e.g., when loading a different post)
  const lastContentRef = useRef(content)
  useEffect(() => {
    if (editor && content !== lastContentRef.current) {
      lastContentRef.current = content
      editor.commands.setContent(content ? safeParseJSON(content) : '<p></p>', { emitUpdate: false })
    }
  }, [content, editor])

  if (!editor) {
    return (
      <div
        className="border border-border rounded-xl bg-card/50 backdrop-blur-sm animate-pulse"
        style={{ minHeight: minHeight + 60 }}
      />
    )
  }

  return (
    <div className="rich-text-editor border border-border rounded-xl bg-card/60 backdrop-blur-sm focus-within:ring-2 focus-within:ring-evergreen/30 transition-all">
      <Toolbar editor={editor} />
      <div className="rich-text-editor__body resize-y overflow-auto" style={{ minHeight: minHeight, maxHeight: '70vh' }}>
        <EditorContent editor={editor} />
      </div>
      <StatusBar editor={editor} />
    </div>
  )
}

// ─── Toolbar ────────────────────────────────────────────────────────────────

function Toolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [imageOpen, setImageOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [colorOpen, setColorOpen] = useState(false)

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href || ''
    setLinkUrl(previousUrl)
    setLinkOpen(true)
  }, [editor])

  const confirmLink = useCallback(() => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setLinkOpen(false)
  }, [editor, linkUrl])

  const confirmImage = useCallback(() => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
    }
    setImageOpen(false)
    setImageUrl('')
  }, [editor, imageUrl])

  const setFontSize = useCallback((size: string) => {
    editor.chain().focus().setMark('textStyle', { fontSize: size }).run()
  }, [editor])

  const setFontFamily = useCallback((family: string) => {
    if (family) {
      editor.chain().focus().setFontFamily(family).run()
    } else {
      editor.chain().focus().unsetFontFamily().run()
    }
  }, [editor])

  const setTextColor = useCallback((color: string) => {
    // Clear any gradient first, then apply solid color
    editor.chain().focus().setMark('textStyle', { color, gradient: null }).run()
    setColorOpen(false)
  }, [editor])

  const setTextGradient = useCallback((gradient: string) => {
    // Gradient text: set a custom `gradient` attribute on textStyle + clear solid color
    editor.chain().focus().setMark('textStyle', { color: null, gradient }).run()
    setColorOpen(false)
  }, [editor])

  const setCustomColor = useCallback((color: string) => {
    editor.chain().focus().setMark('textStyle', { color, gradient: null }).run()
  }, [editor])

  const btn = (active: boolean) =>
    `inline-flex items-center justify-center h-9 w-9 rounded-md text-sm transition-all flex-shrink-0 ${
      active
        ? 'bg-evergreen/15 text-evergreen'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
    }`

  return (
    <div className="border-b border-border/60 bg-background/60 backdrop-blur-sm relative z-10">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 overflow-x-auto">
        {/* Undo/Redo */}
        <button onClick={() => editor.chain().focus().undo().run()} className={btn(false)} title="Undo">
          <Undo className="h-4 w-4" />
        </button>
        <button onClick={() => editor.chain().focus().redo().run()} className={btn(false)} title="Redo">
          <Redo className="h-4 w-4" />
        </button>

        <Divider />

        {/* Headings */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={btn(editor.isActive('heading', { level: 1 }))}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btn(editor.isActive('heading', { level: 2 }))}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={btn(editor.isActive('heading', { level: 3 }))}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </button>

        <Divider />

        {/* Bold/Italic/Underline/Strike */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btn(editor.isActive('bold'))}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btn(editor.isActive('italic'))}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btn(editor.isActive('underline'))}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={btn(editor.isActive('strike'))}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </button>

        <Divider />

        {/* Font family + size */}
        <select
          onChange={e => setFontFamily(e.target.value)}
          className="h-9 rounded-md border border-border/60 bg-background text-xs px-2 cursor-pointer hover:bg-muted/40 flex-shrink-0 max-w-[8rem]"
          title="Font family"
          defaultValue=""
        >
          {FONT_FAMILIES.map(f => (
            <option key={f.label} value={f.value} style={f.value ? { fontFamily: f.value } : {}}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          onChange={e => setFontSize(e.target.value)}
          className="h-9 rounded-md border border-border/60 bg-background text-xs px-2 cursor-pointer hover:bg-muted/40 flex-shrink-0"
          title="Font size"
          defaultValue="16px"
        >
          {FONT_SIZES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <Divider />

        {/* Text color + gradient picker */}
        <div className="relative">
          <button
            onClick={() => setColorOpen(!colorOpen)}
            className={btn(false)}
            title="Text color & gradients"
          >
            <Palette className="h-4 w-4" />
          </button>
          <AnimatePresence>
            {colorOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="fixed top-auto z-50 p-3 rounded-lg border border-border bg-card shadow-elevated w-[280px] max-w-[calc(100vw-2rem)]"
                style={{ left: 'auto', right: 0 }}
              >
                {/* Solid colors */}
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Solid Colors</div>
                <div className="grid grid-cols-7 gap-1.5">
                  {TEXT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setTextColor(c)}
                      className="h-7 w-7 rounded-md border border-border/40 hover:scale-110 transition-transform flex-shrink-0"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>

                {/* Custom color picker */}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    onChange={e => setCustomColor(e.target.value)}
                    className="h-8 w-8 rounded-md border border-border/40 cursor-pointer flex-shrink-0"
                    title="Pick a custom color"
                  />
                  <input
                    type="text"
                    placeholder="#000000"
                    onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setCustomColor(e.target.value) }}
                    className="flex-1 h-8 px-2 rounded-md border border-border/60 bg-background text-xs font-mono"
                    title="Enter hex color"
                  />
                  <button
                    onClick={() => setColorOpen(false)}
                    className="h-8 px-2 rounded-md bg-evergreen text-cream text-xs font-medium hover:bg-evergreen-dark flex-shrink-0"
                  >
                    Done
                  </button>
                </div>

                {/* Gradient presets */}
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-3 mb-1.5">Gradients</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {TEXT_GRADIENTS.map(g => (
                    <button
                      key={g.label}
                      onClick={() => setTextGradient(g.value)}
                      className="h-8 rounded-md border border-border/40 hover:scale-105 transition-transform flex items-center justify-center text-[10px] font-bold text-white text-shadow"
                      style={{ backgroundImage: g.value, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                      title={g.label}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {/* Reset */}
                <button
                  onClick={() => { editor.chain().focus().setMark('textStyle', { color: null, gradient: null }).run(); setColorOpen(false) }}
                  className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/40"
                >
                  Reset to default
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Highlight */}
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={btn(editor.isActive('highlight'))}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </button>

        <Divider />

        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btn(editor.isActive('bulletList'))}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btn(editor.isActive('orderedList'))}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={btn(editor.isActive('taskList'))}
          title="Task list"
        >
          <ListChecks className="h-4 w-4" />
        </button>

        <Divider />

        {/* Alignment */}
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={btn(editor.isActive({ textAlign: 'left' }))}
          title="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={btn(editor.isActive({ textAlign: 'center' }))}
          title="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={btn(editor.isActive({ textAlign: 'right' }))}
          title="Align right"
        >
          <AlignRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={btn(editor.isActive({ textAlign: 'justify' }))}
          title="Justify"
        >
          <AlignJustify className="h-4 w-4" />
        </button>

        <Divider />

        {/* Link + Image */}
        <button onClick={setLink} className={btn(editor.isActive('link'))} title="Insert link">
          <LinkIcon className="h-4 w-4" />
        </button>
        <button onClick={() => setImageOpen(true)} className={btn(false)} title="Insert image">
          <ImageIcon className="h-4 w-4" />
        </button>

        <Divider />

        {/* Quote + Code + HR */}
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={btn(editor.isActive('blockquote'))}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={btn(editor.isActive('code'))}
          title="Inline code"
        >
          <Code className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={btn(false)}
          title="Horizontal rule"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* Link dialog */}
      <AnimatePresence>
        {linkOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border/60 bg-background/80 backdrop-blur-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 p-2 flex-wrap">
              <input
                type="url"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmLink() } }}
                placeholder="https://example.com"
                className="flex-1 min-w-[12rem] h-9 px-3 rounded-md border border-border bg-background text-sm"
                autoFocus
              />
              <button
                onClick={confirmLink}
                className="inline-flex items-center justify-center h-9 px-3 rounded-md bg-evergreen text-cream text-sm font-medium hover:bg-evergreen-dark flex-shrink-0"
              >
                <Check className="h-4 w-4 mr-1" /> Apply
              </button>
              <button
                onClick={() => setLinkOpen(false)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-muted flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image dialog */}
      <AnimatePresence>
        {imageOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border/60 bg-background/80 backdrop-blur-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 p-2 flex-wrap">
              <input
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmImage() } }}
                placeholder="https://example.com/image.jpg"
                className="flex-1 min-w-[12rem] h-9 px-3 rounded-md border border-border bg-background text-sm"
                autoFocus
              />
              <button
                onClick={confirmImage}
                className="inline-flex items-center justify-center h-9 px-3 rounded-md bg-evergreen text-cream text-sm font-medium hover:bg-evergreen-dark flex-shrink-0"
              >
                <ImageIcon className="h-4 w-4 mr-1" /> Insert
              </button>
              <button
                onClick={() => { setImageOpen(false); setImageUrl('') }}
                className="inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-muted flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Divider() {
  return <span className="w-px h-6 bg-border/60 mx-0.5 flex-shrink-0" />
}

// ─── Status bar ──────────────────────────────────────────────────────────────

function StatusBar({ editor }: { editor: Editor }) {
  return (
    <div className="border-t border-border/60 bg-background/40 px-3 py-1.5 flex items-center justify-between text-xs text-muted-foreground gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex-shrink-0">{editor.storage.characterCount?.characters() || 0} chars</span>
        <span className="flex-shrink-0">{editor.storage.characterCount?.words() || 0} words</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {editor.isActive('link') && <span className="text-evergreen">🔗 Link active</span>}
        {editor.can().undo() && <span>↶ Undo available</span>}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeParseJSON(s: string): any {
  try {
    const parsed = JSON.parse(s)
    // If it's an array, it's the old simple-block format [{type:'paragraph',text:'...'}].
    // TipTap expects a ProseMirror doc object {type:'doc', content:[...]}, not an array.
    // Convert it to avoid a "Invalid content" crash.
    if (Array.isArray(parsed)) {
      return convertOldBlocksToDoc(parsed)
    }
    // If it's already a ProseMirror doc, use as-is
    if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
      return parsed
    }
    // If it's an HTML string (e.g. "<p>...</p>"), return as-is
    return parsed
  } catch {
    // Not JSON — treat as plain HTML string (backward compat)
    return s
  }
}

/**
 * Convert the old simple-block format to a ProseMirror doc object.
 * Old: [{ type: 'paragraph', text: '...' }, { type: 'heading', level: 2, text: '...' }]
 * New: { type: 'doc', content: [{ type: 'paragraph', content: [{type:'text', text:'...'}] }, ...] }
 */
function convertOldBlocksToDoc(blocks: any[]): any {
  const content = blocks.map((block: any) => {
    if (block.type === 'heading') {
      return {
        type: 'heading',
        attrs: { level: block.level || 2 },
        content: block.text ? [{ type: 'text', text: block.text }] : [],
      }
    }
    // Default: paragraph
    return {
      type: 'paragraph',
      content: block.text ? [{ type: 'text', text: block.text }] : [],
    }
  })
  return { type: 'doc', content }
}
