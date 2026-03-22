import { useState, useCallback, useEffect, useRef } from "react";
import { apiClient } from "../../../lib/api-client";
import { FileItem, FileItemWithContent } from "../types";

export function useFileSystem(token: string | null) {
  const [fileTree, setFileTree] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItemWithContent | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 记录项目根路径，防止面包屑导航越界
  const [rootPath, setRootPath] = useState<string>("");
  const rootPathInitialized = useRef(false);

  const listDirectory = useCallback(async (newPrefix: string, newPath: string) => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.listFiles(newPrefix, newPath);
      // 为每个文件项添加 full_path，确保以 / 开头
      const basePath = response.full_path.startsWith('/')
        ? response.full_path
        : `/${response.full_path}`;
      const itemsWithPath: FileItem[] = response.items.map(item => ({
        ...item,
        full_path: `${basePath}/${item.name}`.replace(/\/+/g, '/'),
      }));
      setFileTree(itemsWithPath);
      setCurrentPath(response.path);
      setPrefix(response.prefix);
      setSelectedFile(null);

      // 首次加载时记录 rootPath
      if (!rootPathInitialized.current) {
        setRootPath(basePath);
        rootPathInitialized.current = true;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "加载失败";
      setError(errorMessage);
      setFileTree([]);

      // 如果是 "out of project range" 错误，自动回退到 rootPath
      if (
        rootPathInitialized.current &&
        errorMessage.toLowerCase().includes('out of project range')
      ) {
        // 延迟一点回退，让用户看到错误提示
        setTimeout(() => {
          setError(null);
          setLoading(true);
          apiClient.listFiles('', rootPath).then(response => {
            const basePath = response.full_path.startsWith('/')
              ? response.full_path
              : `/${response.full_path}`;
            const itemsWithPath: FileItem[] = response.items.map(item => ({
              ...item,
              full_path: `${basePath}/${item.name}`.replace(/\/+/g, '/'),
            }));
            setFileTree(itemsWithPath);
            setCurrentPath(response.path);
            setPrefix(response.prefix);
          }).catch(() => {
            // fallback 也失败了，保持错误状态
          }).finally(() => {
            setLoading(false);
          });
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  }, [token, rootPath]);

  const readFile = useCallback(async (filePrefix: string, filePath: string) => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.readFile(filePrefix, filePath);
      const fileWithContent: FileItemWithContent = {
        name: response.path.split("/").pop() || "",
        type: "file",
        size: response.size,
        modified_time: new Date().toISOString(),
        path: response.path,
        full_path: response.full_path,
        content: response.content,
      };
      setSelectedFile(fileWithContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取文件失败");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const navigateUp = useCallback(() => {
    if (!currentPath) return;

    const pathParts = currentPath.split("/");
    pathParts.pop();
    const newPath = pathParts.join("/");

    listDirectory(prefix, newPath);
  }, [currentPath, prefix, listDirectory]);

  const canNavigateUp = Boolean(currentPath);

  const refresh = useCallback(async () => {
    // 刷新当前目录列表
    await listDirectory(prefix, currentPath);

    // 如果当前有选中的文件，刷新文件内容
    if (selectedFile && selectedFile.full_path) {
      const fullPath = selectedFile.full_path.startsWith('/')
        ? selectedFile.full_path
        : `/${selectedFile.full_path}`;
      await readFile("", fullPath);
    }
  }, [prefix, currentPath, selectedFile, listDirectory, readFile]);

  // 初始加载根目录
  useEffect(() => {
    if (token && fileTree.length === 0) {
      listDirectory("", "");
    }
  }, [token]);

  return {
    fileTree,
    selectedFile,
    setSelectedFile,
    currentPath,
    prefix,
    loading,
    error,
    rootPath,
    listDirectory,
    readFile,
    navigateUp,
    canNavigateUp,
    refresh,
  };
}
