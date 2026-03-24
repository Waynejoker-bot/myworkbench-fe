import { ChevronRight, Copy, Check } from "lucide-react";
import { useState } from "react";

interface BreadcrumbProps {
  path: string;
  rootPath?: string;
  onNavigate: (path: string) => void;
}

export function Breadcrumb({ path, rootPath = '', onNavigate }: BreadcrumbProps) {
  const [copied, setCopied] = useState(false);

  // 复制完整路径
  const copyFullPath = async () => {
    const fullPath = `/${path}`.replace(/\/+/g, '/');
    const normalizedPath = fullPath.endsWith('/') && fullPath !== '/' ? fullPath.slice(0, -1) : fullPath;

    try {
      await navigator.clipboard.writeText(normalizedPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('复制失败:', err);
      const textarea = document.createElement('textarea');
      textarea.value = normalizedPath;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    }
  };

  // 计算 rootPath 的层级深度，用于判断哪些段可导航
  const rootParts = rootPath.split('/').filter(Boolean);
  const rootDepth = rootParts.length; // e.g. /opt/claude/business → 3

  // 构建面包屑路径
  const segments: { label: string; path: string; navigable: boolean }[] = [];

  // 根目录 "/"
  segments.push({ label: "/", path: "", navigable: rootDepth === 0 });

  // 如果有 path，分割添加
  if (path) {
    const pathParts = path.split("/").filter(Boolean);
    pathParts.forEach((part, index) => {
      const newPath = pathParts.slice(0, index + 1).join("/");
      const absoluteDepth = index + 1;
      const navigable = absoluteDepth >= rootDepth;
      segments.push({ label: part, path: newPath, navigable });
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 mx-1" style={{ color: '#9ca3af' }} />
            )}
            {segment.navigable ? (
              <button
                onClick={() => onNavigate(segment.path)}
                className="transition-colors px-1.5 py-0.5 rounded"
                style={{
                  color: index === segments.length - 1 ? '#111827' : '#6b7280',
                  fontWeight: index === segments.length - 1 ? 500 : 400,
                }}
                onMouseEnter={e => {
                  if (index !== segments.length - 1) e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {segment.label}
              </button>
            ) : (
              <span
                className="px-1.5 py-0.5"
                style={{ color: '#9ca3af', cursor: 'default' }}
                title="无法导航到项目根目录之外"
              >
                {segment.label}
              </span>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={copyFullPath}
        className="p-1 rounded transition-colors"
        style={{ color: '#9ca3af' }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        title="复制路径"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" style={{ color: '#22c55e' }} />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
