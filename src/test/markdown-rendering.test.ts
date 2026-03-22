import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '@/utils/markdown';

describe('renderMarkdown — code blocks', () => {
  it('wraps code block with language label', () => {
    const md = '```typescript\nconst x = 1;\n```';
    const html = renderMarkdown(md);
    expect(html).toContain('data-lang="typescript"');
    expect(html).toContain('code-lang-label');
  });

  it('includes copy button in code block', () => {
    const md = '```bash\necho hello\n```';
    const html = renderMarkdown(md);
    expect(html).toContain('code-copy-btn');
  });

  it('adds collapse wrapper for long code blocks (>15 lines)', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n');
    const md = '```js\n' + lines + '\n```';
    const html = renderMarkdown(md);
    expect(html).toContain('code-collapsible');
    expect(html).toContain('code-expand-btn');
  });

  it('does NOT add collapse for short code blocks (<=15 lines)', () => {
    const md = '```js\nconst x = 1;\n```';
    const html = renderMarkdown(md);
    expect(html).not.toContain('code-collapsible');
  });

  it('handles code block without language', () => {
    const md = '```\nplain text\n```';
    const html = renderMarkdown(md);
    expect(html).toContain('code-copy-btn');
  });
});

describe('renderMarkdown — inline elements', () => {
  it('renders inline code', () => {
    const html = renderMarkdown('use `const` keyword');
    expect(html).toContain('<code>');
    expect(html).toContain('const');
  });

  it('renders tables', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    const html = renderMarkdown(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>');
  });

  it('renders blockquotes', () => {
    const html = renderMarkdown('> important note');
    expect(html).toContain('<blockquote>');
  });
});
