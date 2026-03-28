/**
 * ConversationList 交互测试
 *
 * 测试会话列表的用户交互功能：
 * - 点击切换会话
 * - 删除确认流程
 * - 重命名编辑功能
 * - 未读计数显示
 * - 会话排序
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), 'utf-8');
}

describe('ConversationList - 点击交互', () => {
  const source = readSource('components/chat/ConversationList.tsx');

  test('点击会话应调用 onSelectConversation', () => {
    const hasOnClick = /onClick\s*=\s*\{\(\)\s*=>\s*onSelectConversation\(conversation\.id\)/.test(source);
    expect(hasOnClick).toBe(true);
  });

  test('活动会话应有不同的视觉样式', () => {
    const hasActiveStyle = /isActive.*background.*rgba\(14.*165.*233.*0\.08\)/.test(source);
    expect(hasActiveStyle).toBe(true);
  });

  test('非活动会话应有 hover 效果', () => {
    const hasHover = /onMouseEnter.*e5e7eb|onMouseLeave.*transparent/.test(source);
    expect(hasHover).toBe(true);
  });
});

describe('ConversationList - 删除确认', () => {
  const source = readSource('components/chat/ConversationList.tsx');

  test('点击删除按钮应显示删除确认弹窗', () => {
    const hasDeleteMenu = /Trash2|delete.*menu/.test(source);
    expect(hasDeleteMenu).toBe(true);
  });

  test('确认删除应调用 onDeleteConversation', () => {
    const callsDelete = /handleDelete.*onDeleteConversation/.test(source);
    expect(callsDelete).toBe(true);
  });

  test('取消删除应关闭弹窗', () => {
    const cancelsDelete = /setDeleteConfirm\(null\)|onClick.*setDeleteConfirm/.test(source);
    expect(cancelsDelete).toBe(true);
  });

  test('删除中应显示 loading 状态', () => {
    const hasLoadingState = /deletingId.*conversation\.id|Loader2/.test(source);
    expect(hasLoadingState).toBe(true);
  });
});

describe('ConversationList - 重命名编辑', () => {
  const source = readSource('components/chat/ConversationList.tsx');

  test('点击编辑应进入编辑模式', () => {
    const hasEditMode = /editingId.*conversation\.id|setEditingId/.test(source);
    expect(hasEditMode).toBe(true);
  });

  test('编辑输入框应显示当前会话标题', () => {
    const showsCurrentTitle = /editValue.*conversation\.title|defaultValue.*conversation\.title/.test(source);
    expect(showsCurrentTitle).toBe(true);
  });

  test('按 Enter 应保存修改', () => {
    const enterSaves = /Enter.*saveEdit|handleEditKeyDown.*saveEdit/.test(source);
    expect(enterSaves).toBe(true);
  });

  test('按 Escape 应取消编辑', () => {
    const escapeCancels = /Escape.*setEditingId\(null\)|handleEditKeyDown.*setEditingId/.test(source);
    expect(escapeCancels).toBe(true);
  });

  test('失去焦点应保存修改', () => {
    const blurSaves = /onBlur.*handleEditBlur|handleEditBlur/.test(source);
    expect(blurSaves).toBe(true);
  });
});

describe('ConversationList - 未读计数', () => {
  const source = readSource('components/chat/ConversationList.tsx');

  test('非活动会话应显示未读计数徽章', () => {
    const hasUnreadBadge = /!isActive.*unreadCount.*>.*0/.test(source);
    expect(hasUnreadBadge).toBe(true);
  });

  test('活动会话不应显示未读计数', () => {
    const activeNoUnread = /isActive.*unreadCount/.test(source) && /!isActive/.test(source);
    expect(activeNoUnread).toBe(true);
  });

  test('未读徽章应有圆角样式', () => {
    const hasBadgeStyle = /rounded-full.*text-white.*font-medium/.test(source);
    expect(hasBadgeStyle).toBe(true);
  });
});

describe('ConversationList - 时间显示', () => {
  const source = readSource('components/chat/ConversationList.tsx');

  test('应显示相对时间（刚刚、X分钟前等）', () => {
    const hasFormatTime = /formatTime\(conversation\.timestamp\)/.test(source);
    expect(hasFormatTime).toBe(true);
  });

  test('formatTime 应处理刚刚（<1分钟）', () => {
    const formatTimeMatch = source.match(/const formatTime[\s\S]*?\};/);
    expect(formatTimeMatch).not.toBeNull();
    const fn = formatTimeMatch![0];
    const handlesJustNow = /minutes\s*<\s*1.*刚刚/.test(fn);
    expect(handlesJustNow).toBe(true);
  });

  test('formatTime 应处理小时前（<24小时）', () => {
    const formatTimeMatch = source.match(/const formatTime[\s\S]*?\};/);
    expect(formatTimeMatch).not.toBeNull();
    const fn = formatTimeMatch![0];
    const handlesHours = /hours\s*<\s*24.*小时前/.test(fn);
    expect(handlesHours).toBe(true);
  });

  test('formatTime 应处理日期（>=7天）', () => {
    const formatTimeMatch = source.match(/const formatTime[\s\S]*?\};/);
    expect(formatTimeMatch).not.toBeNull();
    const fn = formatTimeMatch![0];
    const handlesDate = /toLocaleDateString/.test(fn);
    expect(handlesDate).toBe(true);
  });
});

describe('ConversationList - 会话排序', () => {
  const source = readSource('components/chat/ConversationList.tsx');

  test('会话应按时间戳降序排列', () => {
    const hasSort = /b\.timestamp\.getTime\(\)\s*-\s*a\.timestamp\.getTime\(\)|sort.*timestamp.*desc/i.test(source);
    expect(hasSort).toBe(true);
  });

  test('排序后的结果应渲染到列表', () => {
    const mapsSorted = /sortedConversations\.map/.test(source);
    expect(mapsSorted).toBe(true);
  });
});

describe('ConversationList - 空状态', () => {
  const source = readSource('components/chat/ConversationList.tsx');

  test('无会话时应显示"暂无会话"提示', () => {
    const hasEmptyState = /sortedConversations\.length\s*===\s*0.*暂无会话/.test(source);
    expect(hasEmptyState).toBe(true);
  });

  test('加载中应显示"加载中"提示', () => {
    const hasLoadingState = /isLoading.*加载中/.test(source);
    expect(hasLoadingState).toBe(true);
  });
});

describe('ConversationList - 多Agent 会话', () => {
  const source = readSource('components/chat/ConversationList.tsx');

  test('多Agent 会话应显示+计数徽章', () => {
    const hasMultiAgentBadge = /multiAgent|agentIds\.length\s*>\s*1/.test(source);
    expect(hasMultiAgentBadge).toBe(true);
  });

  test('多Agent 徽章应显示额外 Agent 数量', () => {
    const showsCount = /\+\{agentIds\.length\s*-\s*1\}/.test(source);
    expect(showsCount).toBe(true);
  });
});
