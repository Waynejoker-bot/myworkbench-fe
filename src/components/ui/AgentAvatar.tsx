import { useState } from 'react';
import { Bot } from 'lucide-react';

interface AgentAvatarProps {
  agentId?: string;
  avatar?: string;
  size?: number;
  className?: string;
}

const BASE_URL = import.meta.env.BASE_URL || '/';

/**
 * Agent avatar component - displays SVG avatar from /avatars/{agentId}.svg
 * Falls back to Bot icon if no avatar is available
 */
export function AgentAvatar({ agentId, avatar, size = 32, className = '' }: AgentAvatarProps) {
  const [hasError, setHasError] = useState(false);
  // Use config avatar URL, or fallback to static file by agent ID
  const avatarUrl = avatar || (agentId ? `${BASE_URL}avatars/${agentId}.svg` : null);
  const iconSize = Math.round(size * 0.5);

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
