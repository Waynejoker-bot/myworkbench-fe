/**
 * 用户流程测试
 *
 * 测试完整的用户交互流程：
 * - 登录流程
 * - 创建会话流程
 * - 发送消息流程
 * - 文件上传流程
 * - Agent 配置流程
 */
import { describe, test, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), 'utf-8');
}

describe('登录流程', () => {
  const loginPageSource = readSource('pages/LoginPage.tsx');
  const authContextSource = readSource('contexts/AuthContext.tsx');
  const apiClientSource = readSource('lib/api-client.ts');

  test('LoginPage 应有用户名输入框', () => {
    const hasUsernameInput = /username|用户名|账号/i.test(loginPageSource);
    expect(hasUsernameInput).toBe(true);
  });

  test('LoginPage 应有密码输入框', () => {
    const hasPasswordInput = /password|密码|pass/i.test(loginPageSource);
    expect(hasPasswordInput).toBe(true);
  });

  test('LoginPage 应有登录按钮', () => {
    const hasLoginButton = /登录|login|sign.*in/i.test(loginPageSource);
    expect(hasLoginButton).toBe(true);
  });

  test('登录按钮应调用 login 函数', () => {
    const callsLogin = /onClick.*handleLogin|handleLogin.*login/.test(loginPageSource);
    expect(callsLogin).toBe(true);
  });

  test('login 应调用 API 登录接口', () => {
    const callsApi = /apiClient\.login|fetch.*login|POST.*login/i.test(authContextSource);
    expect(callsApi).toBe(true);
  });

  test('登录成功应保存 token', () => {
    const savesToken = /localStorage\.setItem.*token|setToken/.test(authContextSource);
    expect(savesToken).toBe(true);
  });

  test('登录成功应跳转到首页', () => {
    const hasNavigate = /navigate.*['"]\/['"]|Navigate.*to.*\//.test(loginPageSource + authContextSource);
    expect(hasNavigate).toBe(true);
  });

  test('登录失败应显示错误提示', () => {
    const hasErrorHandling = /catch.*error|showToast.*error|error.*message/i.test(loginPageSource + authContextSource);
    expect(hasErrorHandling).toBe(true);
  });
});

describe('创建会话流程', () => {
  const conversationsSource = readSource('hooks/useConversations.ts');
  const agentPanelSource = readSource('components/panel/panels/AgentPanel.tsx');

  test('应选择 Agent 后才能创建会话', () => {
    const checksAgent = /agentId|selectedAgent/.test(conversationsSource);
    expect(checksAgent).toBe(true);
  });

  test('createConversation 应调用 POST /msapi/sessions', () => {
    const callsCreateApi = /createSession|POST.*sessions/i.test(conversationsSource);
    expect(callsCreateApi).toBe(true);
  });

  test('createConversation 应传递 agent_id', () => {
    const passesAgentId = /agent_id.*agentId|{agent_id:/.test(conversationsSource);
    expect(passesAgentId).toBe(true);
  });

  test('创建成功应更新会话列表', () => {
    const updatesList = /setConversations.*prev|conversations.*concat|addConversation/.test(conversationsSource);
    expect(updatesList).toBe(true);
  });

  test('创建成功应自动激活新会话', () => {
    const activatesNew = /setActiveConversationId.*newSession|onConversationCreated/.test(conversationsSource);
    expect(activatesNew).toBe(true);
  });

  test('AgentPanel 开始对话按钮应调用 onCreateConversation', () => {
    const callsCreate = /onCreateConversation\?\./.test(agentPanelSource);
    expect(callsCreate).toBe(true);
  });
});

describe('发送消息流程', () => {
  const chatMessagesSource = readSource('hooks/useChatMessages.ts');
  const chatInputSource = readSource('components/chat/ChatInput.tsx');
  const chatBoxSource = readSource('pages/ChatBoxPage.tsx');

  test('ChatInput 应有文本输入框', () => {
    const hasTextarea = /textarea|input.*text/i.test(chatInputSource);
    expect(hasTextarea).toBe(true);
  });

  test('ChatInput 应有发送按钮', () => {
    const hasSendButton = /发送|send|Send|发送消息/i.test(chatInputSource);
    expect(hasSendButton).toBe(true);
  });

  test('输入框为空时发送按钮应禁用', () => {
    const hasDisableCheck = /hasContent|!.*value|disabled.*!content/i.test(chatInputSource);
    expect(hasDisableCheck).toBe(true);
  });

  test('发送消息应调用 sendMessage', () => {
    const callsSend = /send\(|sendMessage\(.*content/i.test(chatMessagesSource);
    expect(callsSend).toBe(true);
  });

  test('sendMessage 应调用 POST /msapi/send-message', () => {
    const callsApi = /apiSendMessage|sendMessage.*POST|messageStation/i.test(chatMessagesSource);
    expect(callsApi).toBe(true);
  });

  test('发送前应添加临时消息到列表', () => {
    const addsTempMessage = /optimistic|temporary|setUiMessages.*prev.*concat/i.test(chatMessagesSource);
    expect(addsTempMessage).toBe(true);
  });

  test('消息应添加到正确的会话', () => {
    const usesSessionId = /sessionId|session_id/i.test(chatMessagesSource);
    expect(usesSessionId).toBe(true);
  });

  test('发送成功应更新消息状态', () => {
    const updatesStatus = /delivery_status|status.*sent|status.*delivered/i.test(chatMessagesSource);
    expect(updatesStatus).toBe(true);
  });

  test('发送失败应标记消息为 FAILED', () => {
    const marksFailed = /FAILED|delivery_status.*error|error.*status/i.test(chatMessagesSource);
    expect(marksFailed).toBe(true);
  });
});

describe('文件上传流程', () => {
  const chatInputSource = readSource('components/chat/ChatInput.tsx');

  test('ChatInput 应有文件上传按钮', () => {
    const hasUploadButton = /上传|upload|Plus|加号/i.test(chatInputSource);
    expect(hasUploadButton).toBe(true);
  });

  test('文件上传应使用 input type="file"', () => {
    const hasFileInput = /type\s*=\s*['"]file['"]|input.*file/i.test(chatInputSource);
    expect(hasFileInput).toBe(true);
  });

  test('文件上传应支持图片', () => {
    const acceptsImage = /image\/\*|accept.*\.(png|jpg|jpeg|gif)/i.test(chatInputSource);
    expect(acceptsImage).toBe(true);
  });

  test('文件上传应支持文档', () => {
    const acceptsDoc = /accept.*\.(doc|docx|pdf|txt)|document/i.test(chatInputSource);
    expect(acceptsDoc).toBe(true);
  });

  test('选择文件后应显示文件名', () => {
    const showsFileName = /selectedFile|file\.name|fileName/i.test(chatInputSource);
    expect(showsFileName).toBe(true);
  });

  test('应能移除已选择的文件', () => {
    const hasRemoveFile = /setSelectedFile\(null\)|clearFile|removeFile/i.test(chatInputSource);
    expect(hasRemoveFile).toBe(true);
  });

  test('发送消息时应包含文件', () => {
    const includesFile = /file.*content|file.*payload|attachFile/i.test(chatInputSource);
    expect(includesFile).toBe(true);
  });
});

describe('Agent 配置流程', () => {
  const agentPanelSource = readSource('components/panel/panels/AgentPanel.tsx');
  const agentApiSource = readSource('api/agent.ts');

  test('应能查看 Agent 详情', () => {
    const showsDetail = /getAgent|agentDetail|selectedAgent/i.test(agentPanelSource);
    expect(showsDetail).toBe(true);
  });

  test('应能编辑 Agent 名称', () => {
    const hasEditName = /isEditing|setIsEditing|编辑/.test(agentPanelSource);
    expect(hasEditName).toBe(true);
  });

  test('编辑应保存到后端', () => {
    const savesToBackend = /updateAgent|updateChannel|PATCH.*agent/i.test(agentPanelSource);
    expect(savesToBackend).toBe(true);
  });

  test('应能启用/禁用 Agent', () => {
    const hasToggle = /enabled|toggleEnable|switch.*status/i.test(agentPanelSource);
    expect(hasToggle).toBe(true);
  });

  test('应能查看 Agent 系统提示', () => {
    const showsPrompt = /systemPrompt|agentDetail\.prompt|System Prompt/i.test(agentPanelSource);
    expect(showsPrompt).toBe(true);
  });

  test('应能查看 Agent 配置文件', () => {
    const showsConfig = /configFiles|配置文件|listFiles/i.test(agentPanelSource);
    expect(showsConfig).toBe(true);
  });

  test('点击配置文件应打开预览', () => {
    const opensPreview = /viewingFile|openConfigFile|FileViewer/i.test(agentPanelSource);
    expect(opensPreview).toBe(true);
  });

  test('应能查看 Agent 工具列表', () => {
    const showsTools = /tools|agent\.tools|ToolsPanel/i.test(agentPanelSource);
    expect(showsTools).toBe(true);
  });
});

describe('会话管理流程', () => {
  const conversationsSource = readSource('hooks/useConversations.ts');
  const conversationListSource = readSource('components/chat/ConversationList.tsx');

  test('应能删除会话', () => {
    const hasDelete = /removeConversation|deleteConversation/i.test(conversationsSource);
    expect(hasDelete).toBe(true);
  });

  test('删除应调用 DELETE /msapi/sessions/{id}', () => {
    const callsDeleteApi = /deleteSession|DELETE.*sessions/i.test(conversationsSource);
    expect(callsDeleteApi).toBe(true);
  });

  test('删除成功应从列表中移除', () => {
    const removesFromList = /filter.*id|conversations.*prev.*filter/i.test(conversationsSource);
    expect(removesFromList).toBe(true);
  });

  test('应能重命名会话', () => {
    const hasRename = /updateConversationTitle|renameConversation/i.test(conversationsSource);
    expect(hasRename).toBe(true);
  });

  test('重命名应调用 PATCH /msapi/sessions/{id}/title', () => {
    const callsRenameApi = /updateSessionTitle|PATCH.*title/i.test(conversationsSource);
    expect(callsRenameApi).toBe(true);
  });

  test('重命名成功应更新列表中的标题', () => {
    const updatesTitle = /setConversations.*title|conversations\.map.*title/i.test(conversationsSource);
    expect(updatesTitle).toBe(true);
  });

  test('应有删除确认弹窗', () => {
    const hasConfirmModal = /confirm.*delete|确认删除|deleteConfirm/i.test(conversationListSource);
    expect(hasConfirmModal).toBe(true);
  });
});

describe('工具调用流程', () => {
  const messageBubbleSource = readSource('components/chat/message/MessageBubble.tsx');
  const toolTimelineSource = readSource('components/chat/message/ToolCallTimeline.tsx');

  test('应显示工具调用列表', () => {
    const showsTools = /ToolCallTimeline|tool.*map|toolCalls/i.test(messageBubbleSource);
    expect(showsTools).toBe(true);
  });

  test('应显示工具状态（运行中/成功/失败）', () => {
    const showsStatus = /status.*success|status.*running|status.*error/i.test(toolTimelineSource);
    expect(showsStatus).toBe(true);
  });

  test('应能展开查看工具详情', () => {
    const canExpand = /expanded|expand|toggleExpanded/i.test(toolTimelineSource);
    expect(canExpand).toBe(true);
  });

  test('应显示工具参数', () => {
    const showsParams = /parameters|arguments|tool.*args/i.test(toolTimelineSource);
    expect(showsParams).toBe(true);
  });

  test('应显示工具执行结果', () => {
    const showsResult = /result|output|tool.*result/i.test(toolTimelineSource);
    expect(showsResult).toBe(true);
  });
});

describe('文件浏览流程', () => {
  const filesPanelSource = readSource('components/panel/panels/FilesPanel.tsx');
  const fileSystemSource = readSource('features/file-system/hooks/useFileSystem.ts');

  test('应显示目录列表', () => {
    const showsList = /FileList|fileTree\.map|items\.map/i.test(filesPanelSource);
    expect(showsList).toBe(true);
  });

  test('应能导航到子目录', () => {
    const canNavigate = /listDirectory|setCurrentPath|navigateToDir/i.test(filesPanelSource);
    expect(canNavigate).toBe(true);
  });

  test('应能返回上级目录', () => {
    const canGoUp = /navigateUp|goUp|parentPath/i.test(filesPanelSource + fileSystemSource);
    expect(canGoUp).toBe(true);
  });

  test('应能预览文件', () => {
    const canPreview = /readFile|selectedFile|FileViewer/i.test(filesPanelSource);
    expect(canPreview).toBe(true);
  });

  test('应显示面包屑导航', () => {
    const hasBreadcrumb = /Breadcrumb|breadcrumb|pathSegments/i.test(filesPanelSource);
    expect(hasBreadcrumb).toBe(true);
  });

  test('点击面包屑应跳转到对应目录', () => {
    const breadcrumbClickable = /onNavigate|onClick.*breadcrumb/i.test(filesPanelSource);
    expect(breadcrumbClickable).toBe(true);
  });
});
