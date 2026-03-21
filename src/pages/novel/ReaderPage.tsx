import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, List, ChevronLeft, ChevronRight, Sun, Moon, Type } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChapterContent, useAdjacentChapters, useReaderSettings, useNovelChapters } from '@/hooks/useNovel';
import { FONT_SIZE_MAP, THEME_MAP } from '@/types/novel';

/**
 * 阅读器工具栏
 */
function ReaderToolbar({
  bookId,
  chapterTitle,
  settings,
  onFontSizeChange,
  onThemeChange,
  onShowToc,
}: {
  bookId: string;
  chapterTitle: string;
  settings: { fontSize: 'small' | 'medium' | 'large'; theme: 'light' | 'dark' | 'sepia' };
  onFontSizeChange: () => void;
  onThemeChange: () => void;
  onShowToc: () => void;
}) {
  const themeIcons = { light: Sun, dark: Moon, sepia: Sun };
  const ThemeIcon = themeIcons[settings.theme];

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
        {/* 左侧：返回 + 标题 */}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to={`/novel/${bookId}`}
            className="p-1.5 -ml-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0"
            title="返回目录"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
            {chapterTitle}
          </span>
        </div>

        {/* 右侧：工具按钮 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* 字体大小 */}
          <button
            onClick={onFontSizeChange}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded"
            title="字体大小"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* 主题切换 */}
          <button
            onClick={onThemeChange}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded"
            title="切换主题"
          >
            <ThemeIcon className="w-4 h-4" />
          </button>

          {/* 目录 */}
          <button
            onClick={onShowToc}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded"
            title="目录"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

/**
 * 底部导航栏
 */
function BottomNav({
  prev,
  next,
  currentOrder,
  totalChapters,
}: {
  prev: { id: string; title: string; bookId: string } | null;
  next: { id: string; title: string; bookId: string } | null;
  currentOrder: number;
  totalChapters: number;
}) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800 z-40">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* 上一章 */}
        {prev ? (
          <Link
            to={`/novel/${prev.bookId}/${prev.id}`}
            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline max-w-[80px] truncate">{prev.title}</span>
            <span className="sm:hidden">上一章</span>
          </Link>
        ) : (
          <div className="w-20" />
        )}

        {/* 进度 */}
        <div className="text-xs text-slate-400 dark:text-slate-500">
          {currentOrder} / {totalChapters}
        </div>

        {/* 下一章 */}
        {next ? (
          <Link
            to={`/novel/${next.bookId}/${next.id}`}
            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <span className="hidden sm:inline max-w-[80px] truncate">{next.title}</span>
            <span className="sm:hidden">下一章</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <div className="w-20" />
        )}
      </div>
    </footer>
  );
}

/**
 * 目录浮层
 */
function TocDrawer({
  isOpen,
  onClose,
  bookId,
  chapters,
  currentChapterId,
}: {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  chapters: Array<{ id: string; title: string; order: number }>;
  currentChapterId: string;
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50"
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div className="fixed right-0 top-0 bottom-0 w-72 max-w-[80vw] bg-white dark:bg-slate-800 z-50 shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">目录</span>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="py-2">
          {chapters.map((chapter, index) => (
            <Link
              key={chapter.id}
              to={`/novel/${bookId}/${chapter.id}`}
              onClick={onClose}
              className={`block px-4 py-3 text-sm transition-colors ${
                chapter.id === currentChapterId
                  ? 'text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700/50 border-l-2 border-slate-400 dark:border-slate-500'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/30'
              }`}
            >
              <span className="text-xs text-slate-400 dark:text-slate-500 mr-2">
                {String(index + 1).padStart(2, '0')}
              </span>
              {chapter.title}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * 阅读器页面
 */
function ReaderPage() {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId: string }>();
  const { chapter, loading, error } = useChapterContent(bookId || '', chapterId || '');
  const { chapters } = useNovelChapters(bookId || '');
  const { prev, next } = useAdjacentChapters(bookId || '', chapter?.order || 0);
  const { settings, cycleFontSize, cycleTheme } = useReaderSettings();

  // 目录浮层状态
  const [showToc, setShowToc] = React.useState(false);

  // 获取主题样式
  const themeStyle = THEME_MAP[settings.theme];
  const fontSizeClass = FONT_SIZE_MAP[settings.fontSize];

  if (loading) {
    return (
      <div className={`min-h-screen ${themeStyle.bg} flex items-center justify-center`}>
        <div className="text-slate-400 dark:text-slate-500">加载中...</div>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className={`min-h-screen ${themeStyle.bg} flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400 mb-4">{error?.message || '章节不存在'}</p>
          <Link
            to={`/novel/${bookId}`}
            className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            ← 返回目录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyle.bg} pb-16`}>
      {/* 工具栏 */}
      <ReaderToolbar
        bookId={bookId || ''}
        chapterTitle={chapter.title}
        settings={settings}
        onFontSizeChange={cycleFontSize}
        onThemeChange={cycleTheme}
        onShowToc={() => setShowToc(true)}
      />

      {/* 正文内容 */}
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <article className={`prose prose-slate dark:prose-invert max-w-none ${fontSizeClass} ${themeStyle.text}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // 自定义标题样式
              h1: ({ children }) => (
                <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center border-b border-slate-200 dark:border-slate-700 pb-4">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl sm:text-2xl font-semibold mt-10 sm:mt-12 mb-4 sm:mb-6 first:mt-0">
                  {children}
                </h2>
              ),
              // 段落样式
              p: ({ children }) => (
                <p className="mb-4 sm:mb-6 text-justify hyphens-auto indent-8">
                  {children}
                </p>
              ),
              // 分隔线
              hr: () => (
                <hr className="my-8 sm:my-12 border-slate-200 dark:border-slate-700" />
              ),
              // 强调
              strong: ({ children }) => (
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  {children}
                </strong>
              ),
              // 引用
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 my-6 italic text-slate-600 dark:text-slate-400">
                  {children}
                </blockquote>
              ),
              // 斜体
              em: ({ children }) => (
                <em className="italic text-slate-500 dark:text-slate-400">{children}</em>
              ),
            }}
          >
            {chapter.content}
          </ReactMarkdown>

          {/* 打赏二维码 */}
          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              如果觉得写得不错，欢迎打赏支持
            </p>
            <img
              src="/resources/images/20260226/21f3e17dd9c8fff2b516bd5fc5a8834b.png"
              alt="打赏二维码"
              className="w-48 h-48 mx-auto rounded-lg shadow-md"
            />
          </div>
        </article>
      </main>

      {/* 底部导航 */}
      <BottomNav
        prev={prev}
        next={next}
        currentOrder={chapter.order}
        totalChapters={chapters.length || chapter.order}
      />

      {/* 目录浮层 */}
      <TocDrawer
        isOpen={showToc}
        onClose={() => setShowToc(false)}
        bookId={bookId || ''}
        chapters={chapters}
        currentChapterId={chapterId || ''}
      />
    </div>
  );
}

export default ReaderPage;
