import { useState, useEffect } from "react";
import { FileItem } from "../types";
import { File, Folder, Check } from "lucide-react";

interface FileListProps {
  items: FileItem[];
  selectedFile: FileItem | null;
  onSelect: (item: FileItem) => void;
  currentPath?: string;
}

export function FileList({ items, selectedFile, onSelect, currentPath = "" }: FileListProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  const copyPath = async () => {
    if (!contextMenu) return;

    const fullPath = contextMenu.item.full_path || `${currentPath}/${contextMenu.item.name}`.replace(/\/+/g, '/').replace(/^\//, '');

    try {
      await navigator.clipboard.writeText(fullPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请检查浏览器权限');
    }
    closeContextMenu();
  };

  // 点击其他地方关闭菜单
  useEffect(() => {
    const handleClickOutside = () => closeContextMenu();
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
        此目录为空
      </div>
    );
  }

  return (
    <div className="py-2">
      {items.map((item) => (
        <div
          key={item.name}
          onClick={() => onSelect(item)}
          onContextMenu={(e) => handleContextMenu(e, item)}
          className={`
            flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer
            transition-colors group
            ${
              selectedFile?.name === item.name
                ? "bg-slate-100 dark:bg-slate-800"
                : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }
          `}
        >
          {item.type === "directory" ? (
            <Folder className="h-4 w-4 text-amber-500 shrink-0" />
          ) : (
            <File className="h-4 w-4 text-slate-400 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-slate-700 dark:text-slate-300 truncate">
              {item.name}
            </div>
            {item.type === "file" && item.size !== null && (
              <div className="text-xs text-slate-400 dark:text-slate-500">
                {formatFileSize(item.size)}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-20 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[150px]"
            style={{
              left: `${contextMenu.x + 8}px`,
              top: `${contextMenu.y}px`,
            }}
          >
            <button
              onClick={copyPath}
              className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  已复制
                </>
              ) : (
                <>
                  📋 复制路径
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
