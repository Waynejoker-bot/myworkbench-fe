// File System Types

export type FileType = "file" | "directory";

export interface FileItem {
  name: string;
  type: FileType;
  size: number | null;
  modified_time: string;
  full_path?: string;
}

export interface ListResponse {
  success: boolean;
  prefix: string;
  path: string;
  full_path: string;
  items: FileItem[];
}

export interface ReadResponse {
  success: boolean;
  prefix: string;
  path: string;
  full_path: string;
  content: string;
  size: number;
  encoding: string;
}

export interface InfoResponse {
  success: boolean;
  prefix: string;
  path: string;
  full_path: string;
  type: FileType;
  size: number | null;
  created_time: string | null;
  modified_time: string | null;
}

export interface LoginRequest {
  username?: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ErrorResponse {
  success: false;
  error: string;
  detail?: string;
}

// Extended FileItem with optional content for selected file
export interface FileItemWithContent extends FileItem {
  path?: string;
  full_path?: string;
  content?: string;
}
