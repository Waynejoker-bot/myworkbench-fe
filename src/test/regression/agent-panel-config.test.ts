/**
 * AgentPanel Config Files & System Prompt Tests
 *
 * Verifies:
 * 1. Agent detail loads full agent data (getAgent) for system prompt
 * 2. Agent detail loads config files from file system API
 * 3. System Prompt is displayed in a collapsible section
 * 4. Config files are listed with click-to-view
 * 5. Full-screen file viewer modal works
 * 6. Recent work items navigate to existing conversation (not create new)
 * 7. "开始对话" button creates new conversation
 * 8. ChatBoxPage passes onSelectSession to PanelShell
 */
import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), 'utf-8');
}

describe('AgentPanel Config Files & System Prompt', () => {

  const source = readSource('components/panel/panels/AgentPanel.tsx');

  describe('Data Loading', () => {

    test('should import getAgent from agent API', () => {
      const importsGetAgent = /import.*\{[^}]*getAgent[^}]*\}.*from.*@\/api\/agent/.test(source);
      expect(importsGetAgent).toBe(true);
    });

    test('should import apiClient for file system operations', () => {
      const importsApiClient = /import.*apiClient.*from.*@\/lib\/api-client/.test(source);
      expect(importsApiClient).toBe(true);
    });

    test('should import FileViewer component for file rendering', () => {
      const importsFileViewer = /import.*FileViewer.*from.*file-system/.test(source);
      expect(importsFileViewer).toBe(true);
    });

    test('should call getAgent when selectedAgent changes', () => {
      const callsGetAgent = /getAgent\(.*agentId\)/.test(source);
      expect(callsGetAgent).toBe(true);
    });

    test('should call listFiles to load config files from agent directory', () => {
      const callsListFiles = /apiClient\.listFiles/.test(source);
      expect(callsListFiles).toBe(true);
    });

    test('should try business path for config files', () => {
      const triesBusinessPath = /\/opt\/claude\/business\//.test(source);
      expect(triesBusinessPath).toBe(true);
    });

    test('should try agent-service path for config files', () => {
      const triesAgentServicePath = /\/opt\/claude\/agent-service\/agents\//.test(source);
      expect(triesAgentServicePath).toBe(true);
    });

    test('should store agentDetail state with full agent data', () => {
      const hasAgentDetailState = /useState.*Agent.*null.*agentDetail|agentDetail.*useState/.test(source);
      expect(hasAgentDetailState).toBe(true);
    });

    test('should store configFiles state', () => {
      const hasConfigFilesState = /configFiles.*useState|useState.*configFiles/.test(source);
      expect(hasConfigFilesState).toBe(true);
    });
  });

  describe('System Prompt Display', () => {

    test('should display "System Prompt" label', () => {
      const hasLabel = /System Prompt/.test(source);
      expect(hasLabel).toBe(true);
    });

    test('should be collapsible with expand/collapse toggle', () => {
      const hasExpandState = /promptExpanded/.test(source);
      const hasChevronIcons = /ChevronUp|ChevronDown/.test(source);
      expect(hasExpandState).toBe(true);
      expect(hasChevronIcons).toBe(true);
    });

    test('should display agentDetail.prompt content when expanded', () => {
      const displaysPrompt = /agentDetail\.prompt/.test(source);
      expect(displaysPrompt).toBe(true);
    });

    test('should only show when agentDetail has prompt data', () => {
      const conditionalRender = /agentDetail\?\.prompt/.test(source);
      expect(conditionalRender).toBe(true);
    });
  });

  describe('Config Files List', () => {

    test('should display "配置文件" section label', () => {
      const hasLabel = /配置文件/.test(source);
      expect(hasLabel).toBe(true);
    });

    test('should show loading state while fetching files', () => {
      const hasLoadingState = /loadingFiles/.test(source);
      expect(hasLoadingState).toBe(true);
    });

    test('should show "未找到配置文件" when no files found', () => {
      const hasEmptyMessage = /未找到配置文件/.test(source);
      expect(hasEmptyMessage).toBe(true);
    });

    test('should display file name and size for each config file', () => {
      const displaysFileName = /file\.name/.test(source);
      const displaysFileSize = /file\.size/.test(source);
      expect(displaysFileName).toBe(true);
      expect(displaysFileSize).toBe(true);
    });

    test('clicking a config file should call openConfigFile', () => {
      const hasClickHandler = /onClick.*openConfigFile\(file\)/.test(source);
      expect(hasClickHandler).toBe(true);
    });

    test('should use FileText icon for file items', () => {
      const hasFileTextIcon = /FileText/.test(source);
      expect(hasFileTextIcon).toBe(true);
    });
  });

  describe('Full-Screen File Viewer Modal', () => {

    test('should have viewingFile state for modal control', () => {
      const hasViewingFileState = /viewingFile.*useState|useState.*viewingFile/.test(source);
      expect(hasViewingFileState).toBe(true);
    });

    test('should render FileViewer when viewingFile is set', () => {
      const rendersFileViewer = /viewingFile[\s\S]*?<FileViewer/.test(source);
      expect(rendersFileViewer).toBe(true);
    });

    test('modal should be full-screen (position fixed, inset 0)', () => {
      // Find the viewingFile modal section
      const modalSection = source.match(/viewingFile[\s\S]*?position:\s*['"]fixed['"]/);
      expect(modalSection).not.toBeNull();
    });

    test('modal should have close button (X icon)', () => {
      const hasCloseInModal = /viewingFile[\s\S]*?setViewingFile\(null\)[\s\S]*?<X/s.test(source);
      expect(hasCloseInModal).toBe(true);
    });

    test('modal should support ESC key to close', () => {
      const hasEscHandler = /Escape.*setViewingFile\(null\)|onKeyDown[\s\S]*?Escape/.test(source);
      expect(hasEscHandler).toBe(true);
    });

    test('openConfigFile should call apiClient.readFile', () => {
      const callsReadFile = /apiClient\.readFile/.test(source);
      expect(callsReadFile).toBe(true);
    });

    test('should display file name in modal header', () => {
      const displaysFileNameInModal = /viewingFile\.name/.test(source);
      expect(displaysFileNameInModal).toBe(true);
    });
  });
});

describe('AgentPanel Recent Work Navigation', () => {

  const source = readSource('components/panel/panels/AgentPanel.tsx');

  test('recent work items should call onSelectSession (navigate to existing conversation)', () => {
    // Recent work items should NOT call onCreateConversation
    // They should call onSelectSession with the session_id
    const hasSelectSession = /onSelectSession\?\.\(session\.session_id\)/.test(source);
    expect(hasSelectSession).toBe(true);
  });

  test('"开始对话" button should still call onCreateConversation (create new conversation)', () => {
    const hasCreateConversation = /onCreateConversation\?\.\(selectedAgent\.agent_id\)/.test(source);
    expect(hasCreateConversation).toBe(true);
  });

  test('AgentPanel should destructure onSelectSession from props', () => {
    const hasOnSelectSession = /onSelectSession.*PanelProps|PanelProps[\s\S]*?onSelectSession/.test(source);
    expect(hasOnSelectSession).toBe(true);
  });
});

describe('ChatBoxPage onSelectSession Wiring', () => {

  const source = readSource('pages/ChatBoxPage.tsx');

  test('PanelShell should receive onSelectSession prop', () => {
    const passesOnSelectSession = /onSelectSession\s*=\s*\{/.test(source);
    expect(passesOnSelectSession).toBe(true);
  });

  test('onSelectSession should use handleSelectConversation (full logic)', () => {
    // Should use handleSelectConversation which includes agent sync and unread reset
    // NOT just a simple setActiveConversationId
    const usesFullHandler = /onSelectSession\s*=\s*\{handleSelectConversation\}/.test(source);
    expect(usesFullHandler).toBe(true);
  });

  test('handleSelectConversation should sync agent on conversation switch', () => {
    const selectHandler = source.match(/handleSelectConversation[\s\S]*?\};/);
    expect(selectHandler).not.toBeNull();
    const syncsAgent = /selectAgent\(conv/.test(selectHandler![0]);
    expect(syncsAgent).toBe(true);
  });
});
