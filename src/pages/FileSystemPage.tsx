import { FileList } from "@/features/file-system/components/FileList";
import { FileViewer } from "@/features/file-system/components/FileViewer";
import { Breadcrumb } from "@/features/file-system/components/Breadcrumb";
import { useFileSystem } from "@/features/file-system/hooks/useFileSystem";
import { useAuth } from "@/contexts/AuthContext";
import { LoginDialog as GlobalLoginDialog } from "@/components/LoginDialog";
import { Link } from "react-router-dom";
import { Home, LogOut, Loader2, RefreshCw } from "lucide-react";

function FileSystemPageContent() {
  const { token, logout, isAuthenticated, needsLogin } = useAuth();
  const {
    fileTree,
    selectedFile,
    currentPath,
    prefix,
    loading,
    error,
    listDirectory,
    readFile,
    navigateUp,
    canNavigateUp,
    refresh,
  } = useFileSystem(token);

  // 未认证或需要重新登录时显示登录弹窗
  if (!isAuthenticated || needsLogin) {
    return <GlobalLoginDialog />;
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/">
            <button className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              <Home className="h-4 w-4" />
              <span>返回首页</span>
            </button>
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <Breadcrumb
            prefix={prefix}
            path={currentPath}
            onNavigate={listDirectory}
          />
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>登出</span>
        </button>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: File List */}
        <div className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              文件列表
            </h2>
            <button
              onClick={refresh}
              disabled={loading}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="刷新"
            >
              <RefreshCw className={`h-4 w-4 text-slate-500 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <FileList
                items={fileTree}
                selectedFile={selectedFile}
                currentPath={currentPath}
                onSelect={(item) => {
                  if (item.type === "directory") {
                    listDirectory(prefix, currentPath ? `${currentPath}/${item.name}` : item.name);
                  } else {
                    // 使用 full_path 来读取文件，不使用 prefix
                    const fullPath = item.full_path || `/${prefix}/${currentPath}/${item.name}`.replace(/\/+/g, '/');
                    readFile("", fullPath);
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Right: File Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <FileViewer
            file={selectedFile}
            loading={loading}
            error={error}
            onNavigateUp={canNavigateUp ? () => navigateUp() : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function FileSystemPage() {
  return <FileSystemPageContent />;
}

export default FileSystemPage;
