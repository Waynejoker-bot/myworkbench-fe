import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Book, Clock, FileText, Tag } from 'lucide-react';
import { useNovelDetail } from '@/hooks/useNovel';

/**
 * 小说详情页（章节目录）
 */
function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const { novel, loading, error } = useNovelDetail(bookId || '');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-slate-50 to-emerald-50/30 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-slate-400 dark:text-slate-500">加载中...</div>
      </div>
    );
  }

  if (error || !novel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-slate-50 to-emerald-50/30 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400 mb-4">{error?.message || '小说不存在'}</p>
          <Link to="/" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            ← 返回首页
          </Link>
        </div>
      </div>
    );
  }

  const firstChapter = novel.chapters[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-slate-50 to-emerald-50/30 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* 返回按钮 */}
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          首页
        </Link>

        {/* 书籍信息卡片 */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden mb-8">
          <div className="flex flex-col sm:flex-row">
            {/* 封面 */}
            <div className="w-32 sm:w-40 flex-shrink-0 mx-auto sm:mx-0 mt-6 sm:mt-0">
              <div className="aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-lg overflow-hidden shadow-sm">
                {novel.cover ? (
                  <img
                    src={novel.cover}
                    alt={novel.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Book className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                  </div>
                )}
              </div>
            </div>

            {/* 信息 */}
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100">
                  {novel.title}
                </h1>
                {novel.status === 'ongoing' ? (
                  <span className="px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                    连载中
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full">
                    已完结
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {novel.author}
              </p>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {novel.description}
              </p>

              {/* 统计 */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {novel.chapterCount} 章
                </span>
                {novel.wordCount && (
                  <span>
                    {novel.wordCount >= 10000
                      ? `${(novel.wordCount / 10000).toFixed(1)} 万字`
                      : `${novel.wordCount} 字`}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  更新于 {novel.updatedAt}
                </span>
              </div>

              {/* 标签 */}
              {novel.tags && novel.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-4">
                  <Tag className="w-3.5 h-3.5 text-slate-300 dark:text-slate-500" />
                  <div className="flex flex-wrap gap-1.5">
                    {novel.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 章节目录 */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50">
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Book className="w-4 h-4" />
              目录
            </h2>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {novel.chapters.map((chapter, index) => (
              <Link
                key={chapter.id}
                to={`/novel/${bookId}/${chapter.id}`}
                className="flex items-center justify-between px-6 py-3.5
                           hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 dark:text-slate-600 w-6">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                    {chapter.title}
                  </span>
                </div>
                <span className="text-xs text-slate-300 dark:text-slate-600">
                  {chapter.createdAt}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* 开始阅读按钮（移动端） */}
        {firstChapter && (
          <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800">
            <Link
              to={`/novel/${bookId}/${firstChapter.id}`}
              className="block w-full py-3 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 text-center rounded-xl font-medium"
            >
              开始阅读
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookDetailPage;
