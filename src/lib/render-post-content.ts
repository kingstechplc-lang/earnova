// Render TipTap content safely on the public side.
//
// Per spec section 9 (CONTENT BLOCK SYSTEM):
//   "DO NOT permit arbitrary HTML execution."
//   "DO NOT permit arbitrary JavaScript."
//   "DO NOT trust client-provided block data."
//
// Approach:
//   1. The editor stores content as ProseMirror JSON (structured data, not
//      executable code). This is already safe.
//   2. On render, we convert the JSON → HTML using TipTap's `generateHTML()`.
//      This only produces safe HTML elements (p, h1, ul, img, etc.) — it
//      cannot produce <script> tags or event handlers.
//   3. As defense-in-depth, we sanitize the resulting HTML with DOMPurify
//      before passing it to dangerouslySetInnerHTML.
//   4. The output is safe to render on any page.
//
// For backward compatibility with the old simple-block format (array of
// { type: 'paragraph', text: '...' }), we detect that format and convert
// it to ProseMirror JSON first.
import { generateHTML } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import { DOMPurifyServer } from '@/lib/dompurify-server'

// Custom FontSize extension (same as in the editor)
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.fontSize) return {}
          return { style: `font-size: ${attributes.fontSize}` }
        },
      },
    }
  },
})

// All extensions used by the editor (must match rich-text-editor.tsx)
const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: false,
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
  TaskList,
  TaskItem.configure({ nested: true }),
]

/**
 * Convert post content (stored as JSON string in the DB) into sanitized HTML
 * for public rendering.
 *
 * Handles 3 input formats:
 *   1. TipTap ProseMirror JSON (string) — the new format from RichTextEditor
 *   2. Old simple-block array [{ type: 'paragraph', text: '...' }] — backward compat
 *   3. Plain HTML string — treated as-is (sanitized)
 *
 * Returns an HTML string safe for dangerouslySetInnerHTML.
 */
export function renderPostContent(content: string | null | undefined): string {
  if (!content) return ''

  let json: any
  try {
    json = JSON.parse(content)
  } catch {
    // Not JSON — treat as plain HTML (backward compat with very old content)
    return DOMPurifyServer.sanitize(content)
  }

  // Detect old simple-block format: array of { type, text }
  if (Array.isArray(json)) {
    json = convertOldBlockFormat(json)
  }

  // If it's a ProseMirror doc, use generateHTML
  if (json && typeof json === 'object' && json.type === 'doc') {
    try {
      const html = generateHTML(json, extensions)
      return DOMPurifyServer.sanitize(html)
    } catch (err) {
      console.error('Failed to generate HTML from ProseMirror JSON:', err)
      return ''
    }
  }

  // Fallback: treat as plain HTML string
  return DOMPurifyServer.sanitize(content)
}

/**
 * Convert the old simple-block format to ProseMirror JSON.
 * Old: [{ type: 'paragraph', text: '...' }, { type: 'heading', level: 2, text: '...' }]
 * New: { type: 'doc', content: [...] }
 */
function convertOldBlockFormat(blocks: any[]): any {
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
