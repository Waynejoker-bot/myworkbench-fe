import { useState, useEffect } from "react";
import { Wrench, FileText, FolderOpen, X, Loader2, ChevronRight } from "lucide-react";
import {
  listAgentSkills,
  readSkillFile,
  getFileStyle,
  formatFileSize,
  type SkillFileItem,
  type SkillsListResponse,
} from "@/api/skills";
import type { PanelProps } from "@/types/panel-plugin";

export function ToolsPanel({ agentId }: PanelProps) {
  const [skillsData, setSkillsData] = useState<SkillsListResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<SkillFileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

  useEffect(() => {
    if (agentId) {
      loadSkills();
    } else {
      setLoadingSkills(false);
    }
    // Reset when agent changes
    setSelectedFile(null);
    setFileContent("");
  }, [agentId]);

  const loadSkills = async () => {
    if (!agentId) return;
    setLoadingSkills(true);
    setError(null);
    setSelectedFile(null);
    setFileContent("");
    try {
      const data = await listAgentSkills(agentId);
      setSkillsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载 Skills 失败");
    } finally {
      setLoadingSkills(false);
    }
  };

  const handleFileClick = async (file: SkillFileItem) => {
    if (!agentId || file.type === "directory") return;
    setSelectedFile(file);
    setLoadingContent(true);
    setContentError(null);
    setFileContent("");
    try {
      const data = await readSkillFile(agentId, file.name);
      setFileContent(data.content);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "读取文件失败");
    } finally {
      setLoadingContent(false);
    }
  };

  const closePreview = () => {
    setSelectedFile(null);
    setFileContent("");
    setContentError(null);
  };

  // ── No agent ─────────────────────────────────────────────
  if (!agentId) {
    return (
      <div style={{ height: "100%", background: "#f9fafb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <FolderOpen className="h-8 w-8" style={{ color: "#d1d5db" }} />
        <p className="mt-3 text-sm" style={{ color: "#6b7280", textAlign: "center" }}>
          暂无关联的 Agent
        </p>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────
  if (loadingSkills) {
    return (
      <div style={{ height: "100%", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#0ea5e9" }} />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ height: "100%", background: "#f9fafb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <p className="text-sm" style={{ color: "#ef4444", textAlign: "center" }}>{error}</p>
        <button
          onClick={loadSkills}
          className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ background: "#0ea5e9" }}
        >
          重试
        </button>
      </div>
    );
  }

  const items = skillsData?.items ?? [];

  // ── Main: split view ─────────────────────────────────────
  return (
    <div style={{ height: "100%", background: "#f9fafb", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Skills info bar */}
      <div style={{ padding: "10px 16px 6px", borderBottom: "1px solid #e5e7eb", background: "#ffffff", flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5" style={{ color: "#64748b" }} />
          <span className="text-xs font-semibold" style={{ color: "#374151" }}>
            {skillsData?.agent_name || agentId}
          </span>
          <span className="text-xs" style={{ color: "#9ca3af" }}>— Skills</span>
        </div>
        {skillsData?.full_path && (
          <p className="text-xs truncate mt-0.5" style={{ color: "#9ca3af", fontFamily: "monospace" }} title={skillsData.full_path}>
            {skillsData.full_path}
          </p>
        )}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {items.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <FolderOpen className="h-8 w-8" style={{ color: "#d1d5db" }} />
            <p className="mt-3 text-xs" style={{ color: "#6b7280", textAlign: "center" }}>
              该 Agent 尚未配置 Skills
            </p>
            <p className="mt-1 text-xs" style={{ color: "#d1d5db", textAlign: "center" }}>
              请在 Agent 工作目录下创建 skills 目录
            </p>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: "auto", padding: "8px 12px" }}>
            {/* File list */}
            <div className="flex flex-col gap-1" style={{ display: selectedFile ? "none" : "flex" }}>
              {items.map((item) => {
                const style =
                  item.type === "directory"
                    ? { bg: "#eff6ff", text: "#1d4ed8", label: "目录" }
                    : getFileStyle(item.name);
                return (
                  <button
                    key={item.name}
                    onClick={() => handleFileClick(item)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all"
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      cursor: item.type === "file" ? "pointer" : "default",
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
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate" style={{ color: "#111827" }} title={item.name}>
                          {item.name}
                        </span>
                        <span
                          className="text-xs px-1 py-0.5 rounded shrink-0"
                          style={{ background: style.bg, color: style.text, fontSize: 9 }}
                        >
                          {style.label}
                        </span>
                      </div>
                      {item.size != null && (
                        <span className="text-xs" style={{ color: "#9ca3af" }}>
                          {formatFileSize(item.size)}
                        </span>
                      )}
                    </div>
                    {item.type === "file" && (
                      <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "#d1d5db" }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* File preview */}
            {selectedFile && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {/* Back button */}
                <button
                  onClick={closePreview}
                  className="flex items-center gap-1.5 px-2 py-2 rounded-lg mb-2 transition-colors shrink-0"
                  style={{ background: "#ffffff", border: "1px solid #e5e7eb", color: "#64748b" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#0ea5e9";
                    e.currentTarget.style.color = "#0ea5e9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.color = "#64748b";
                  }}
                >
                  <X className="h-3 w-3" />
                  <span className="text-xs">关闭预览</span>
                </button>

                {/* File name */}
                <div className="mb-2 px-1">
                  <span className="text-xs font-medium" style={{ color: "#374151" }}>
                    {selectedFile.name}
                  </span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: "auto", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                  {loadingContent ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
                      <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#0ea5e9" }} />
                    </div>
                  ) : contentError ? (
                    <div style={{ padding: 16 }}>
                      <p className="text-xs" style={{ color: "#ef4444" }}>{contentError}</p>
                    </div>
                  ) : (
                    <pre
                      className="text-xs leading-relaxed p-3"
                      style={{
                        color: "#374151",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
