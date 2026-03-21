/**
 * Markdown Renderer
 *
 * Renders markdown content with syntax highlighting for code blocks
 * and XSS protection using DOMPurify.
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';

// Configure marked for syntax highlighting
(marked as any).setOptions({
  highlight: function(code: string, lang: string): string {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-',
  breaks: true,
  gfm: true,
});

/**
 * Render markdown to HTML with XSS protection
 */
export function renderMarkdown(markdown: string): string {
  // 1. Parse markdown to HTML
  const html = marked.parse(markdown) as string;

  // 2. Sanitize HTML to prevent XSS attacks
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'a',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 's', 'del', 'ins', 'sub', 'sup',
      'span', 'div'  // Allow span and div for syntax highlighting
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'class', 'target',
      'id'  // Allow id for anchors
    ],
    ALLOW_DATA_ATTR: false,
  });

  return clean;
}

/**
 * Check if text contains markdown syntax
 */
export function containsMarkdown(text: string): boolean {
  const markdownPatterns = [
    /^#{1,6}\s/m,           // Headers
    /```[\s\S]*?```/m,       // Code blocks
    /\*\*.*?\*\*/m,          // Bold
    /\*.*?\*/m,              // Italic
    /\[.*?\]\(.*?\)/m,       // Links
    /^\s*[-*+]\s/m,          // Lists
    /^\s*\d+\.\s/m,          // Numbered lists
    /^\s*>\s/m,              // Blockquotes
  ];

  return markdownPatterns.some(pattern => pattern.test(text));
}

/**
 * Strip markdown syntax to get plain text
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s/gm, '')                    // Headers
    .replace(/```[\s\S]*?```/gm, (match) => {       // Code blocks
      const lines = match.split('\n');
      return lines.slice(1, -1).join('\n');
    })
    .replace(/`([^`]+)`/g, '$1')                    // Inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1')              // Bold
    .replace(/\*([^*]+)\*/g, '$1')                  // Italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')      // Links
    .replace(/^\s*[-*+]\s/gm, '• ')               // Lists
    .replace(/^\s*\d+\.\s/gm, '')                  // Numbered lists
    .replace(/^\s*>\s/gm, '')                      // Blockquotes
    .trim();
}

/**
 * Get languages supported by highlight.js
 */
export function getSupportedLanguages(): string[] {
  return hljs.listLanguages();
}

/**
 * Detect programming language from code
 */
export function detectLanguage(code: string): string {
  const result = hljs.highlightAuto(code);
  return result.language || 'plaintext';
}
