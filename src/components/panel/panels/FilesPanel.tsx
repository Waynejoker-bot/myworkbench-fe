import { useEffect } from 'react'
import { ArrowLeft, Loader2, AlertCircle, FolderOpen } from 'lucide-react'
import type { PanelProps } from '@/types/panel-plugin'
import { useAuth } from '@/contexts/AuthContext'
import { useFileSystem } from '@/features/file-system/hooks/useFileSystem'
import { FileList } from '@/features/file-system/components/FileList'
import { FileViewer } from '@/features/file-system/components/FileViewer'
import { Breadcrumb } from '@/features/file-system/components/Breadcrumb'
import type { FileItem } from '@/features/file-system/types'

export function FilesPanel({ sessionId: _sessionId, agentId: _agentId, isActive: _isActive }: PanelProps) {
  const { token, needsLogin } = useAuth()
  const {
    fileTree,
    selectedFile,
    currentPath,
    loading,
    error,
    rootPath,
    listDirectory,
    readFile,
    setSelectedFile,
  } = useFileSystem(token)

  // Load root on mount
  useEffect(() => {
    if (token) {
      listDirectory('')
    }
  }, [token])

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'directory') {
      // 调试信息
      console.log('Directory click debug:', {
        name: item.name,
        currentPath,
        item_full_path: item.full_path,
        rootPath
      })

      // 在当前路径基础上构建新路径
      // 使用相对路径，避免使用 full_path
      const newPath = currentPath ? `${currentPath}/${item.name}` : item.name

      console.log('Calling listDirectory with path:', newPath)

      // 修复：始终传空 prefix，path 传完整相对路径
      listDirectory(newPath)
    } else {
      // 调试信息
      console.log('File click debug:', {
        full_path: item.full_path,
        rootPath,
        currentPath,
        name: item.name
      })

      // 修复：文件读取时，需要正确解析 prefix 和 path
      // 1. 提取路径中的文件部分
      // 2. 如果文件在根目录（rootPath 下），使用空 prefix
      // 3. 如果文件在子目录中，提取正确的 prefix 和 path

      let filePrefix = '';
      let filePath = '';

      if (rootPath && item.full_path && item.full_path.startsWith(rootPath)) {
        // full_path 包含 rootPath，提取相对部分
        const relativePart = item.full_path.slice(rootPath.length).replace(/^\//, '');

        if (relativePart.includes('/')) {
          // 子目录中的文件：如 "operations/file.txt"
          const pathParts = relativePart.split('/');
          filePrefix = pathParts[0] ?? '';
          filePath = pathParts.slice(1).join('/');
        } else {
          // 根目录中的文件：如 "file.txt"
          filePrefix = '';
          filePath = relativePart;
        }

        console.log('Parsed file path:', { rootPath, full_path: item.full_path, filePrefix, filePath });

        // 确保 filePath 至少是文件名
        if (!filePath) {
          filePath = item.name;
        }

        if (filePath) {  // 确保 filePath 不是空
          readFile(filePrefix, filePath);
        }
      } else {
        // fallback：直接使用 name
        console.log('Fallback: using item.name only');
        readFile('', item.name || '');
      }
    }
  }

  const handleBack = () => {
    setSelectedFile(null)
  }

  // 401 / needs login state
  if (needsLogin || (!token && !loading)) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ background: '#f9fafb' }}>
        <AlertCircle className="h-8 w-8 mb-3" style={{ color: '#f59e0b' }} />
        <div className="text-sm font-medium" style={{ color: '#111827' }}>需要登录</div>
        <div className="text-xs mt-1" style={{ color: '#64748b' }}>请先登录后再访问文件系统</div>
      </div>
    )
  }

  // File preview view
  if (selectedFile) {
    return (
      <div className="flex flex-col h-full" style={{ background: '#f9fafb', color: '#111827' }}>
        {/* Top bar with back button */}
        <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #d1d5db' }}>
          <button
            onClick={handleBack}
            className="p-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ background: '#f3f4f6' }}
            title="返回目录"
          >
            <ArrowLeft className="h-4 w-4" style={{ color: '#111827' }} />
          </button>
          <span className="text-sm font-medium truncate" style={{ color: '#111827' }}>
            {selectedFile.name}
          </span>
        </div>
        {/* File content */}
        <div className="flex-1 overflow-auto">
          <FileViewer
            file={selectedFile}
            loading={loading}
            error={error}
            onNavigateUp={handleBack}
          />
        </div>
      </div>
    )
  }

  // Directory view
  return (
    <div className="flex flex-col h-full" style={{ background: '#f9fafb', color: '#111827' }}>
      {/* Breadcrumb */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #d1d5db' }}>
        <Breadcrumb path={currentPath} rootPath={rootPath} onNavigate={listDirectory} />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#0ea5e9' }} />
            <span className="text-sm" style={{ color: '#64748b' }}>加载中...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <AlertCircle className="h-6 w-6" style={{ color: '#ef4444' }} />
            <span className="text-sm text-center" style={{ color: '#ef4444' }}>{error}</span>
            <button
              onClick={() => listDirectory(currentPath)}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ background: '#f3f4f6', color: '#0ea5e9', border: '1px solid #d1d5db' }}
            >
              重试
            </button>
          </div>
        ) : fileTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <FolderOpen className="h-8 w-8" style={{ color: '#64748b' }} />
            <span className="text-sm" style={{ color: '#64748b' }}>空文件夹</span>
          </div>
        ) : (
          <FileList
            items={fileTree}
            selectedFile={null}
            onSelect={handleItemClick}
            currentPath={currentPath}
          />
        )}
      </div>
    </div>
  )
}
