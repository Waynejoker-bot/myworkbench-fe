import { renderMarkdown } from '@/utils/markdown';

interface ThinkingBlockProps {
  content: string;
}

/**
 * ThinkingBlock - Agent 思考过程展示
 *
 * 始终展开，直接显示自然语言内容。
 * 思考过程对用户有价值，不需要折叠。
 */
export function ThinkingBlockRenderer({ content }: ThinkingBlockProps) {
  if (!content.trim()) return null;

  const html = renderMarkdown(content);

  return (
    <div
      className="thinking-block text-muted-foreground"
      style={{
        fontSize: 13,
        lineHeight: 1.6,
        padding: '2px 0',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
