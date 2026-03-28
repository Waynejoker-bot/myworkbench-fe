import { useState, useMemo } from 'react';
import { Bot } from 'lucide-react';

interface AgentAvatarProps {
  agentId?: string;
  avatar?: string;
  size?: number;
  className?: string;
}

const BASE_URL = import.meta.env.BASE_URL || '/';

/**
 * Check if a string is an emoji
 */
function isEmoji(str: string): boolean {
  if (!str) return false;
  // Check if string contains only emoji-like characters
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(str) && str.length <= 2;
}

/**
 * Agent avatar component - displays avatar from emoji, URL, or /avatars/{agentId}.png
 * Falls back to Bot icon if no avatar is available
 */
export function AgentAvatar({ agentId, avatar, size = 32, className = '' }: AgentAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const { isEmoji: avatarIsEmoji, avatarUrl } = useMemo(() => {
    // If avatar is an emoji, return it as-is
    if (avatar && isEmoji(avatar)) {
      return { isEmoji: true, avatarUrl: null };
    }

    // Otherwise use as URL, or fallback to static file
    const url = avatar || (agentId ? `${BASE_URL}avatars/${agentId}.png` : null);
    return { isEmoji: false, avatarUrl: url };
  }, [avatar, agentId]);

  const iconSize = Math.round(size * 0.5);

  // Display emoji directly as text
  if (avatarIsEmoji) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.25),
          background: '#f3f4f6',
          border: '1px solid #d1d5db',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.round(size * 0.6),
        }}
      >
        {avatar}
      </div>
    );
  }

  // Display image URL
  if (avatarUrl && !hasError) {
    return (
      <img
        src={avatarUrl}
        alt={agentId || 'agent'}
        width={size}
        height={size}
        className={className}
        style={{
          borderRadius: Math.round(size * 0.25),
          objectFit: 'cover',
          display: 'block',
        }}
        onError={() => setHasError(true)}
      />
    );
  }

  // Fallback to Bot icon
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
        background: '#f3f4f6',
        border: '1px solid #d1d5db',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Bot style={{ width: iconSize, height: iconSize, color: '#0ea5e9' }} />
    </div>
  );
}
