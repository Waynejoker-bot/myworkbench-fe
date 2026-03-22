import { describe, it, expect } from 'vitest';
import { renderMarkdown, containsMarkdown, stripMarkdown } from '@/utils/markdown';

describe('renderMarkdown — edge cases', () => {
  it('handles empty string', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('handles plain text without markdown', () => {
    const html = renderMarkdown('Hello world');
    expect(html).toContain('Hello world');
  });

  it('sanitizes script tags (XSS prevention)', () => {
    const html = renderMarkdown('Hello <script>alert("xss")</script>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('alert');
  });

  it('sanitizes onclick attributes', () => {
    const html = renderMarkdown('[click me](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });

  it('preserves code block content with special characters', () => {
    const md = '```html\n<div class="test">&amp;</div>\n```';
    const html = renderMarkdown(md);
    expect(html).toContain('code-block-wrapper');
  });

  it('handles nested markdown correctly', () => {
    const html = renderMarkdown('**bold *italic* bold**');
    expect(html).toContain('<strong>');
    expect(html).toContain('<em>');
  });

  it('renders numbered lists', () => {
    const md = '1. First\n2. Second\n3. Third';
    const html = renderMarkdown(md);
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>');
  });

  it('renders unordered lists', () => {
    const md = '- Item A\n- Item B';
    const html = renderMarkdown(md);
    expect(html).toContain('<ul>');
  });

  it('renders links with href preserved', () => {
    const html = renderMarkdown('[Google](https://google.com)');
    expect(html).toContain('href="https://google.com"');
  });

  it('renders headers correctly', () => {
    const html = renderMarkdown('# H1\n## H2\n### H3');
    expect(html).toContain('<h1>');
    expect(html).toContain('<h2>');
    expect(html).toContain('<h3>');
  });
});

describe('containsMarkdown', () => {
  it('detects code blocks', () => {
    expect(containsMarkdown('```js\ncode\n```')).toBe(true);
  });

  it('detects headers', () => {
    expect(containsMarkdown('# Title')).toBe(true);
  });

  it('detects bold', () => {
    expect(containsMarkdown('**bold**')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(containsMarkdown('Hello world')).toBe(false);
  });

  it('detects links', () => {
    expect(containsMarkdown('[text](url)')).toBe(true);
  });

  it('detects blockquotes', () => {
    expect(containsMarkdown('> quote')).toBe(true);
  });
});

describe('stripMarkdown', () => {
  it('strips headers', () => {
    expect(stripMarkdown('# Title')).toBe('Title');
  });

  it('strips bold markers', () => {
    expect(stripMarkdown('**bold**')).toBe('bold');
  });

  it('strips link syntax keeping text', () => {
    expect(stripMarkdown('[Google](https://google.com)')).toBe('Google');
  });

  it('strips inline code backticks', () => {
    expect(stripMarkdown('use `const`')).toBe('use const');
  });
});
