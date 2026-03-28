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
    const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name

    console.log('Item click:', { type: item.type, name: item.name, currentPath, itemPath })

    if (item.type === 'directory') {
      listDirectory(itemPath)
    } else {
      // 文件：使用统一的 path 参数
      readFile(itemPath)
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
