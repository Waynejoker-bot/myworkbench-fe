/**
 * Edge Cases Tests
 *
 * Tests for edge cases, error handling, empty states, timestamp parsing,
 * and concurrency issues.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), 'utf-8');
}

// Mocks
vi.mock('@/api/session', () => ({
  getSessions: vi.fn().mockResolvedValue({ sessions: [], total: 0 }),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  updateSessionTitle: vi.fn(),
}));

vi.mock('@/api/agent', () => ({
  getChannels: vi.fn().mockResolvedValue({ agents: [] }),
}));

vi.mock('@/api/message-station', () => ({
  getMessages: vi.fn().mockResolvedValue({ messages: [], total: 0, page: 1, total_pages: 1 }),
  extractLatestUpdateTime: vi.fn().mockReturnValue(0),
}));

vi.mock('@/api/chat', () => ({
  sendMessage: vi.fn().mockResolvedValue({}),
  generateMessageId: vi.fn().mockReturnValue('msg-1'),
  textToPayload: vi.fn((t: string) => JSON.stringify({ text: t })),
  startPolling: vi.fn().mockReturnValue(() => {}),
  SendMessageError: class extends Error {
    isAgentBusy() { return false; }
  },
}));

vi.mock('@/lib/session-storage', () => ({
  sessionStorage: {
    getSessionTimestamp: vi.fn().mockReturnValue(0),
    saveSessionTimestamp: vi.fn(),
  },
}));

describe('Edge Cases', () => {

  describe('Empty states', () => {

    test('No conversations: should show empty state message, not crash', () => {
      const source = readSource('components/chat/ConversationList.tsx');

      // ConversationList handles empty list with "暂无会话" message
      const hasEmptyState = /暂无会话|sortedConversations\.length\s*===\s*0/.test(source);
      expect(hasEmptyState).toBe(true);
    });

    test('No agents: should show empty state, not crash', () => {
      const source = readSource('components/panel/panels/AgentPanel.tsx');

      // AgentPanel maps over agents but should handle empty case
      // Currently it just renders an empty list (agents.map with empty array won't crash)
      // But there's no friendly "no agents" message
      const hasEmptyState = /agents\.length\s*===\s*0|暂无.*Agent|没有.*Agent|empty/i.test(source);
      expect(hasEmptyState).toBe(true);
    });

    test('No messages: should show empty state in chat area', () => {
      const chatMessagesSource = readSource('components/chat/ChatMessages.tsx');

      // Check if ChatMessages handles empty messages array
      const hasEmptyState = /messages\.length\s*===\s*0|uiMessages\.length\s*===\s*0|暂无消息|empty|no.*message/i.test(chatMessagesSource);
      expect(hasEmptyState).toBe(true);
    });

    test('Agent with no description: should render without error', () => {
      const source = readSource('components/panel/panels/AgentPanel.tsx');

      // Check safe access with optional chaining or fallback
      const safeDescription = /config\?\.description|description\s*\|\||暂无描述/.test(source);
      expect(safeDescription).toBe(true);
    });

    test('Agent with no tools: ToolsPanel should show empty message', () => {
      // ToolsPanel uses hardcoded tools, so it always shows tools even when agent has none
      // This test checks if it reads from the actual agent
      const source = readSource('components/panel/panels/ToolsPanel.tsx');

      const readsAgentTools = /agent\.tools|tools\.length\s*===\s*0|暂无工具|没有工具/i.test(source);
      expect(readsAgentTools).toBe(true);
    });

    test('Conversation with empty agent_id: should show title instead of "未知助手"', () => {
      const source = readSource('components/chat/ConversationList.tsx');

      // When there's no agent, it shows conversation.title
      // Currently: {agent?.name || conversation.title || "新对话"}
      const handlesMissingAgent = /agent\?\.name\s*\|\|\s*conversation\.title/.test(source);
      expect(handlesMissingAgent).toBe(true);
    });
  });

  describe('Timestamp edge cases', () => {

    test('parseTimestamp(0) should return epoch date, not current time', async () => {
      // Read the source to verify behavior
      const source = readSource('hooks/useConversations.ts');

      // The function: if (!ts || ts === 0) return new Date(0)
      const handlesZero = /!ts\s*\|\|\s*ts\s*===\s*0[\s\S]*?new\s+Date\(0\)/.test(source);
      expect(handlesZero).toBe(true);

      // Import and test directly
      // We test by checking the source logic since parseTimestamp is not exported
      // But we verify the function works by analyzing its logic:
      // if (!ts || ts === 0) return new Date(0); -- this returns epoch (Jan 1, 1970)
      // This is correct.
    });

    test('parseTimestamp with YYYYMMDDHHmmss format should parse correctly', () => {
      const source = readSource('hooks/useConversations.ts');

      // Check the 14-digit parser
      const hasFormat = /str\.length\s*===\s*14/.test(source);
      expect(hasFormat).toBe(true);

      // Verify it constructs a proper date string
      const constructsDate = /\$\{year\}-\$\{month\}-\$\{day\}T\$\{hour\}:\$\{min\}:\$\{sec\}/.test(source);
      expect(constructsDate).toBe(true);
    });

    test('parseTimestamp with future date should still work', () => {
      // The function should handle future timestamps without issue
      // This is a logic verification - the function uses new Date() which handles future dates
      const source = readSource('hooks/useConversations.ts');

      // No explicit future date rejection
      const rejectsFuture = /future|invalid.*date|Date\.now/i.test(
        source.match(/function parseTimestamp[\s\S]*?\n\}/)?.[0] || ''
      );
      // Should NOT reject future dates
      expect(rejectsFuture).toBe(false);
    });

    test('formatTime with epoch date should show actual date, not "刚刚"', () => {
      // formatTime in ConversationList: if diff is negative or very large,
      // it falls through to toLocaleDateString
      const source = readSource('components/chat/ConversationList.tsx');

      // Extract formatTime function
      const formatTimeMatch = source.match(/const formatTime[\s\S]*?\};/);
      expect(formatTimeMatch).not.toBeNull();

      const fn = formatTimeMatch![0];

      // For epoch date (Jan 1 1970), diff would be ~56 years = huge number
      // minutes < 1 check: diff = now - epoch = billions of ms, minutes = millions
      // So it would go to hours > 24, days > 7, and reach toLocaleDateString
      // This is actually correct behavior!
      const hasDateFallback = /toLocaleDateString/.test(fn);
      expect(hasDateFallback).toBe(true);
    });
  });

  describe('Error handling', () => {

    test('Failed API call should show Toast notification', () => {
      const source = readSource('hooks/useConversations.ts');

      // Check that error handlers call showToast
      const hasToast = /showToast\(.*error/i.test(source);
      expect(hasToast).toBe(true);

      // Count error handlers that have toast
      const catchBlocks = source.match(/catch\s*\([\s\S]*?\}/g) || [];
      const blocksWithToast = catchBlocks.filter(b => /showToast/.test(b));

      // Every catch block should have a toast
      expect(blocksWithToast.length).toBe(catchBlocks.length);
    });

    test('Network error during send should mark message as FAILED', () => {
      const source = readSource('hooks/useChatMessages.ts');

      // Check send() error handling
      const sendCatch = source.match(/try\s*\{[\s\S]*?apiSendMessage[\s\S]*?catch[\s\S]*?\}/);
      expect(sendCatch).not.toBeNull();

      const marksAsFailed = /delivery_status.*FAILED|FAILED/i.test(sendCatch![0]);
      expect(marksAsFailed).toBe(true);
    });

    test('SSE disconnection should attempt reconnect', () => {
      // Check if the polling/SSE logic has reconnection
      const chatApiSource = readSource('api/chat.ts');

      const hasReconnect = /reconnect|retry|onerror.*start|setTimeout.*poll/i.test(chatApiSource);
      expect(hasReconnect).toBe(true);
    });
  });

  describe('Breadcrumb path formatting (behavioral)', () => {

    /**
     * 这组测试验证面包屑组件构建的 path 参数格式是否正确。
     * 之前的 bug: 面包屑点击 "claude" 时传出 path="opt/claude"（缺少前导 /），
     * 导致后端返回 "Path not found: /opt/claude"。
     *
     * 盲点原因: 之前的测试只检查"Breadcrumb 组件存在"和"面包屑可点击"，
     * 但没验证 onClick 传出的参数值是否正确。
     */

    function extractBreadcrumbPaths(prefix: string, path: string): Array<{label: string; prefix: string; path: string}> {
      // Replicate the Breadcrumb segment building logic
      const segments: Array<{label: string; prefix: string; path: string}> = [];
      segments.push({ label: "/", prefix: "", path: "" });
      if (prefix) {
        segments.push({ label: prefix, prefix, path: "" });
      }
      if (path) {
        const pathParts = path.split("/").filter(Boolean);
        pathParts.forEach((part, index) => {
          // This is the line we're testing — must match actual source
          const newPath = "/" + pathParts.slice(0, index + 1).join("/");
          segments.push({ label: part, prefix, path: newPath });
        });
      }
      return segments;
    }

    test('面包屑各段 path 应以 / 开头（根目录除外）', () => {
      const segments = extractBreadcrumbPaths("", "/opt/claude/agent-service/agents");
      // 根目录 path="" 是允许的
      for (const seg of segments.slice(1)) { // skip root
        if (seg.path) {
          expect(seg.path.startsWith('/')).toBe(true);
        }
      }
    });

    test('面包屑点击 "claude" 应传 path="/opt/claude" 而不是 "opt/claude"', () => {
      const segments = extractBreadcrumbPaths("", "/opt/claude/agent-service");
      const claudeSegment = segments.find(s => s.label === "claude");
      expect(claudeSegment).toBeDefined();
      expect(claudeSegment!.path).toBe("/opt/claude");
    });

    test('面包屑点击 "opt" 应传 path="/opt"', () => {
      const segments = extractBreadcrumbPaths("", "/opt/claude");
      const optSegment = segments.find(s => s.label === "opt");
      expect(optSegment).toBeDefined();
      expect(optSegment!.path).toBe("/opt");
    });

    test('面包屑: 已带前导 / 的 path 不应产生双斜杠 //', () => {
      const segments = extractBreadcrumbPaths("", "/opt/claude");
      for (const seg of segments) {
        expect(seg.path).not.toContain("//");
      }
    });

    test('面包屑: 空 path 应只有根目录 segment', () => {
      const segments = extractBreadcrumbPaths("", "");
      expect(segments).toHaveLength(1);
      expect(segments[0].label).toBe("/");
      expect(segments[0].path).toBe("");
    });

    test('面包屑: 带 prefix 的路径应正确构建', () => {
      const segments = extractBreadcrumbPaths("myprefix", "/data/files");
      // Should have: / > myprefix > data > files
      expect(segments).toHaveLength(4);
      expect(segments[1].label).toBe("myprefix");
      expect(segments[1].prefix).toBe("myprefix");
      expect(segments[2].label).toBe("data");
      expect(segments[2].path).toBe("/data");
      expect(segments[3].label).toBe("files");
      expect(segments[3].path).toBe("/data/files");
    });

    test('源码中 Breadcrumb 构建 path 应包含前导 /', () => {
      const source = readSource('features/file-system/components/Breadcrumb.tsx');
      // The actual line that builds paths must prepend /
      const hasLeadingSlash = /"\/" \+ pathParts\.slice|`\/\$\{pathParts/.test(source);
      expect(hasLeadingSlash).toBe(true);
    });
  });

  describe('File system path edge cases', () => {

    test('navigateUp 从根目录不应发起 API 调用', () => {
      const source = readSource('features/file-system/hooks/useFileSystem.ts');
      // navigateUp should check if currentPath is empty/root before calling listDirectory
      const hasGuard = /if\s*\(!currentPath\)\s*return/.test(source);
      expect(hasGuard).toBe(true);
    });

    test('listFiles API path 参数不应丢失前导 /', () => {
      const source = readSource('lib/api-client.ts');
      // The API client should pass path as-is (relying on caller to provide correct format)
      // OR normalize it. Check that it doesn't strip leading /
      const stripSlash = /path\.replace.*\//.test(
        source.match(/listFiles[\s\S]*?\}/)?.[0] || ''
      );
      expect(stripSlash).toBe(false);
    });

    test('useFileSystem listDirectory 应处理 full_path 缺少前导 / 的情况', () => {
      const source = readSource('features/file-system/hooks/useFileSystem.ts');
      // Check normalization: ensure / is prepended if missing
      const hasNormalization = /startsWith\('\/'\)|full_path\.startsWith/.test(source);
      expect(hasNormalization).toBe(true);
    });

    test('文件名含特殊字符（空格、中文）应正确处理', () => {
      const source = readSource('lib/api-client.ts');
      // URLSearchParams auto-encodes special chars, verify it's used in the file
      const hasSearchParams = /URLSearchParams/.test(source);
      const hasListFiles = /listFiles/.test(source);
      expect(hasSearchParams && hasListFiles).toBe(true);
    });

    test('token 为空时 listDirectory 应不发起请求', () => {
      const source = readSource('features/file-system/hooks/useFileSystem.ts');
      const hasTokenGuard = /if\s*\(!token\)\s*return/.test(source);
      expect(hasTokenGuard).toBe(true);
    });
  });

  describe('Concurrency', () => {

    test('Rapid double-click on "新建对话" should not create duplicate sessions', () => {
      // useConversations has isCreating guard
      const source = readSource('hooks/useConversations.ts');

      const hasGuard = /if\s*\(isCreating\)\s*return/.test(source);
      expect(hasGuard).toBe(true);

      // Also check that isCreating is set before the async call
      const setsCreating = /setIsCreating\(true\)/.test(source);
      expect(setsCreating).toBe(true);
    });

    test('Multiple conversation switches should cancel previous SSE connections', () => {
      const source = readSource('hooks/useChatMessages.ts');

      // Check if the useEffect cleanup cancels polling
      const hasCleanup = /return\s*\(\)\s*=>\s*\{[\s\S]*?pollingCleanupRef/.test(source);
      expect(hasCleanup).toBe(true);

      // Verify cleanup is called
      const callsCleanup = /pollingCleanupRef\.current\(\)/.test(source);
      expect(callsCleanup).toBe(true);
    });
  });
});
