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

  // 构建面包屑路径
  const segments: { label: string; path: string; navigable: boolean }[] = [];

  // 根目录 "/" - 始终可导航
  segments.push({ label: "/", path: "", navigable: true });

  // 如果有 path，分割添加 - 所有段都可导航（因为使用相对路径）
  if (path) {
    const pathParts = path.split("/").filter(Boolean);
    pathParts.forEach((part, index) => {
      const newPath = pathParts.slice(0, index + 1).join("/");
      segments.push({ label: part, path: newPath, navigable: true });
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 mx-1 text-muted-foreground" />
            )}
            {segment.navigable ? (
              <button
                onClick={() => onNavigate(segment.path)}
                className={`transition-colors px-1.5 py-0.5 rounded hover:bg-muted ${
                  index === segments.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {segment.label}
              </button>
            ) : (
              <span
                className="px-1.5 py-0.5 text-muted-foreground cursor-default"
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
        className="p-1 rounded transition-colors text-muted-foreground hover:bg-muted"
        title="复制路径"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
