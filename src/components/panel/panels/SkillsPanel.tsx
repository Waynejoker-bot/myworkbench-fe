import { useState, useEffect } from "react";
import { FileText, FolderOpen, Loader2, ChevronRight, Home } from "lucide-react";
import { listAgentSkills, getFileStyle, formatFileSize } from "@/api/skills";
import { apiClient } from "@/lib/api-client";
import type { PanelProps } from "@/types/panel-plugin";
import type { SkillFileItem } from "@/api/skills";

interface FileItem {
  name: string;
  type: "file" | "directory";
  size: number | null;
  modified_time: string;
  full_path?: string;
}

export function SkillsPanel({ agentId }: PanelProps) {
  const [skillsPrefix, setSkillsPrefix] = useState<string>("");
  const [skillsBasePath, setSkillsBasePath] = useState<string>("");
  const [currentPath, setCurrentPath] = useState<string>("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  useEffect(() => {
    if (agentId) {
      loadSkills();
    } else {
      setLoading(false);
    }
  }, [agentId]);

  const loadSkills = async (path?: string) => {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    setSelectedFile(null);
    setFileContent("");

    try {
      if (path === undefined || path === "") {
        // 根目录：获取 skills 的 prefix 和 base path
        const data = await listAgentSkills(agentId);
        console.log("[SkillsPanel] root load:", data);
        setSkillsPrefix(data.skills_prefix || "");
        setSkillsBasePath(data.skills_path || "");
        setItems(data.items || []);
        setCurrentPath("");
      } else {
        // 子目录：使用 fs/list 列出子目录
        const fullPath = `${skillsBasePath}/${path}`;
        console.log("[SkillsPanel] subdir load:", { skillsPrefix, skillsBasePath, path, fullPath });
        const data = await apiClient.listFiles(skillsPrefix, fullPath);
        console.log("[SkillsPanel] subdir result:", data);
        setItems(data.items || []);
        setCurrentPath(path);
      }
    } catch (err) {
      console.error("[SkillsPanel] loadSkills error:", err);
      setError(err instanceof Error ? err.message : "加载 Skills 失败");
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = async (item: FileItem) => {
    console.log("[SkillsPanel] handleItemClick:", item);
    if (item.type === "directory") {
      // 进入子目录
      const newPath = currentPath
        ? `${currentPath}/${item.name}`
        : item.name;
      console.log("[SkillsPanel] navigating to:", newPath);
      setLoading(true);
      await loadSkills(newPath);
    } else {
      // 读取文件内容
      setSelectedFile(item);
      setLoadingContent(true);
      setContentError(null);
      setFileContent("");
      try {
        const fullFilePath = currentPath
          ? `${skillsBasePath}/${currentPath}/${item.name}`
          : `${skillsBasePath}/${item.name}`;
        const data = await apiClient.readFile(skillsPrefix, fullFilePath);
        setFileContent(data.content);
      } catch (err) {
        console.error("[SkillsPanel] readFile error:", err);
        setContentError(err instanceof Error ? err.message : "读取失败");
      } finally {
        setLoadingContent(false);
      }
    }
  };

  const handleBack = async () => {
    if (!currentPath) return;
    const parts = currentPath.split("/");
    parts.pop();
    const parentPath = parts.join("/");
    if (parts.length === 0) {
      // 返回根目录
      setCurrentPath("");
      setItems([]);
      setLoading(true);
      try {
        const data = await listAgentSkills(agentId!);
        setItems(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      await loadSkills(parentPath);
    }
  };

  const handleGoHome = async () => {
    setCurrentPath("");
    setItems([]);
    setLoading(true);
    try {
      const data = await listAgentSkills(agentId!);
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const handleBreadcrumbClick = async (index: number) => {
    const parts = currentPath.split("/");
    const targetPath = parts.slice(0, index + 1).join("/");
    setLoading(true);
    await loadSkills(targetPath);
  };

  // 渲染面包屑导航
  const renderBreadcrumb = () => {
    const pathParts = currentPath ? currentPath.split("/") : [];
    return (
      <div className="flex items-center gap-0.5 flex-wrap">
        <button
          onClick={handleGoHome}
          className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded transition-colors"
          style={{ color: "#0ea5e9", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f9ff")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Home className="h-3 w-3" />
          Skills
        </button>
        {pathParts.map((part, i) => (
          <span key={i} className="flex items-center gap-0.5">
            <ChevronRight className="h-3 w-3" style={{ color: "#9ca3af" }} />
            <button
              onClick={() => handleBreadcrumbClick(i)}
              className="text-xs px-1.5 py-0.5 rounded transition-colors"
              style={{ color: "#0ea5e9", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f9ff")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {part}
            </button>
          </span>
        ))}
      </div>
    );
  };

  if (!agentId) {
    return (
      <div style={{ height: "100%", background: "#f9fafb", padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
          Skills
        </div>
        <div style={{ textAlign: "center", padding: "40px 0", color: "#475569", fontSize: 13 }}>
          暂无可查看的 Skills
        </div>
      </div>
    );
  }

  if (loading && items.length === 0) {
    return (
      <div style={{ height: "100%", background: "#f9fafb", padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
          Skills
        </div>
        <div className="flex items-center justify-center" style={{ padding: "40px 0" }}>
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#0ea5e9" }} />
          <span className="ml-2 text-sm" style={{ color: "#6b7280" }}>加载中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: "100%", background: "#f9fafb", padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
          Skills
        </div>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>
          <button
            onClick={() => loadSkills()}
            className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ background: "#0ea5e9" }}
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (selectedFile) {
    return (
      <div style={{ height: "100%", background: "#f9fafb", display: "flex", flexDirection: "column" }}>
        {/* File content header */}
        <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
          <button
            onClick={() => setSelectedFile(null)}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            ← 返回
          </button>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginTop: 4 }}>
            {selectedFile.name}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, fontFamily: "monospace" }}>
            {renderBreadcrumb()}
          </div>
        </div>

        {/* File content */}
        <div className="flex-1 overflow-auto p-4">
          {loadingContent ? (
            <div className="flex items-center justify-center" style={{ padding: "60px 0" }}>
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#0ea5e9" }} />
            </div>
          ) : contentError ? (
            <p className="text-sm" style={{ color: "#ef4444" }}>{contentError}</p>
          ) : (
            <pre
              className="text-xs leading-relaxed whitespace-pre-wrap"
              style={{
                color: "#374151",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 16,
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {fileContent}
            </pre>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", background: "#f9fafb", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
          Skills
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>
          {renderBreadcrumb()}
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: "40px 0" }}>
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#0ea5e9" }} />
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 13 }}>
            空目录
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {items.map((item) => {
              const style = item.type === "directory"
                ? { bg: "#eff6ff", text: "#1d4ed8" }
                : getFileStyle(item.name);
              return (
                <button
                  key={item.name}
                  onClick={() => handleItemClick(item)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-left w-full"
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    cursor: "pointer",
                    pointerEvents: "auto",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#0ea5e9";
                    e.currentTarget.style.background = "#f0f9ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.background = "#ffffff";
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded shrink-0"
                    style={{ width: 28, height: 28, background: style.bg, color: style.text }}
                  >
                    {item.type === "directory" ? (
                      <FolderOpen className="h-3.5 w-3.5" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: "#111827" }}>
                      {item.name}
                    </div>
                    <div className="text-xs" style={{ color: "#9ca3af" }}>
                      {formatFileSize(item.size ?? 0)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
