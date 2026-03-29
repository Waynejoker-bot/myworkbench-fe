import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useCallback } from "react";
import { Send, Square, AtSign, FileText, X, Plus, Image, File, FileType } from "lucide-react";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import type { Agent } from "@/api/agent";
import { uploadImage } from "@/api/image";
import { convertWordToMarkdown, isWordDocument } from "@/utils/word-to-markdown";
import { useToast } from "@/contexts/ToastContext";

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
  isGenerating?: boolean;
  onStop?: () => void;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(function ChatInput(
  {
    onSend,
    disabled = false,
    agents,
    selectedAgentId,
    onSelectAgent,
    isGenerating,
    onStop,
  },
  ref
) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [convertingFile, setConvertingFile] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<Array<{ id: string; url: string; filename: string }>>([]);

  // @ Agent 选择相关状态
  const [showAgentMention, setShowAgentMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [targetAgent, setTargetAgent] = useState<Agent | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const mentionRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileAcceptRef = useRef<string>(".docx,.doc,image/*");

  const { showToast } = useToast();

  // onSelectAgent is kept in props for parent compatibility but not used after removing dropdown
  void onSelectAgent;

  // 自动调整 textarea 高度
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';

    const lineHeight = 20;
    const paddingTop = 10;
    const paddingBottom = 10;
    const maxLines = 10;
    const maxHeight = lineHeight * maxLines + paddingTop + paddingBottom;

    textarea.style.maxHeight = `${maxHeight}px`;

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

  // 点击外部关闭弹窗
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionRef.current && !mentionRef.current.contains(event.target as Node)) {
        setShowAgentMention(false);
      }
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 监听输入检测 @ 符号
  useEffect(() => {
    if (!input) {
      setShowAgentMention(false);
      setTargetAgent(null);
      return;
    }

    const lastAtIndex = input.lastIndexOf('@');
    if (lastAtIndex === -1) {
      setShowAgentMention(false);
      return;
    }

    const afterAt = input.slice(lastAtIndex + 1);

    if (afterAt.includes(' ') || afterAt.includes('\n')) {
      setShowAgentMention(false);
      return;
    }

    setMentionStartPos(lastAtIndex);
    setMentionQuery(afterAt);
    setShowAgentMention(true);
  }, [input]);

  // 过滤 Agent 列表
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
    const beforeMention = input.slice(0, mentionStartPos);
    const afterMention = input.slice(mentionStartPos + 1 + mentionQuery.length);
    const newInput = `${beforeMention}@${agent.name} ${afterMention}`;

    setInput(newInput);
    setTargetAgent(agent);
    setShowAgentMention(false);

    textareaRef.current?.focus();
  };

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    if (isWordDocument(file)) {
      setConvertingFile(true);
      try {
        const markdown = await convertWordToMarkdown(file);
        setInput(prev => prev + (prev ? '\n\n' : '') + markdown);
      } catch (error) {
        console.error('Word 文档转换失败:', error);
        showToast('Word 文档转换失败', 'error');
      } finally {
        setConvertingFile(false);
      }
    } else if (file.type.startsWith('image/')) {
      setIsUploading(true);
      try {
        const result = await uploadImage(file);
        // 添加到图片预览列表
        const newImage = {
          id: Date.now().toString(),
          url: result.url,
          filename: result.filename || 'image'
        };
        setUploadedImages(prev => [...prev, newImage]);
      } catch (error) {
        console.error('图片上传失败:', error);
        showToast('图片上传失败', 'error');
      } finally {
        setIsUploading(false);
      }
    } else {
      showToast('不支持的文件类型', 'error');
    }
  };

  // + 菜单项点击
  const handlePlusMenuItem = (type: 'image' | 'file' | 'word') => {
    setShowPlusMenu(false);
    if (type === 'image') {
      fileAcceptRef.current = "image/*";
    } else if (type === 'word') {
      fileAcceptRef.current = ".docx,.doc";
    } else {
      fileAcceptRef.current = ".docx,.doc,image/*";
    }
    // Need to wait for the accept attribute to update
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    await handleFileUpload(file);

    e.target.value = '';
  };

  // 移除已上传的文件提示
  const handleRemoveUploadedFile = () => {
    setUploadedFile(null);
  };

  // 移除已上传的图片
  const handleRemoveImage = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleSend = async () => {
    // 检查是否有文本或图片
    const hasText = input.trim().length > 0;
    const hasImages = uploadedImages.length > 0;

    if ((!hasText && !hasImages) || disabled || isSending) return;

    const targetAgentId = targetAgent?.agent_id || selectedAgentId;

    if (!targetAgentId) return;

    // 构建消息内容
    let messageToSend = input.trim();

    // 如果有图片，将图片转换为 Markdown 格式附加到消息
    if (hasImages) {
      const imageMarkdowns = uploadedImages.map(img => `![${img.filename}](${img.url})`);
      messageToSend = messageToSend + (hasText ? '\n\n' : '') + imageMarkdowns.join('\n\n');
    }

    setIsSending(true);
    const success = await onSend(messageToSend, targetAgentId);
    setIsSending(false);

    if (success) {
      setInput("");
      setTargetAgent(null);
      setUploadedFile(null);
      setUploadedImages([]);
      setTimeout(adjustTextareaHeight, 0);
    }
  };

  // 处理图片粘贴上传
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isUploading || isSending) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();

        const file = item.getAsFile();
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          console.error('Invalid file type:', file.type);
          return;
        }

        setIsUploading(true);

        try {
          const result = await uploadImage(file);
          // 添加到图片预览列表
          const newImage = {
            id: Date.now().toString(),
            url: result.url,
            filename: result.filename || 'image'
          };
          setUploadedImages(prev => [...prev, newImage]);
        } catch (error) {
          console.error('Image upload failed:', error);
          showToast('图片上传失败', 'error');
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

  const hasContent = input.trim().length > 0 || uploadedImages.length > 0;

  return (
    <div
      className="px-6 py-3 border-t bg-muted border-border"
    >
      {/* 目标 Agent 提示 */}
      {targetAgent && (
        <div
          className="mb-2 px-3 py-1.5 rounded-lg flex items-center gap-2 border bg-primary/10 border-primary/30"
        >
          <AtSign className="h-4 w-4 text-primary" />
          <span className="text-sm text-primary">
            发送给: <span className="font-medium">@{targetAgent.name}</span>
          </span>
          <button
            onClick={() => setTargetAgent(null)}
            className="ml-auto hover:opacity-80 text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 已上传文件提示 */}
      {uploadedFile && (
        <div
          className="mb-2 px-3 py-1.5 rounded-lg flex items-center gap-2 border bg-primary/10 border-border"
        >
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm truncate text-foreground">
            {uploadedFile.name}
          </span>
          <button
            onClick={handleRemoveUploadedFile}
            className="ml-auto hover:opacity-80 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 已上传图片预览 */}
      {uploadedImages.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {uploadedImages.map((image) => (
            <div
              key={image.id}
              className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-primary/10 border-border"
            >
              <img
                src={image.url}
                alt={image.filename}
                className="h-16 w-16 object-cover rounded bg-border"
              />
              <button
                onClick={() => handleRemoveImage(image.id)}
                className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full hover:opacity-80 transition-opacity bg-muted-foreground text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className="rounded-2xl border transition-all duration-200 bg-surface-2 border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15"
      >
        {/* Row 1: Textarea area */}
        <div className="relative px-4 pt-3 pb-2">
          {/* @ Agent 选择弹窗 */}
          {showAgentMention && (
            <div
              ref={mentionRef}
              className="absolute bottom-full left-0 mb-2 rounded-xl shadow-lg py-1 z-20 min-w-[200px] max-h-[250px] overflow-y-auto border bg-surface-2 border-border"
            >
              <div
                className="px-3 py-1.5 text-xs border-b text-muted-foreground border-border"
              >
                选择 Agent
              </div>
              {filteredAgents.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  没有匹配的 Agent
                </div>
              ) : (
                filteredAgents.map((agent, index) => (
                  <button
                    key={agent.agent_id}
                    onClick={() => handleSelectMentionAgent(agent)}
                    onMouseEnter={() => setMentionSelectedIndex(index)}
                    className={`w-full px-3 py-2 flex items-center gap-2 transition-colors text-left ${index === mentionSelectedIndex ? 'bg-muted' : 'bg-transparent'}`}
                  >
                    <AgentAvatar
                      agentId={agent.agent_id}
                      avatar={agent.config?.avatar}
                      size={24}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                      <span className="text-sm shrink-0 text-foreground">
                        {agent.name}
                      </span>
                      <span className="text-xs shrink-0 text-muted-foreground">
                        ({agent.agent_id})
                      </span>
                      {agent.config?.description && (
                        <span className="text-xs truncate text-muted-foreground">
                          - {agent.config.description}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
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
                : "输入消息... (使用 @ 选择目标 Agent)"
            }
            disabled={disabled || isSending || !selectedAgentId || isUploading || convertingFile}
            className="w-full bg-transparent resize-none focus:outline-none text-sm min-h-[28px] disabled:opacity-50 scrollbar-thin scrollbar-track-transparent text-foreground"
            style={{
              height: 'auto',
              maxHeight: '220px',
              overflowY: 'hidden' as const,
            }}
          />
        </div>

        {/* Row 2: Action buttons toolbar */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-1">
            {/* + Button with Menu */}
            <div className="relative" ref={plusMenuRef}>
              <button
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                disabled={disabled || isSending || !selectedAgentId || isUploading || convertingFile}
                className={`p-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${showPlusMenu ? 'bg-primary text-white' : 'bg-transparent text-muted-foreground'}`}
                title="上传文件"
              >
                {convertingFile ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : isUploading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                ) : showPlusMenu ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </button>

              {/* Plus Menu Popup */}
              {showPlusMenu && (
                <div
                  className="absolute bottom-full left-0 mb-2 rounded-xl shadow-lg py-1 z-20 min-w-[160px] border bg-surface-2 border-border"
                >
                  <button
                    onClick={() => handlePlusMenuItem('image')}
                    className="w-full px-4 py-2.5 flex items-center gap-3 transition-colors text-left text-sm text-foreground hover:bg-muted"
                  >
                    <Image className="h-4 w-4 text-primary" />
                    上传图片
                  </button>
                  <button
                    onClick={() => handlePlusMenuItem('file')}
                    className="w-full px-4 py-2.5 flex items-center gap-3 transition-colors text-left text-sm text-foreground hover:bg-muted"
                  >
                    <File className="h-4 w-4 text-success" />
                    上传文件
                  </button>
                  <button
                    onClick={() => handlePlusMenuItem('word')}
                    className="w-full px-4 py-2.5 flex items-center gap-3 transition-colors text-left text-sm text-foreground hover:bg-muted"
                  >
                    <FileType className="h-4 w-4 text-primary" />
                    Word 文档
                  </button>
                </div>
              )}
            </div>

            {/* Upload Indicator */}
            {isUploading && (
              <div
                className="p-1.5 rounded-lg shrink-0 bg-primary/10"
                title="上传图片中..."
              >
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>

          {/* Send / Stop Button */}
          <div className="flex items-center">
            {isGenerating ? (
              <button
                onClick={onStop}
                className="p-1.5 rounded-lg transition-colors shrink-0 bg-destructive"
                title="停止生成"
              >
                <Square className="h-5 w-5 text-white" fill="white" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || disabled || isSending || !selectedAgentId || isUploading || convertingFile}
                className={`p-1.5 rounded-lg transition-all duration-200 shrink-0 disabled:cursor-not-allowed ${hasContent ? 'bg-primary text-white' : 'bg-transparent text-muted-foreground'}`}
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
                  <Send className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={fileAcceptRef.current}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Placeholder style for textarea */}
      <style>{`
        textarea::placeholder {
          color: #475569 !important;
        }
        textarea::-webkit-scrollbar-thumb {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
});
