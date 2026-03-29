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
      <div className="bg-surface-2 flex flex-col items-center justify-center p-6" style={{ height: "100%" }}>
        <FolderOpen className="h-8 w-8 text-border" />
        <p className="mt-3 text-sm text-muted-foreground text-center">
          暂无关联的 Agent
        </p>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────
  if (loadingSkills) {
    return (
      <div className="bg-surface-2 flex items-center justify-center" style={{ height: "100%" }}>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-surface-2 flex flex-col items-center justify-center p-6" style={{ height: "100%" }}>
        <p className="text-sm text-destructive text-center">{error}</p>
        <button
          onClick={loadSkills}
          className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-primary"
        >
          重试
        </button>
      </div>
    );
  }

  const items = skillsData?.items ?? [];

  // ── Main: split view ─────────────────────────────────────
  return (
    <div className="bg-surface-2 flex flex-col overflow-hidden" style={{ height: "100%" }}>
      {/* Skills info bar */}
      <div className="border-b border-border bg-card shrink-0" style={{ padding: "10px 16px 6px" }}>
        <div className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            {skillsData?.agent_name || agentId}
          </span>
          <span className="text-xs text-muted-foreground">— Skills</span>
        </div>
        {skillsData?.full_path && (
          <p className="text-xs truncate mt-0.5 text-muted-foreground font-mono" title={skillsData.full_path}>
            {skillsData.full_path}
          </p>
        )}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <FolderOpen className="h-8 w-8 text-border" />
            <p className="mt-3 text-xs text-muted-foreground text-center">
              该 Agent 尚未配置 Skills
            </p>
            <p className="mt-1 text-xs text-border text-center">
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
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all bg-card border border-border hover:border-primary hover:bg-primary/5"
                    style={{
                      cursor: item.type === "file" ? "pointer" : "default",
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
                        <span className="text-xs font-medium truncate text-foreground" title={item.name}>
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
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(item.size)}
                        </span>
                      )}
                    </div>
                    {item.type === "file" && (
                      <ChevronRight className="h-3 w-3 shrink-0 text-border" />
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
                  className="flex items-center gap-1.5 px-2 py-2 rounded-lg mb-2 transition-colors shrink-0 bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <X className="h-3 w-3" />
                  <span className="text-xs">关闭预览</span>
                </button>

                {/* File name */}
                <div className="mb-2 px-1">
                  <span className="text-xs font-medium text-foreground">
                    {selectedFile.name}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-card border border-border rounded-lg">
                  {loadingContent ? (
                    <div className="flex items-center justify-center p-10">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : contentError ? (
                    <div className="p-4">
                      <p className="text-xs text-destructive">{contentError}</p>
                    </div>
                  ) : (
                    <pre
                      className="text-xs leading-relaxed p-3 text-foreground font-mono"
                      style={{
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
