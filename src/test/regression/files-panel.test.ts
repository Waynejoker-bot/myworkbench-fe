/**
 * FilesPanel 完整需求 & 测试用例
 *
 * ## 需求（基于现有组件 + API）
 *
 * FilesPanel 复用原有 file-system feature 组件：
 * - useFileSystem hook: 管理 fileTree/selectedFile/currentPath/loading/error
 * - FileList: 渲染目录列表，点击文件/文件夹
 * - FileViewer: 渲染文件内容（Markdown/代码高亮/纯文本）
 * - Breadcrumb: 路径导航
 *
 * ### 后端 API:
 * - GET /api/fs/list?prefix=&path= → { success, items: [{name,type,size,modified_time}] }
 * - GET /api/fs/read?path= → { success, content, size, encoding }
 * - 需要 Bearer Token 认证（通过 apiClient 自动附加）
 *
 * ### 一级页: 目录浏览
 * - 初始加载根目录
 * - 文件列表：图标(Folder/File) + 名称 + 大小
 * - 点击文件夹 → 进入子目录
 * - 面包屑导航：显示当前路径，每段可点击跳转
 * - loading/error/empty 状态
 * - 401 → 提示需要登录
 *
 * ### 二级页: 文件预览
 * - 点击文件 → 调 readFile → 显示内容
 * - ← 返回按钮 + 文件名顶栏
 * - .md → Markdown 渲染
 * - .ts/.js/.py/.json → 代码高亮
 * - 其他 → 纯文本
 *
 * ### 导航:
 * - 面包屑点击 → 跳到对应目录
 * - 文件预览 ← 返回 → 回到目录列表
 */

import { describe, test, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC = path.resolve(__dirname, '../../')

function readSrc(filePath: string): string {
  const full = path.join(SRC, filePath)
  if (!fs.existsSync(full)) return ''
  return fs.readFileSync(full, 'utf-8')
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(path.join(SRC, filePath))
}

describe('FilesPanel — 组件结构', () => {
  test('FilesPanel.tsx 应包含状态管理（非静态占位符）', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    expect(src).toBeTruthy() // file exists
    const hasState = /useState|useReducer|useFileSystem/.test(src)
    expect(hasState).toBe(true)
  })

  test('FilesPanel 应导入 apiClient 或 useAuth 以调用认证 API', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasAuth = /apiClient|useAuth|api-client/.test(src)
    expect(hasAuth).toBe(true)
  })

  test('FilesPanel 应有视图切换逻辑（目录列表 vs 文件预览）', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasViewSwitch = /selectedFile|viewMode|isViewingFile|fileContent/.test(src)
    expect(hasViewSwitch).toBe(true)
  })
})

describe('FilesPanel — 目录浏览（一级页）', () => {
  test('组件挂载时应调用 listFiles 或 /api/fs/list', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const callsAPI = /listFiles|listDirectory|\/api\/fs\/list|useFileSystem/.test(src)
    expect(callsAPI).toBe(true)
  })

  test('应维护 currentPath 状态用于目录导航', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasPath = /currentPath|currentDir|setCurrentPath|useFileSystem/.test(src)
    expect(hasPath).toBe(true)
  })

  test('应遍历渲染文件列表项（.map）', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasList = /\.map\s*\(|FileList|items\.map|fileTree\.map/.test(src)
    expect(hasList).toBe(true)
  })

  test('应区分文件夹图标和文件图标', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasFolderIcon = /Folder|FolderOpen|directory|type.*===.*dir/.test(src)
    expect(hasFolderIcon).toBe(true)
  })

  test('点击文件夹应导航到子目录', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasDirNav = /onClick.*directory|navigateToDir|listDirectory|setCurrentPath|onSelect.*dir/.test(src)
    expect(hasDirNav).toBe(true)
  })

  test('应显示面包屑导航', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasBreadcrumb = /Breadcrumb|breadcrumb|pathSegments|path.*split/.test(src)
    expect(hasBreadcrumb).toBe(true)
  })

  test('应显示加载状态', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasLoading = /loading|isLoading|Loader|spinner|加载/.test(src)
    expect(hasLoading).toBe(true)
  })

  test('应显示错误状态 + 重试', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasError = /error|Error|重试|retry|失败/.test(src)
    expect(hasError).toBe(true)
  })

  test('空目录应显示友好提示', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasEmpty = /空文件|empty|暂无|no files|items.*length.*===?\s*0|fileTree.*length/.test(src)
    expect(hasEmpty).toBe(true)
  })
})

describe('FilesPanel — 文件预览（二级页）', () => {
  test('点击文件应触发 readFile / 文件内容加载', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasRead = /readFile|\/api\/fs\/read|setSelectedFile|openFile|onSelect.*file/.test(src)
    expect(hasRead).toBe(true)
  })

  test('文件预览应有 ← 返回按钮', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasBack = /ArrowLeft|goBack|backToList|返回|clearSelectedFile|setSelectedFile\(null\)/.test(src)
    expect(hasBack).toBe(true)
  })

  test('应支持 Markdown 渲染（.md 文件）', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    // Either inline or via FileViewer component
    const hasMarkdown = /renderMarkdown|markdown|dangerouslySetInnerHTML|FileViewer|\.md/.test(src)
    expect(hasMarkdown).toBe(true)
  })

  test('应支持代码高亮（.ts/.js/.py 等文件）', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasHighlight = /highlight|hljs|syntax|FileViewer|<pre|<code/.test(src)
    expect(hasHighlight).toBe(true)
  })

  test('应显示文件名', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasName = /selectedFile.*name|fileName|file\.name|FileViewer/.test(src)
    expect(hasName).toBe(true)
  })
})

describe('FilesPanel — 导航', () => {
  test('应支持返回上级目录', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasGoUp = /navigateUp|goUp|parentPath|\.\.\/|path.*slice|Breadcrumb/.test(src)
    expect(hasGoUp).toBe(true)
  })

  test('面包屑各段应可点击跳转', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasBreadcrumbClick = /Breadcrumb.*onNavigate|breadcrumb.*onClick|segment.*click|onBreadcrumbClick/.test(src)
    expect(hasBreadcrumbClick).toBe(true)
  })
})

describe('FilesPanel — 认证', () => {
  test('应使用 useAuth 或 apiClient 获取 token', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const hasAuth = /useAuth|apiClient|token/.test(src)
    expect(hasAuth).toBe(true)
  })

  test('应处理 401 错误（提示需要登录）', () => {
    const src = readSrc('components/panel/panels/FilesPanel.tsx')
    const has401 = /401|unauthorized|未授权|需要登录|登录/.test(src)
    expect(has401).toBe(true)
  })
})

// ============== ToolsPanel ==============

describe('ToolsPanel — 需求', () => {
  test('不应使用硬编码的占位工具列表', () => {
    const src = readSrc('components/panel/panels/ToolsPanel.tsx')
    const hasHardcoded = /placeholderTools|代码执行|网络请求|数据库查询/.test(src)
    expect(hasHardcoded).toBe(false)
  })

  test('应从 Agent 数据读取工具列表', () => {
    const src = readSrc('components/panel/panels/ToolsPanel.tsx')
    const readsAgent = /useAgents|agentId|agent\.tools|agents.*find/.test(src)
    expect(readsAgent).toBe(true)
  })

  test('Agent 无工具时应显示空状态', () => {
    const src = readSrc('components/panel/panels/ToolsPanel.tsx')
    const hasEmpty = /暂无工具|没有可用|no tools|tools.*length.*0/.test(src)
    expect(hasEmpty).toBe(true)
  })

  test('每个工具应显示名称', () => {
    const src = readSrc('components/panel/panels/ToolsPanel.tsx')
    const hasToolName = /tool\.name|tool\[|\.name/.test(src)
    expect(hasToolName).toBe(true)
  })
})

// ============== Agent CRUD API ==============

describe('Agent CRUD — API 函数', () => {
  test('api/agent.ts 应导出 createAgent/createChannel 函数', () => {
    const src = readSrc('api/agent.ts')
    const hasCreate = /export.*(async\s+)?function\s+(createAgent|createChannel)|export\s+const\s+(createAgent|createChannel)/.test(src)
    expect(hasCreate).toBe(true)
  })

  test('api/agent.ts 应导出 deleteAgent/deleteChannel 函数', () => {
    const src = readSrc('api/agent.ts')
    const hasDelete = /export.*(async\s+)?function\s+(deleteAgent|deleteChannel)|export\s+const\s+(deleteAgent|deleteChannel)/.test(src)
    expect(hasDelete).toBe(true)
  })

  test('api/agent.ts 应导出 updateAgent/updateChannel 函数', () => {
    const src = readSrc('api/agent.ts')
    const hasUpdate = /export.*(async\s+)?function\s+(updateAgent|updateChannel)|export\s+const\s+(updateAgent|updateChannel)/.test(src)
    expect(hasUpdate).toBe(true)
  })
})

// ============== AgentPanel 创建新 Agent ==============

describe('AgentPanel — 创建新 Agent', () => {
  test('"创建新 Agent" 按钮应有 onClick 处理函数', () => {
    const src = readSrc('components/panel/panels/AgentPanel.tsx')
    const idx = src.indexOf('创建新 Agent')
    const createBtnArea = src.slice(Math.max(0, idx - 600), idx + 300)
    const hasHandler = /onClick\s*=\s*\{/.test(createBtnArea)
    expect(hasHandler).toBe(true)
  })

  test('应有创建 Agent 的表单或弹窗', () => {
    const src = readSrc('components/panel/panels/AgentPanel.tsx')
    const hasForm = /showCreate|createForm|createModal|isCreatingAgent|newAgentName/.test(src)
    expect(hasForm).toBe(true)
  })

  test('创建表单应包含 Agent 名称输入', () => {
    const src = readSrc('components/panel/panels/AgentPanel.tsx')
    const hasNameInput = /agentName|newAgent.*name|input.*name|placeholder.*名称/.test(src)
    expect(hasNameInput).toBe(true)
  })

  test('创建提交应调用 createAgent/createChannel API', () => {
    const src = readSrc('components/panel/panels/AgentPanel.tsx')
    const callsAPI = /createAgent|createChannel|POST.*channel/.test(src)
    expect(callsAPI).toBe(true)
  })
})

// ============== AgentPanel 编辑/删除 ==============

describe('AgentPanel — 编辑保存', () => {
  test('编辑保存按钮应调用 updateAgent/updateChannel API（非空操作）', () => {
    const src = readSrc('components/panel/panels/AgentPanel.tsx')
    // Find the save button area
    const saveArea = src.match(/保存[\s\S]{0,300}/)?.[0] || ''
    const justClosesEdit = /onClick.*setIsEditing\(false\)/.test(saveArea) && !/updateAgent|updateChannel|apiClient/.test(saveArea)
    expect(justClosesEdit).toBe(false) // should NOT just close edit mode
  })
})

describe('AgentPanel — 删除', () => {
  test('删除确认按钮应调用 deleteAgent/deleteChannel API（非空操作）', () => {
    const src = readSrc('components/panel/panels/AgentPanel.tsx')
    // Find the delete confirm button area
    const deleteArea = src.match(/删除[\s\S]{0,500}?<\/button>/g)?.pop() || ''
    const justClosesModal = /onClick.*setShowDeleteModal\(false\)/.test(deleteArea) && !/deleteAgent|deleteChannel|apiClient/.test(deleteArea)
    expect(justClosesModal).toBe(false) // should NOT just close modal
  })
})

// ============== 原有 file-system 组件存在性 ==============

describe('File System 组件可用性', () => {
  test('useFileSystem hook 文件应存在', () => {
    // 可能在 features/file-system/hooks/ 或已迁移到其他位置
    const exists = fileExists('features/file-system/hooks/useFileSystem.ts') ||
                   fileExists('hooks/useFileSystem.ts')
    expect(exists).toBe(true)
  })

  test('FileList 组件应存在', () => {
    const exists = fileExists('features/file-system/components/FileList.tsx') ||
                   fileExists('components/file-system/FileList.tsx') ||
                   // 或者内联在 FilesPanel 里
                   readSrc('components/panel/panels/FilesPanel.tsx').includes('FileList')
    expect(exists).toBe(true)
  })

  test('FileViewer 组件应存在', () => {
    const exists = fileExists('features/file-system/components/FileViewer.tsx') ||
                   fileExists('components/file-system/FileViewer.tsx') ||
                   readSrc('components/panel/panels/FilesPanel.tsx').includes('FileViewer')
    expect(exists).toBe(true)
  })

  test('Breadcrumb 组件应存在', () => {
    const exists = fileExists('features/file-system/components/Breadcrumb.tsx') ||
                   fileExists('components/file-system/Breadcrumb.tsx') ||
                   readSrc('components/panel/panels/FilesPanel.tsx').includes('Breadcrumb') ||
                   readSrc('components/panel/panels/FilesPanel.tsx').includes('breadcrumb')
    expect(exists).toBe(true)
  })
})
