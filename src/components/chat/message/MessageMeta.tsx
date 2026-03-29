interface MessageMetaProps {
  context?: Record<string, string>;
}

/**
 * MessageMeta - Display agent execution metadata
 *
 * Shows rounds count, model name, and token usage below the message.
 * Only renders when context contains meaningful agent execution data.
 */
export function MessageMeta({ context }: MessageMetaProps) {
  if (!context) return null;

  const parts: string[] = [];

  // Rounds
  const rounds = context.rounds;
  if (rounds && rounds !== '0') {
    parts.push(`${rounds}轮`);
  }

  // Token usage
  const usageStr = context.llm_usage;
  if (usageStr) {
    try {
      const usage = JSON.parse(usageStr);
      const total = usage.total_tokens;
      if (total && total > 0) {
        parts.push(`${total.toLocaleString()} tokens`);
      }
    } catch {
      // ignore parse errors
    }
  }

  if (parts.length === 0) return null;

  return (
    <span className="text-muted-foreground" style={{ fontSize: 11 }}>
      {parts.join(' · ')}
    </span>
  );
}
