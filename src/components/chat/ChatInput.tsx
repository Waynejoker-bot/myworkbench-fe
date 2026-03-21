import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useCallback } from "react";
import { Send, ChevronUp, Bot, AtSign, FileText, Upload, X } from "lucide-react";
import type { Agent } from "@/api/agent";
import { uploadImage } from "@/api/image";
import { AgentAvatar } from "./AgentAvatar";
import { convertWordToMarkdown, isWordDocument } from "@/utils/word-to-markdown";

/** 暴露给外部的方法 */
export interface ChatInputRef {
  /** 设置输入框的值 */
  setInputValue: (value: string) => void;
  /** 追加文本到输入框 */
  appendInputValue: (text: string) => void;
  /** 获取输入框的值 */
  getInputValue: () => string;
  /** 清空输入框 */
  clearInput: () => void;
}

interface ChatInputProps {
  onSend: (content: string, agentId: string) => Promise<boolean>;
  disabled?: boolean;
  agents: Agent[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(function ChatInput(
  {
    onSend,
    disabled = false,
    agents,
    selectedAgentId,
    onSelectAgent,
  },
  ref
) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [convertingFile, setConvertingFile] = useState(false);
  const [isComposing, setIsComposing] = useState(false); // 跟踪是否正在使用输入法

  // @ Agent 选择相关状态
  const [showAgentMention, setShowAgentMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [targetAgent, setTargetAgent] = useState<Agent | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);  // 键盘导航选中的索引

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAgent = agents.find(a => a.agent_id === selectedAgentId);

  // 自动调整 textarea 高度
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 重置高度以获取正确的 scrollHeight
    textarea.style.height = 'auto';

    // 计算内容行数
    const lineHeight = 20; // 每行高度约 20px
    const paddingTop = 10; // py-2.5 = 10px
    const paddingBottom = 10;
    const maxLines = 10;
    const maxHeight = lineHeight * maxLines + paddingTop + paddingBottom;

    // 设置最大高度
    textarea.style.maxHeight = `${maxHeight}px`;

    // 如果内容超过最大高度，显示滚动条
    if (textarea.scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
  }, []);

  // 暴露方法给外部
  useImperativeHandle(ref, () => ({
    setInputValue: (value: string) => setInput(value),
    appendInputValue: (text: string) => setInput(prev => prev + text),
    getInputValue: () => input,
    clearInput: () => setInput(""),
  }), [input]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAgentDropdown(false);
      }
      if (mentionRef.current && !mentionRef.current.contains(event.target as Node)) {
        setShowAgentMention(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 监听输入检测 @ 符号
  useEffect(() => {
    if (!input) {
      setShowAgentMention(false);
      // 如果输入清空，也清除 targetAgent
      setTargetAgent(null);
      return;
    }

    // 找到最后一个 @ 的位置
    const lastAtIndex = input.lastIndexOf('@');
    if (lastAtIndex === -1) {
      setShowAgentMention(false);
      return;
    }

    // 获取 @ 后面的文本
    const afterAt = input.slice(lastAtIndex + 1);

    // 如果 @ 后面有空格或换行，说明 @ 输入已完成
    if (afterAt.includes(' ') || afterAt.includes('\n')) {
      setShowAgentMention(false);
      return;
    }

    // 显示 Agent 选择弹窗
    setMentionStartPos(lastAtIndex);
    setMentionQuery(afterAt);
    setShowAgentMention(true);
  }, [input]);

  // 过滤 Agent 列表（前缀匹配）
  const filteredAgents = useMemo(() => {
    if (!mentionQuery) return agents;
    const query = mentionQuery.toLowerCase();
    return agents.filter(agent =>
      agent.name.toLowerCase().startsWith(query) ||
      agent.agent_id.toLowerCase().startsWith(query)
    );
  }, [agents, mentionQuery]);

  // 当过滤列表变化时，重置选中索引
  useEffect(() => {
    setMentionSelectedIndex(0);
  }, [filteredAgents.length]);

  // 选择 @ Agent
  const handleSelectMentionAgent = (agent: Agent) => {
    // 替换输入框中 "@xxx" 为 "@AgentName "
    const beforeMention = input.slice(0, mentionStartPos);
    const afterMention = input.slice(mentionStartPos + 1 + mentionQuery.length);
    const newInput = `${beforeMention}@${agent.name} ${afterMention}`;

    setInput(newInput);
    setTargetAgent(agent);
    setShowAgentMention(false);

    // 聚焦回输入框
    textareaRef.current?.focus();
  };

  // 处理 Word 文档上传
  const handleFileUpload = async (file: File) => {
    if (isWordDocument(file)) {
      // 处理 Word 文档转换
      setConvertingFile(true);
      try {
        const markdown = await convertWordToMarkdown(file);
        // 将转换后的内容追加到输入框
        setInput(prev => prev + (prev ? '\n\n' : '') + markdown);
      } catch (error) {
        console.error('Word 文档转换失败:', error);
        alert('Word 文档转换失败，请重试');
      } finally {
        setConvertingFile(false);
      }
    } else if (file.type.startsWith('image/')) {
      // 处理图片上传
      setIsUploading(true);
      try {
        const result = await uploadImage(file);
        const imageMarkdown = `![${result.filename || 'image'}](${result.url})`;
        setInput(prev => prev + (prev ? '\n' : '') + imageMarkdown);
      } catch (error) {
        console.error('图片上传失败:', error);
        alert('图片上传失败，请重试');
      } finally {
        setIsUploading(false);
      }
    } else {
      alert('不支持的文件类型，请上传 .docx 文档或图片');
    }
  };

  // 触发文件选择
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    await handleFileUpload(file);

    // 清空文件输入框，允许重复上传同一文件
    e.target.value = '';
  };

  // 移除已上传的文件提示
  const handleRemoveUploadedFile = () => {
    setUploadedFile(null);
  };

  const handleSend = async () => {
    if (!input.trim() || disabled || isSending) return;

    // 确定目标 Agent ID
    // 优先使用 @ 选中的，否则使用下拉选择的
    const targetAgentId = targetAgent?.agent_id || selectedAgentId;

    if (!targetAgentId) return;

    // 直接使用输入内容作为消息（保留 @AgentName）
    const messageToSend = input.trim();

    if (!messageToSend) return;

    setIsSending(true);
    const success = await onSend(messageToSend, targetAgentId);
    setIsSending(false);

    if (success) {
      setInput("");
      setTargetAgent(null);
      setUploadedFile(null);
      // 发送成功后重置输入框高度
      setTimeout(adjustTextareaHeight, 0);
    }
  };

  // 处理图片粘贴上传
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // 如果正在上传或发送，不处理粘贴
    if (isUploading || isSending) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    // 查找剪贴板中的图片
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();

        const file = item.getAsFile();
        if (!file) return;

        // 检查文件类型
        if (!file.type.startsWith('image/')) {
          console.error('Invalid file type:', file.type);
          return;
        }

        setIsUploading(true);

        try {
          const result = await uploadImage(file);

          // 将图片 URL 追加到输入框
          const imageMarkdown = `![${result.filename || 'image'}](${result.url})`;
          setInput(prev => prev + (prev ? '\n' : '') + imageMarkdown);
        } catch (error) {
          console.error('Image upload failed:', error);
          // 可以添加 toast 提示用户
          alert('图片上传失败，请重试');
        } finally {
          setIsUploading(false);
        }

        return;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 如果 @ 弹窗打开，处理键盘导航
    if (showAgentMention && filteredAgents.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionSelectedIndex(prev =>
          prev < filteredAgents.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredAgents.length - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selectedAgent = filteredAgents[mentionSelectedIndex];
        if (selectedAgent) {
          handleSelectMentionAgent(selectedAgent);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowAgentMention(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* 目标 Agent 提示 */}
      {targetAgent && (
        <div className="mb-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <AtSign className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-700 dark:text-green-300">
            发送给: <span className="font-medium">@{targetAgent.name}</span>
          </span>
          <button
            onClick={() => setTargetAgent(null)}
            className="ml-auto text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* 已上传文件提示 */}
      {uploadedFile && (
        <div className="mb-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg flex items-center gap-2">
          <FileText className="h-4 w-4 text-purple-500" />
          <span className="text-sm text-purple-700 dark:text-purple-300 truncate">
            {uploadedFile.name}
          </span>
          <button
            onClick={handleRemoveUploadedFile}
            className="ml-auto text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-stretch gap-2">
        {/* Agent Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowAgentDropdown(!showAgentDropdown)}
            className="flex items-center gap-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors min-w-[140px] h-full"
            title="选择 Agent"
          >
            <Bot className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
              {selectedAgent?.name || "选择 Agent"}
            </span>
            <ChevronUp className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform ${
              showAgentDropdown ? "rotate-180" : ""
            }`} />
          </button>

          {/* Agent Dropdown */}
          {showAgentDropdown && (
            <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20 min-w-[240px] max-h-[320px] overflow-y-auto">
              {agents.map((agent) => (
                <button
                  key={agent.agent_id}
                  onClick={() => {
                    onSelectAgent(agent.agent_id);
                    setShowAgentDropdown(false);
                  }}
                  className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left ${
                    selectedAgentId === agent.agent_id
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : ""
                  }`}
                >
                  <AgentAvatar avatar={agent.config?.avatar} name={agent.name} size="md" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {agent.name}
                    </p>
                    {agent.config?.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 text-left">
                        {agent.config.description}
                      </p>
                    )}
                  </div>
                  {selectedAgentId === agent.agent_id && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input with @ Agent Mention */}
        <div className="flex-1 relative">
          {/* @ Agent 选择弹窗 */}
          {showAgentMention && (
            <div
              ref={mentionRef}
              className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20 min-w-[200px] max-h-[250px] overflow-y-auto"
            >
              <div className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                选择 Agent
              </div>
              {filteredAgents.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                  没有匹配的 Agent
                </div>
              ) : (
                filteredAgents.map((agent, index) => (
                  <button
                    key={agent.agent_id}
                    onClick={() => handleSelectMentionAgent(agent)}
                    onMouseEnter={() => setMentionSelectedIndex(index)}
                    className={`w-full px-3 py-2 flex items-center gap-2 transition-colors text-left ${
                      index === mentionSelectedIndex
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <AgentAvatar avatar={agent.config?.avatar} name={agent.name} size="sm" />
                    <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                      <span className="text-sm text-slate-700 dark:text-slate-300 shrink-0">
                        {agent.name}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                        ({agent.agent_id})
                      </span>
                      {agent.config?.description && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                          - {agent.config.description}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center px-3 min-h-[40px]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // 延迟调整高度，确保在值更新后计算
                setTimeout(adjustTextareaHeight, 0);
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={
                convertingFile
                  ? "转换 Word 文档中..."
                  : isUploading
                  ? "上传图片中..."
                  : "输入消息... (使用 @ 选择目标 Agent，可直接粘贴图片或点击按钮上传文档)"
              }
              disabled={disabled || isSending || !selectedAgentId || isUploading || convertingFile}
              className="w-full bg-transparent resize-none focus:outline-none text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 py-2.5 min-h-[40px] disabled:opacity-50 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent"
              style={{
                height: 'auto',
                maxHeight: '220px',
                overflowY: 'hidden',
              }}
            />
          </div>
        </div>

        {/* File Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.doc,image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={handleUploadClick}
          disabled={disabled || isSending || !selectedAgentId || isUploading || convertingFile}
          className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:cursor-not-allowed rounded-lg transition-colors shrink-0"
          title="上传文件 (支持 .docx 文档和图片)"
        >
          {convertingFile ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          ) : isUploading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          ) : (
            <Upload className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          )}
        </button>

        {/* Upload Indicator */}
        {isUploading && (
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg shrink-0" title="上传图片中...">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled || isSending || !selectedAgentId || isUploading || convertingFile}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition-colors shrink-0"
          title={
            isSending
              ? "发送中..."
              : isUploading
              ? "上传中..."
              : convertingFile
              ? "转换中..."
              : "发送消息"
          }
        >
          {isSending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-5 w-5 text-white" />
          )}
        </button>
      </div>
    </div>
  );
});
