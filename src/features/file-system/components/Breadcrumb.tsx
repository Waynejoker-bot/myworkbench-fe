import { ChevronRight, Copy, Check } from "lucide-react";
import { useState } from "react";

interface BreadcrumbProps {
  prefix: string;
  path: string;
  onNavigate: (prefix: string, path: string) => void;
}

export function Breadcrumb({ prefix, path, onNavigate }: BreadcrumbProps) {
  const [copied, setCopied] = useState(false);

  // 复制完整路径
  const copyFullPath = async () => {
    const fullPath = `/${prefix}${prefix && path ? '/' : ''}${path}`.replace(/\/+/g, '/');
    const normalizedPath = fullPath.endsWith('/') && fullPath !== '/' ? fullPath.slice(0, -1) : fullPath;

    try {
      await navigator.clipboard.writeText(normalizedPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('复制失败:', err);
      // Fallback
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
  const segments: { label: string; prefix: string; path: string }[] = [];

  // 根目录
  segments.push({ label: "/", prefix: "", path: "" });

  // 如果有 prefix，添加前缀
  if (prefix) {
    segments.push({ label: prefix, prefix, path: "" });
  }

  // 如果有 path，分割添加
  if (path) {
    const pathParts = path.split("/").filter(Boolean);
    pathParts.forEach((part, index) => {
      const newPath = pathParts.slice(0, index + 1).join("/");
      segments.push({ label: part, prefix, path: newPath });
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 mx-1" />
            )}
            <button
              onClick={() => onNavigate(segment.prefix, segment.path)}
              className={`
                transition-colors px-1.5 py-0.5 rounded
                ${
                  index === segments.length - 1
                    ? "text-slate-900 dark:text-slate-100 font-medium"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }
              `}
            >
              {segment.label}
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={copyFullPath}
        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
        title="复制路径"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-slate-400" />
        )}
      </button>
    </div>
  );
}
