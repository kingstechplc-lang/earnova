// Server-side DOMPurify wrapper.
//
// Uses isomorphic-dompurify which works in both browser + Node.js environments.
// In Node.js it uses jsdom under the hood; in the browser it uses the native DOM.
//
// Per spec section 9 (CONTENT BLOCK SYSTEM) + section 82 (SECURITY HEADERS):
//   "DO NOT permit arbitrary HTML execution."
//   "Validate and sanitize server-side."
//
// This module is used by renderPostContent() to sanitize HTML before it's
// passed to dangerouslySetInnerHTML. It strips:
//   - <script> tags
//   - Event handler attributes (onclick, onerror, etc.)
//   - javascript: URLs
//   - data: URLs (except for images — allowed)
//   - iframe srcdoc
//   - object/embed tags
//
// Allowed elements: all standard text formatting, lists, links, images,
// code blocks, blockquotes, headings, tables, etc.
import DOMPurify from 'isomorphic-dompurify'

export const DOMPurifyServer = {
  sanitize(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [
        // Text formatting
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'sub', 'sup',
        'mark', 'small', 'abbr', 'cite', 'kbd', 'samp', 'var', 'time',
        // Headings
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        // Lists
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        // Links + media
        'a', 'img', 'figure', 'figcaption', 'picture', 'source',
        // Code
        'code', 'pre', 'samp',
        // Blocks
        'blockquote', 'q', 'hr', 'div', 'span',
        // Tables
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
        // Task lists (TipTap custom)
        'label', 'input',
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'title', 'alt', 'src', 'srcset',
        'width', 'height', 'class', 'id', 'style',
        'data-type', 'data-level', 'data-checked',
        'colspan', 'rowspan', 'scope', 'headers',
        'type', 'checked', 'disabled', // for task list checkboxes
      ],
      ALLOW_DATA_ATTR: true,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data:image\/|\/|#))/i,
    })
  },
}
