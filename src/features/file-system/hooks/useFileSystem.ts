import { useState, useCallback, useEffect, useRef } from "react";
import { apiClient } from "../../../lib/api-client";
import { FileItem, FileItemWithContent } from "../types";

export function useFileSystem(token: string | null) {
  const [fileTree, setFileTree] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItemWithContent | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 记录项目根路径，防止面包屑导航越界
  const [rootPath, setRootPath] = useState<string>("");
  const rootPathInitialized = useRef(false);

  const listDirectory = useCallback(async (path: string) => {
    if (!token) return;

    setLoading(true);
    setError(null);

    console.log('listDirectory called with:', { path });

    try {
      const response = await apiClient.listFiles("", path);

      console.log('Backend response:', response);

      // 修复：不再使用 full_path，避免绝对路径问题
      // 改用相对路径 + item.name 构建
      const itemsWithPath: FileItem[] = response.items.map(item => {
        const itemRelativePath = path
          ? `${path}/${item.name}`
          : item.name;

        return {
          ...item,
          // full_path 现在是相对路径，不是绝对路径
          full_path: `/${itemRelativePath}`.replace(/\/+/g, '/'),
        }
      });

      console.log('Processed items:', itemsWithPath);

      setFileTree(itemsWithPath);

      // 使用传入的 path 参数作为 currentPath，确保目录导航正确
      setCurrentPath(path);
      setSelectedFile(null);

      // 首次加载时记录 rootPath
      if (!rootPathInitialized.current) {
        // 修复：使用响应的 full_path 作为根路径
        setRootPath(response.full_path.startsWith('/') ? response.full_path : `/${response.full_path}`);
        rootPathInitialized.current = true;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "加载失败";
      console.error('listDirectory error:', errorMessage, err);
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
          // 修复：传递相对路径而不是绝对路径
          const relativeRootPath = rootPath.startsWith('/opt/claude/')
            ? rootPath.replace(/^\/opt\/claude\//, '')
            : rootPath;
          apiClient.listFiles('', relativeRootPath).then(response => {
            const basePath = response.full_path.startsWith('/')
              ? response.full_path
              : `/${response.full_path}`;
            const itemsWithPath: FileItem[] = response.items.map(item => ({
              ...item,
              full_path: `${basePath}/${item.name}`.replace(/\/+/g, '/'),
            }));
            setFileTree(itemsWithPath);

            // 处理 path：确保是相对路径
            let processedPath = response.path;
            if (processedPath && processedPath.startsWith('/opt/claude/')) {
              processedPath = processedPath.replace(/^\/opt\/claude\//, '');
            }
            setCurrentPath(processedPath);
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

  const readFile = useCallback(async (path: string) => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.readFile("", path);
      const safeResponsePath = response.path || path || "";
      const fileWithContent: FileItemWithContent = {
        name: safeResponsePath.split("/").pop() || "",
        type: "file",
        size: response.size,
        modified_time: new Date().toISOString(),
        path: safeResponsePath,
        full_path: response.full_path || safeResponsePath,
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

    listDirectory(newPath);
  }, [currentPath, listDirectory]);

  const canNavigateUp = Boolean(currentPath);

  const refresh = useCallback(async () => {
    // 刷新当前目录列表
    await listDirectory(currentPath);

    // 如果当前有选中的文件，刷新文件内容
    if (selectedFile && selectedFile.full_path) {
      // 提取相对路径
      const filePath = selectedFile.full_path.replace(/^\//, '').replace(/^\/opt\/claude\//, '');
      await readFile(filePath);
    }
  }, [currentPath, selectedFile, listDirectory, readFile]);

  // 初始加载根目录
  useEffect(() => {
    if (token && fileTree.length === 0) {
      listDirectory("");
    }
  }, [token]);

  return {
    fileTree,
    selectedFile,
    setSelectedFile,
    currentPath,
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
