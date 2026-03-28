/**
 * Markdown Renderer
 *
 * Renders markdown content with syntax highlighting for code blocks,
 * copy buttons, collapse for long blocks, and XSS protection.
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';

// Configure custom renderer
const renderer = new marked.Renderer();

renderer.code = function({ text, lang }: { text: string; lang?: string }) {
  const language = lang || '';
  const highlighted = language && hljs.getLanguage(language)
    ? hljs.highlight(text, { language }).value
    : text;

  const lineCount = text.split('\n').length;
  const isLong = lineCount > 15;
  const langLabel = language
    ? `<span class="code-lang-label">${language}</span>`
    : '';
  const copyBtn = `<button class="code-copy-btn" title="复制代码">复制</button>`;
  const header = `<div class="code-header">${langLabel}${copyBtn}</div>`;
  const codeHtml = `<pre><code class="hljs"${language ? ` data-lang="${language}"` : ''}>${highlighted}</code></pre>`;

  if (isLong) {
    return `<div class="code-block-wrapper code-collapsible" data-collapsed="true">${header}<div class="code-content">${codeHtml}</div><button class="code-expand-btn">展开全部 (${lineCount} 行)</button></div>`;
  }

  return `<div class="code-block-wrapper">${header}${codeHtml}</div>`;
};

marked.use({
  renderer,
  breaks: true,
  gfm: true,
});

/**
 * Render markdown to HTML with XSS protection
 */
export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown) as string;

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'a',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 's', 'del', 'ins', 'sub', 'sup',
      'span', 'div', 'button', 'img'  // Allow button for copy/expand, img for images
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'class', 'target',
      'id', 'data-lang', 'data-collapsed',  // Allow data attrs for code blocks
      'src', 'alt', 'width', 'height', 'loading', 'decoding'  // Allow img attributes
    ],
    ALLOW_DATA_ATTR: true,
  });

  return clean;
}

/**
 * Check if text contains markdown syntax
 */
export function containsMarkdown(text: string): boolean {
  const markdownPatterns = [
    /^#{1,6}\s/m,
    /```[\s\S]*?```/m,
    /\*\*.*?\*\*/m,
    /\*.*?\*/m,
    /\[.*?\]\(.*?\)/m,
    /^\s*[-*+]\s/m,
    /^\s*\d+\.\s/m,
    /^\s*>\s/m,
  ];

  return markdownPatterns.some(pattern => pattern.test(text));
}

/**
 * Strip markdown syntax to get plain text
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s/gm, '')
    .replace(/```[\s\S]*?```/gm, (match) => {
      const lines = match.split('\n');
      return lines.slice(1, -1).join('\n');
    })
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s/gm, '• ')
    .replace(/^\s*\d+\.\s/gm, '')
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
