/**
 * Skills API
 *
 * Fetches skills directory contents for a specific agent.
 * Skills are located at: {agent_cwd}/skills/
 */

import { apiClient } from "@/lib/api-client";

export interface SkillFileItem {
  name: string;
  type: "file" | "directory";
  size: number | null;
  modified_time: string;
}

export interface SkillsListResponse {
  agent_id: string;
  agent_name: string;
  cwd: string;
  skills_prefix: string;
  skills_path: string;
  success: boolean;
  items: SkillFileItem[];
  full_path: string;
}

export interface FileReadResponse {
  success: boolean;
  content: string;
  size: number;
  encoding: string;
  full_path: string;
  path: string;
}

/**
 * List skills files for a given agent
 */
export async function listAgentSkills(agentId: string): Promise<SkillsListResponse> {
  return apiClient.get<SkillsListResponse>(`/api/agents/${agentId}/skills`);
}

/**
 * Read a skill file content
 */
export async function readSkillFile(
  agentId: string,
  fileName: string
): Promise<FileReadResponse> {
  // The skills path is {cwd}/skills/
  // We need to get the prefix from the cwd
  const skillsRes = await listAgentSkills(agentId);
  const prefix = skillsRes.skills_prefix;
  const path = `${skillsRes.skills_path}/${fileName}`;

  return apiClient.get<FileReadResponse>(
    `/api/fs/read?prefix=${encodeURIComponent(prefix)}&path=${encodeURIComponent(path)}`
  );
}

/**
 * Get file extension for icon/color mapping
 */
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot === -1 ? "" : fileName.slice(lastDot + 1).toLowerCase();
}

/**
 * Get icon/color for file based on extension
 */
export function getFileStyle(
  fileName: string
): { bg: string; text: string; label: string } {
  const ext = getFileExtension(fileName);
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    md: { bg: "#eff6ff", text: "#1d4ed8", label: "Markdown" },
    py: { bg: "#fef3c7", text: "#92400e", label: "Python" },
    json: { bg: "#f0fdf4", text: "#166534", label: "JSON" },
    yaml: { bg: "#f0fdf4", text: "#166534", label: "YAML" },
    yml: { bg: "#f0fdf4", text: "#166534", label: "YAML" },
    sh: { bg: "#f0fdfa", text: "#115e59", label: "Shell" },
    bash: { bg: "#f0fdfa", text: "#115e59", label: "Bash" },
    txt: { bg: "#f9fafb", text: "#374151", label: "Text" },
    prompt: { bg: "#faf5ff", text: "#7e22ce", label: "Prompt" },
    config: { bg: "#ecfdf5", text: "#047857", label: "Config" },
  };
  return (
    styles[ext] || { bg: "#f9fafb", text: "#4b5563", label: ext.toUpperCase() || "File" }
  );
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
