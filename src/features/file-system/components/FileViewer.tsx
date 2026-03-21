import { useMemo, useState } from "react";
import { FileItemWithContent } from "../types";
import { ArrowLeft, File, Code, Copy, Check, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js";

interface FileViewerProps {
  file: FileItemWithContent | null;
  loading: boolean;
  error: string | null;
  onNavigateUp?: () => void;
}

// Markdown 代码块组件
function CodeBlock({ children, className, ...props }: any) {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  if (match && language) {
    const highlighted = hljs.highlightAuto(String(children).replace(/\n$/, ""), [language]).value;
    return (
      <code
        className={`hljs ${className}`}
        dangerouslySetInnerHTML={{ __html: highlighted }}
        {...props}
      />
    );
  }

  return (
    <code className="hljs" {...props}>
      {children}
    </code>
  );
}

export function FileViewer({ file, loading, error, onNavigateUp }: FileViewerProps) {
  // Markdown 原文视图切换
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);
  const [copied, setCopied] = useState(false);

  // 复制文件内容
  const copyContent = async () => {
    if (!file?.content) {
      alert('没有内容可复制');
      return;
    }

    // 优先尝试 Clipboard API
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(file.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch (err) {
        console.error('Clipboard API 失败，尝试 fallback:', err);
      }
    }

    // Fallback: 使用传统的复制方法
    try {
      const textarea = document.createElement('textarea');
      textarea.value = file.content;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999); // 移动端兼容
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('execCommand copy failed');
      }
    } catch (fallbackErr) {
      console.error('Fallback 复制也失败:', fallbackErr);
      alert('复制失败，请使用 localhost:5179 访问');
    }
  };

  // 下载文件
  const downloadFile = () => {
    if (!file?.content || !file?.name) {
      alert('没有内容可下载');
      return;
    }

    // 创建 Blob
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;

    // 触发下载
    document.body.appendChild(link);
    link.click();

    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 判断是否是 Markdown 文件
  const isMarkdown = useMemo(() => {
    if (!file?.name) return false;
    const ext = file.name.split(".").pop()?.toLowerCase();
    return ext === "md" || ext === "markdown";
  }, [file?.name]);

  // 根据文件名推断语言
  const getLanguage = (filename: string | undefined): string => {
    if (!filename) return "plaintext";
    const ext = filename.split(".").pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      json: "json",
      xml: "xml",
      html: "html",
      css: "css",
      md: "markdown",
      sh: "bash",
      bash: "bash",
      yaml: "yaml",
      yml: "yaml",
      toml: "toml",
      sql: "sql",
    };
    return langMap[ext || ""] || "plaintext";
  };

  // 代码高亮处理
  const highlightedCode = useMemo(() => {
    if (!file?.content) return null;
    const lang = getLanguage(file.name);
    return hljs.highlight(file.content, { language: lang }).value;
  }, [file?.content, file?.name]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-slate-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !file) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <File className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            选择一个文件查看内容
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            点击左侧目录或文件进行导航
          </p>
        </div>
      </div>
    );
  }

  if (file.type === "directory") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <span className="text-3xl">📁</span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
            {file.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            这是一个目录，包含 {file.size === null ? "若干" : file.size} 个项目
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* File Header */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-3 shrink-0">
        {onNavigateUp && (
          <button
            onClick={onNavigateUp}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="返回上级"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          </button>
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <File className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
            {file.name}
          </span>
          {file.size !== null && (
            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
              ({formatFileSize(file.size)})
            </span>
          )}
        </div>
        {isMarkdown && (
          <button
            onClick={() => setShowRawMarkdown(!showRawMarkdown)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
            title={showRawMarkdown ? "查看渲染视图" : "查看原文"}
          >
            <Code className="h-3.5 w-3.5" />
            <span>{showRawMarkdown ? "渲染" : "原文"}</span>
          </button>
        )}
        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
          {getLanguage(file.name)}
        </span>
        <button
          onClick={downloadFile}
          className="ml-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="下载文件"
        >
          <Download className="h-4 w-4 text-slate-400" />
        </button>
        <button
          onClick={copyContent}
          className="ml-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="复制内容"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-slate-400" />
          )}
        </button>
      </div>

      {/* File Content */}
      <div className="flex-1 overflow-auto">
        {isMarkdown && !showRawMarkdown ? (
          // Markdown 渲染视图
          <div className="p-4 prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: CodeBlock,
              }}
            >
              {file.content || ""}
            </ReactMarkdown>
          </div>
        ) : (
          // 原文/代码文件渲染（带行号）
          <div className="code-editor-bg rounded-lg overflow-hidden flex">
            {/* 行号列 */}
            <div
              className="py-4 px-2 text-right text-sm select-none border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
              style={{
                fontFamily: '"JetBrains Mono", "Fira Code", Consolas, Monaco, monospace',
                lineHeight: '1.6',
              }}
            >
              {(file.content || "").split("\n").map((_, index) => (
                <div key={index} className="text-slate-400 dark:text-slate-600 pr-2">
                  {index + 1}
                </div>
              ))}
            </div>
            {/* 代码内容 */}
            <pre
              className="p-4 text-sm m-0 hljs flex-1 overflow-x-auto"
              style={{
                fontFamily: '"JetBrains Mono", "Fira Code", Consolas, Monaco, monospace',
                lineHeight: '1.6',
              }}
              dangerouslySetInnerHTML={{ __html: highlightedCode || file.content || "" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
