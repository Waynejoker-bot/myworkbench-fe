import { Bot } from "lucide-react";
import type { Agent } from "@/api/agent";

/**
 * 判断字符串是否是图片 URL
 */
export function isImageUrl(str: string): boolean {
  return str.startsWith("http://") || str.startsWith("https://") || str.startsWith("/");
}

/**
 * 判断字符串是否是 emoji
 * emoji 通常是 1-4 个字符，且在特定 Unicode 范围内
 */
export function isEmoji(str: string): boolean {
  if (!str || str.length > 4) return false;
  // 常见 emoji Unicode 范围
  const emojiRegex = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u;
  return emojiRegex.test(str);
}

/**
 * Agent 头像渲染组件
 * 支持 emoji、图片 URL、空（显示默认图标）
 */
interface AgentAvatarProps {
  avatar?: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AgentAvatar({ avatar, name, size = "md", className = "" }: AgentAvatarProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-base",
    md: "w-8 h-8 text-lg",
    lg: "w-12 h-12 text-xl",
  }[size];

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }[size];

  // 没有头像：显示默认图标
  if (!avatar) {
    return (
      <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 ${className}`}>
        <Bot className={`${iconSize} text-white`} />
      </div>
    );
  }

  // 是图片 URL：显示图片
  if (isImageUrl(avatar)) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`${sizeClasses} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  // 是 emoji：显示 emoji
  if (isEmoji(avatar)) {
    return (
      <div className={`${sizeClasses} rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 ${className}`}>
        <span>{avatar}</span>
      </div>
    );
  }

  // 其他情况（可能是文本）：显示首字符
  const initial = avatar.charAt(0).toUpperCase();
  return (
    <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 ${className}`}>
      <span className="text-white font-medium">{initial}</span>
    </div>
  );
}

/**
 * 获取 Agent 头像配置
 * 用于需要自定义渲染的场景
 */
export function getAgentAvatarConfig(agent: Agent | undefined): {
  avatar?: string;
  name: string;
} {
  return {
    avatar: agent?.config?.avatar,
    name: agent?.name || "未知",
  };
}
